import userService from '../services/user.service.js';
import uploadService from '../services/upload.service.js';
import ApiResponse from '../utils/response.js';

const userController = {
  async getMe(req, res, next) {
    try {
      const user = await userService.getMe(req.user._id);
      return ApiResponse.success(res, { data: user });
    } catch (e) { next(e); }
  },

  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user._id, req.body);
      return ApiResponse.success(res, { data: user, message: 'Profile updated' });
    } catch (e) { next(e); }
  },

  async uploadPhoto(req, res, next) {
    try {
      let photoUrl = req.body.photoUrl || null;
      if (!photoUrl && req.file?.buffer) {
        const upload = await uploadService.uploadProfilePhoto(req.file.buffer, req.user._id);
        photoUrl = upload.url;
      }
      if (!photoUrl) return ApiResponse.error(res, { message: 'No photo URL', statusCode: 400 });
      const user = await userService.uploadPhoto(req.user._id, photoUrl);
      return ApiResponse.success(res, { data: user, message: 'Photo updated' });
    } catch (e) { next(e); }
  },

  async getWealthLevels(req, res, next) {
    try {
      const levels = await userService.getWealthLevels();
      return ApiResponse.success(res, { data: levels });
    } catch (e) { next(e); }
  },
};

export default userController;
