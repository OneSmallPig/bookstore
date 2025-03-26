const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

// 测试路由 - 检查前端请求是否能够到达
router.get('/test', (req, res) => {
  console.log('收到测试请求', req.query);
  res.json({
    success: true,
    message: '测试API可以正常访问',
    query: req.query,
    timestamp: new Date().toISOString()
  });
});

// 为AI搜索进度查询添加特定的频率限制
const searchProgressLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟窗口
  max: 40, // 每个IP每分钟最多20次请求
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 使用会话ID + IP作为限制键，这样每个搜索会话有独立的限制计数
    return req.params.sessionId ? `${req.params.sessionId}_${req.ip}` : req.ip;
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
    });
  }
});

// 公共API - 不需要登录也可以访问
router.get('/recommended', aiController.getRecommendedBooks);
router.get('/popular', aiController.getPopularBooks);
router.get('/popular-searches', aiController.getPopularSearches);
// 添加AI智能搜索接口
router.post('/search', aiController.searchBooks);
// 添加AI思考过程接口 - 使用进度频率限制
router.get('/search-progress/:sessionId', searchProgressLimiter, aiController.getSearchProgress);

// 个性化推荐API - 需要登录
router.get('/personal-recommendations', authenticate, aiController.getRecommendedBooks);

module.exports = router; 