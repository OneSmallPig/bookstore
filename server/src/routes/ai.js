const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middlewares/auth');

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

// 公共API - 不需要登录也可以访问
router.get('/recommended', aiController.getRecommendedBooks);
router.get('/popular', aiController.getPopularBooks);
router.get('/popular-searches', aiController.getPopularSearches);

// 个性化推荐API - 需要登录
router.get('/personal-recommendations', authenticate, aiController.getRecommendedBooks);

module.exports = router; 