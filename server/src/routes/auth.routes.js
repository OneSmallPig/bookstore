const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// 注册新用户
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 获取当前用户信息（需要认证）
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router; 