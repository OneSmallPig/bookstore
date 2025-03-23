const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const BookSourceController = require('../../controllers/bookSource/BookSourceController');
// 添加模型连接器
const models = require('../../models/ModelConnector');

// 获取所有书源
router.get('/sources', BookSourceController.getAllSources);

// 获取指定分组的书源
router.get('/sources/group/:group', BookSourceController.getSourcesByGroup);

// 获取指定名称的书源
router.get('/sources/:name', BookSourceController.getSourceByName);

// 测试单个书源
router.post('/test', BookSourceController.testBookSource);

// 批量测试书源
router.post('/batch-test', BookSourceController.batchTestBookSources);

// 获取批量测试进度
router.get('/batch-test/:taskId', BookSourceController.getBatchTestProgress);

// 以下操作需要认证
router.use(authenticate);

// 添加或更新书源
router.post('/sources', BookSourceController.addOrUpdateSource);

// 导入书源
router.post('/import', BookSourceController.importSources);

// 导出书源
router.get('/export', BookSourceController.exportSources);

// 删除书源
router.delete('/sources/:name', BookSourceController.deleteSource);

// 设置书源启用状态
router.patch('/sources/:name/status', BookSourceController.setSourceStatus);

module.exports = router; 