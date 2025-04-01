const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// 所有用户路由都需要认证
router.use(authenticate);

// 获取用户个人资料
router.get('/profile', userController.getProfile);

// 更新用户个人资料
router.put('/profile', userController.updateProfile);

// 修改密码
router.put('/change-password', userController.changePassword);

// 获取用户书架
router.get('/bookshelf', userController.getBookshelf);

// 获取当前用户书架
router.get('/me/bookshelf', userController.getCurrentUserBookshelf);

module.exports = router;

 