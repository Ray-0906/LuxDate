import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import logger from '../utils/logger.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

/**
 * Upload service — abstracts file storage behind a common interface.
 * Supports Cloudinary (primary) and can be extended to Firebase Storage.
 * Swap providers without touching any controller or service.
 */
const uploadService = {
  /**
   * Upload an image buffer to Cloudinary.
   * @param {Buffer} buffer - File buffer from multer
   * @param {object} options - { folder, publicId, transformation }
   * @returns {Promise<{url, publicId, width, height}>}
   */
  async uploadImage(buffer, options = {}) {
    const {
      folder = 'luxdate/images',
      publicId,
      transformation = [
        { width: 800, height: 800, crop: 'limit', quality: 'auto', format: 'webp' },
      ],
    } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          transformation,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            logger.error({ err: error }, 'Cloudinary image upload failed');
            return reject(new Error('Image upload failed'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          });
        }
      );
      uploadStream.end(buffer);
    });
  },

  /**
   * Upload a profile photo with optimized dimensions.
   */
  async uploadProfilePhoto(buffer, userId) {
    return this.uploadImage(buffer, {
      folder: 'luxdate/profiles',
      publicId: `profile_${userId}_${Date.now()}`,
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto', format: 'webp' },
      ],
    });
  },

  /**
   * Upload a girl's photo.
   */
  async uploadGirlPhoto(buffer, girlId) {
    return this.uploadImage(buffer, {
      folder: 'luxdate/girls',
      publicId: `girl_${girlId}_${Date.now()}`,
      transformation: [
        { width: 800, height: 1000, crop: 'fill', gravity: 'face', quality: 'auto', format: 'webp' },
      ],
    });
  },

  /**
   * Upload a video to Cloudinary.
   * @param {Buffer} buffer
   * @param {object} options - { folder, publicId }
   * @returns {Promise<{url, publicId, duration, thumbnail}>}
   */
  async uploadVideo(buffer, options = {}) {
    const {
      folder = 'luxdate/videos',
      publicId,
    } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'video',
          eager: [
            { format: 'jpg', transformation: [{ width: 400, height: 400, crop: 'fill' }] },
          ],
        },
        (error, result) => {
          if (error) {
            logger.error({ err: error }, 'Cloudinary video upload failed');
            return reject(new Error('Video upload failed'));
          }

          const thumbnail = result.eager && result.eager[0]
            ? result.eager[0].secure_url
            : '';

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration || 0,
            thumbnail,
          });
        }
      );
      uploadStream.end(buffer);
    });
  },

  /**
   * Upload a gift image/animation.
   */
  async uploadGiftImage(buffer) {
    return this.uploadImage(buffer, {
      folder: 'luxdate/gifts',
      transformation: [
        { width: 300, height: 300, crop: 'fit', quality: 'auto', format: 'webp' },
      ],
    });
  },

  /**
   * Delete a file from Cloudinary by public ID.
   */
  async deleteFile(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      logger.info({ publicId, result: result.result }, 'Cloudinary file deleted');
      return result;
    } catch (error) {
      logger.error({ err: error, publicId }, 'Cloudinary delete failed');
      throw new Error('File deletion failed');
    }
  },
};

export default uploadService;
