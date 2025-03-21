const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const models = require('../models/ModelConnector');

// 获取所有书籍（公开）
router.get('/', bookController.getAllBooks);

// 获取书籍详情（公开）
router.get('/:id', bookController.getBookById);

// 以下路由需要认证
router.use(authenticate);

// 添加书籍到书架
router.post('/:bookId/bookshelf', bookController.addToBookshelf);

// 从书架移除书籍
router.delete('/:bookId/bookshelf', bookController.removeFromBookshelf);

// 更新阅读进度
router.put('/:bookId/reading-progress', bookController.updateReadingProgress);

module.exports = router; 