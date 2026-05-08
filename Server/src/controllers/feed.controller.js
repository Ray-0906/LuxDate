import feedService from '../services/feed.service.js';
import ApiResponse from '../utils/response.js';

const feedController = {
  async getHotFeed(req, res, next) {
    try {
      const result = await feedService.getHotFeed(req.query);
      return ApiResponse.success(res, { data: result.girls, message: 'Hot feed retrieved' });
    } catch (error) {
      next(error);
    }
  },

  async getNearbyFeed(req, res, next) {
    try {
      const result = await feedService.getNearbyFeed(req.query);
      return ApiResponse.success(res, { data: result.girls, message: 'Nearby feed retrieved' });
    } catch (error) {
      next(error);
    }
  },

  async getGirlProfile(req, res, next) {
    try {
      const girl = await feedService.getGirlProfile(req.params.girlId);
      if (!girl) {
        return ApiResponse.error(res, { message: 'Profile not found', statusCode: 404 });
      }
      return ApiResponse.success(res, { data: { girl } });
    } catch (error) {
      next(error);
    }
  },

  async getRandomProfile(req, res, next) {
    try {
      const girl = await feedService.getRandomProfile();
      if (!girl) {
        return ApiResponse.error(res, { message: 'No profiles available', statusCode: 404 });
      }
      return ApiResponse.success(res, { data: { girl } });
    } catch (error) {
      next(error);
    }
  },

  async searchById(req, res, next) {
    try {
      const girls = await feedService.searchById(req.query.id);
      return ApiResponse.success(res, { data: girls });
    } catch (error) {
      next(error);
    }
  },
};

export default feedController;
