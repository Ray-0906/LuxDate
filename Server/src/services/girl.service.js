import GirlProfile from '../models/Girl.js';
import uploadService from './upload.service.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination } from '../utils/helpers.js';

/**
 * Girl service — all business logic for girl profile and video management.
 * Used primarily by admin panel.
 */
const girlService = {
  async create({ name, age, bio, location, language, charmLevel, profilePhotoBuffer, firstMessages, adminId }) {
    let photoUrl = 'https://via.placeholder.com/400x400?text=No+Photo';

    if (profilePhotoBuffer) {
      const photo = await uploadService.uploadGirlPhoto(profilePhotoBuffer, 'new');
      photoUrl = photo.url;
    }

    const girl = await GirlProfile.create({
      name,
      age,
      bio: bio || '',
      location: location || '',
      language: language || 'English',
      charmLevel: charmLevel || 'Rising',
      photos: [photoUrl],
      firstMessages: firstMessages || [],
      createdBy: adminId,
    });

    return girl;
  },

  async getById(girlId) {
    const girl = await GirlProfile.findById(girlId).lean();
    if (!girl) throw new NotFoundError('Girl profile not found');

    return girl;
  },

  async update(girlId, updates) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');

    const allowedFields = [
      'name', 'age', 'bio', 'location', 'language', 'charmLevel',
      'distanceKm', 'isActive', 'firstMessages',
    ];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        girl[field] = updates[field];
      }
    }

    await girl.save();
    return girl;
  },

  async updateProfilePhoto(girlId, buffer) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');

    const photo = await uploadService.uploadGirlPhoto(buffer, girlId);

    // Replace first photo or add
    if (girl.photos.length > 0) {
      girl.photos[0] = photo.url;
    } else {
      girl.photos.push(photo.url);
    }

    await girl.save();
    return girl;
  },

  async addPhotos(girlId, buffers) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');

    const uploadPromises = buffers.map((buf) =>
      uploadService.uploadGirlPhoto(buf, girlId)
    );
    const photos = await Promise.all(uploadPromises);
    const urls = photos.map((p) => p.url);

    girl.photos.push(...urls);
    await girl.save();

    return { photos: urls, girl };
  },

  async delete(girlId) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');

    await GirlProfile.findByIdAndDelete(girlId);

    return { deleted: true };
  },

  async list(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {};

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }
    if (query.charmLevel) {
      filter.charmLevel = query.charmLevel;
    }

    const [girls, total] = await Promise.all([
      GirlProfile.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GirlProfile.countDocuments(filter),
    ]);

    return { girls, total, page, limit };
  },

  // ─── Video Management ──────────────────────────────────

  async uploadVideo(girlId, { buffer, title, adminId }) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');

    const result = await uploadService.uploadVideo(buffer, {
      folder: `luxdate/girls/${girlId}/videos`,
    });

    girl.videoUrl = result.url;
    await girl.save();

    return { videoUrl: result.url };
  },

  async listVideos(girlId, query = {}) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');

    const videos = girl.videoUrl ? [{
      _id: girlId, // Mock ID since there's only one video directly on the profile
      videoUrl: girl.videoUrl,
      isActive: girl.isActive,
      title: 'Profile Video'
    }] : [];

    return { videos, total: videos.length, page: 1, limit: 10 };
  },

  async deleteVideo(girlId) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');

    if (girl.videoUrl) {
      try {
        const publicId = girl.videoUrl.split('/').slice(-2).join('/').split('.')[0];
        await uploadService.deleteFile(publicId, 'video');
      } catch { /* Log but don't fail */ }
      
      girl.videoUrl = '';
      await girl.save();
    }
    return { deleted: true };
  },

  async toggleVideoStatus(girlId) {
    const girl = await GirlProfile.findById(girlId);
    if (!girl) throw new NotFoundError('Girl profile not found');
    
    // Toggle active status for the whole profile instead, or do nothing
    girl.isActive = !girl.isActive;
    await girl.save();
    return { isActive: girl.isActive };
  },

  // ─── Admin Gift Management (delegated) ──────────────
  async listAllGifts() {
    const Gift = (await import('../models/Gift.js')).default;
    return Gift.find({}).sort({ level: 1, coinCost: 1 }).lean();
  },

  async createGift(data) {
    const Gift = (await import('../models/Gift.js')).default;
    return Gift.create(data);
  },

  async updateGift(giftId, updates) {
    const Gift = (await import('../models/Gift.js')).default;
    const gift = await Gift.findByIdAndUpdate(giftId, updates, { new: true });
    if (!gift) throw new NotFoundError('Gift not found');
    return gift;
  },

  async deleteGift(giftId) {
    const Gift = (await import('../models/Gift.js')).default;
    const gift = await Gift.findByIdAndDelete(giftId);
    if (!gift) throw new NotFoundError('Gift not found');
    return { deleted: true };
  },

  async getGiftStats(query = {}) {
    const GiftTransaction = (await import('../models/GiftLog.js')).default;
    const { page, limit, skip } = parsePagination(query);
    const [logs, total] = await Promise.all([
      GiftTransaction.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('fromUserId', 'name')
        .populate('toGirlProfileId', 'name')
        .populate('giftId', 'name coinCost')
        .lean(),
      GiftTransaction.countDocuments({}),
    ]);
    return { logs, total, page, limit };
  },
};

export default girlService;
