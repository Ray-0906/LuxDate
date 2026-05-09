import uploadService from '../services/upload.service.js';
import ApiResponse from '../utils/response.js';

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file provided');
    const result = await uploadService.uploadImage(req.file.buffer); 
    return ApiResponse.success(res, { data: { url: result.url }, message: 'Image uploaded successfully' });
  } catch (e) {
    next(e);
  }
};
