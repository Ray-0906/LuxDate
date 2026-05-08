import multer from 'multer';
import { UPLOAD_LIMITS } from '../utils/constants.js';
import { ValidationError } from '../utils/errors.js';

/**
 * In-memory multer storage — files are buffered before uploading to cloud.
 */
const storage = multer.memoryStorage();

/**
 * File filter for images.
 */
const imageFilter = (req, file, cb) => {
  if (UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

/**
 * File filter for videos.
 */
const videoFilter = (req, file, cb) => {
  if (UPLOAD_LIMITS.ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only MP4 and WebM videos are allowed'), false);
  }
};

/**
 * Upload middleware for single image.
 */
export const uploadSingleImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: UPLOAD_LIMITS.IMAGE_MAX_SIZE },
}).single('image');

/**
 * Upload middleware for multiple images (max 10).
 */
export const uploadMultipleImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: UPLOAD_LIMITS.IMAGE_MAX_SIZE },
}).array('images', 10);

/**
 * Upload middleware for single video.
 */
export const uploadSingleVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: UPLOAD_LIMITS.VIDEO_MAX_SIZE },
}).single('video');

/**
 * Upload middleware for profile photo.
 */
export const uploadProfilePhoto = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: UPLOAD_LIMITS.IMAGE_MAX_SIZE },
}).single('profilePhoto');
