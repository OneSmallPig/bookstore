const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middlewares/auth');

// 公共API - 不需要登录也可以访问
router.get('/recommended', aiController.getRecommendedBooks);
router.get('/popular', aiController.getPopularBooks);

// 个性化推荐API - 需要登录
router.get('/personal-recommendations', authenticate, aiController.getRecommendedBooks);

module.exports = router; 