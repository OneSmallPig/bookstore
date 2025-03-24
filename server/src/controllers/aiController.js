const aiService = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * AI功能控制器
 */
class AIController {
  /**
   * 获取AI推荐的书籍
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getRecommendedBooks(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const user = req.user; // 如果用户已登录，将使用用户信息

      const books = await aiService.getRecommendedBooks(user, limit);
      
      res.json({
        success: true,
        data: books
      });
    } catch (error) {
      logger.error('获取AI推荐书籍失败', error);
      res.status(500).json({
        success: false,
        message: '获取AI推荐书籍失败',
        error: error.message
      });
    }
  }

  /**
   * 获取热门书籍
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getPopularBooks(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const category = req.query.category || null;
      
      const books = await aiService.getPopularBooks(category, limit);
      
      res.json({
        success: true,
        data: books
      });
    } catch (error) {
      logger.error('获取热门书籍失败', error);
      res.status(500).json({
        success: false,
        message: '获取热门书籍失败',
        error: error.message
      });
    }
  }

  /**
   * 获取热门搜索
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getPopularSearches(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 3; // 默认获取3本
      
      const books = await aiService.getPopularSearches(limit);
      
      res.json({
        success: true,
        data: books
      });
    } catch (error) {
      logger.error('获取热门搜索失败', error);
      res.status(500).json({
        success: false,
        message: '获取热门搜索失败',
        error: error.message
      });
    }
  }
}

module.exports = new AIController(); 