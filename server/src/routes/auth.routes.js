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

// 忘记密码 - 发送重置验证码
router.post('/forgot-password', authController.forgotPassword);

// 验证重置密码验证码
router.post('/verify-reset-code', authController.verifyResetCode);

// 重置密码
router.post('/reset-password', authController.resetPassword);

module.exports = router; 