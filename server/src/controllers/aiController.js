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

  /**
   * AI智能搜索书籍
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async searchBooks(req, res) {
    try {
      const { query, limit = 3 } = req.body;
      
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '搜索关键词不能为空'
        });
      }
      
      // 创建搜索会话，立即返回会话ID
      const sessionId = await aiService.createSearchSession(query);
      
      // 启动异步搜索处理
      aiService.processSearchQuery(sessionId, query, parseInt(limit)).catch(error => {
        logger.error(`处理搜索查询失败 [会话ID: ${sessionId}]`, error);
      });
      
      // 返回会话ID，前端可以通过会话ID轮询结果
      res.json({
        success: true,
        message: 'AI搜索请求已提交',
        sessionId,
        query
      });
    } catch (error) {
      logger.error('AI搜索书籍失败', error);
      res.status(500).json({
        success: false,
        message: 'AI搜索书籍失败',
        error: error.message
      });
    }
  }

  /**
   * 获取AI搜索进度
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getSearchProgress(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: '会话ID不能为空'
        });
      }
      
      // 获取搜索进度和结果
      const result = await aiService.getSearchProgress(sessionId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: '未找到搜索会话或会话已过期'
        });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('获取AI搜索进度失败', error);
      res.status(500).json({
        success: false,
        message: '获取AI搜索进度失败',
        error: error.message
      });
    }
  }
}

module.exports = new AIController(); 