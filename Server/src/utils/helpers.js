/**
 * General-purpose helper functions.
 */

/**
 * Wraps an async route handler to catch errors and forward to Express error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Parse pagination params from query string with safe defaults.
 */
export const parsePagination = (query, defaults = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit, 10) || defaults.limit || 20)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Pick only specified keys from an object.
 */
export const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});

/**
 * Omit specified keys from an object.
 */
export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

/**
 * Generate a random numeric OTP of given length.
 */
export const generateOtp = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};
