const express = require('express');
const router = express.Router();
const bookSourceController = require('../controllers/bookSource/BookSourceController');
const authMiddleware = require('../middlewares/auth');

// 公共API
router.get('/search', bookSourceController.searchBooks);
router.get('/book/detail', bookSourceController.getBookDetail);
router.get('/book/chapters', bookSourceController.getChapterList);
router.get('/book/content', bookSourceController.getChapterContent);

// 需要认证的API
router.use(authMiddleware);

// 书源管理
router.get('/sources', bookSourceController.getAllSources);
router.get('/sources/groups', bookSourceController.getSourceGroups);
router.get('/sources/group/:group', bookSourceController.getSourcesByGroup);
router.get('/sources/:name', bookSourceController.getSourceByName);
router.post('/sources', bookSourceController.addOrUpdateSource);
router.delete('/sources/:name', bookSourceController.deleteSource);
router.put('/sources/:name/enabled', bookSourceController.setSourceEnabled);
router.post('/sources/import', bookSourceController.importSources);
router.post('/sources/export', bookSourceController.exportSources);
router.post('/sources/test', bookSourceController.testBookSource);

module.exports = router; 