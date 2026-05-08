import girlService from '../../services/girl.service.js';
import ApiResponse from '../../utils/response.js';

/**
 * Admin girl controller — manages girl profiles and videos.
 */
const adminGirlController = {
  async create(req, res, next) {
    try {
      const girl = await girlService.create({
        ...req.body,
        profilePhotoBuffer: req.file?.buffer,
        adminId: req.admin._id,
      });
      return ApiResponse.created(res, { data: { girl }, message: 'Girl profile created' });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const girl = await girlService.getById(req.params.girlId);
      return ApiResponse.success(res, { data: { girl } });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const girl = await girlService.update(req.params.girlId, req.body);
      return ApiResponse.success(res, { data: { girl }, message: 'Girl updated' });
    } catch (error) {
      next(error);
    }
  },

  async updatePhoto(req, res, next) {
    try {
      const girl = await girlService.updateProfilePhoto(req.params.girlId, req.file?.buffer);
      return ApiResponse.success(res, { data: { girl }, message: 'Photo updated' });
    } catch (error) {
      next(error);
    }
  },

  async addPhotos(req, res, next) {
    try {
      const buffers = req.files?.map((f) => f.buffer) || [];
      const result = await girlService.addPhotos(req.params.girlId, buffers);
      return ApiResponse.success(res, { data: result, message: 'Photos added' });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await girlService.delete(req.params.girlId);
      return ApiResponse.success(res, { message: 'Girl profile deleted' });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const result = await girlService.list(req.query);
      return ApiResponse.paginated(res, {
        data: result.girls,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (error) {
      // console.error('Error listing girls:', error);
      next(error);
    }
  },

  // ─── Video Management ────────────────────────────────

  async uploadVideo(req, res, next) {
    try {
      const video = await girlService.uploadVideo(req.params.girlId, {
        buffer: req.file?.buffer,
        title: req.body.title,
        usedForCalls: req.body.usedForCalls,
        usedForLive: req.body.usedForLive,
        adminId: req.admin._id,
      });
      return ApiResponse.created(res, { data: { video }, message: 'Video uploaded' });
    } catch (error) {
      next(error);
    }
  },

  async listVideos(req, res, next) {
    try {
      const result = await girlService.listVideos(req.params.girlId, req.query);
      return ApiResponse.paginated(res, result);
    } catch (error) {
      next(error);
    }
  },

  async deleteVideo(req, res, next) {
    try {
      await girlService.deleteVideo(req.params.videoId);
      return ApiResponse.success(res, { message: 'Video deleted' });
    } catch (error) {
      next(error);
    }
  },

  async toggleVideoStatus(req, res, next) {
    try {
      const video = await girlService.toggleVideoStatus(req.params.videoId);
      return ApiResponse.success(res, { data: { video }, message: 'Video status toggled' });
    } catch (error) {
      next(error);
    }
  },
};

export default adminGirlController;
