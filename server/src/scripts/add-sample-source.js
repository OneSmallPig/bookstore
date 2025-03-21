const { sequelize } = require('../config/database');
const BookSourceMySQL = require('../models/bookSource/BookSourceMySQL');
const logger = require('../utils/logger');

/**
 * 直接添加样例书源到数据库
 */
async function addSampleSource() {
  try {
    logger.info('开始添加样例书源...');
    
    // 创建样例书源对象
    const sampleSource = {
      name: '样例书源',
      url: 'https://example.com/books',
      group: '测试分组',
      icon: 'https://example.com/icon.png',
      enabled: true,
      
      // 搜索规则
      searchUrl: 'https://example.com/search?q={keyword}',
      searchList: '.book-list .book-item',
      searchName: '.book-title',
      searchAuthor: '.book-author',
      searchDetail: '.book-link',
      
      // 详情页规则
      detailName: '.book-detail-title',
      detailAuthor: '.book-detail-author',
      detailCover: '.book-cover img',
      detailIntro: '.book-intro',
      detailChapterUrl: '.chapter-list-link',
      
      // 章节列表规则
      chapterList: '.chapter-list li',
      chapterName: '.chapter-name',
      chapterLink: '.chapter-link',
      
      // 内容规则
      contentRule: '.chapter-content',
      contentFilter: JSON.stringify(['.ad', '.comment']),
      
      // 额外设置
      charset: 'utf-8',
      enableJs: false,
      loadImages: false,
      timeout: 15000,
      retry: 3
    };
    
    // 直接保存到数据库
    const [source, created] = await BookSourceMySQL.upsert(sampleSource, {
      returning: true
    });
    
    if (created) {
      logger.info('样例书源创建成功!');
    } else {
      logger.info('样例书源更新成功!');
    }
    
    // 查看是否保存成功
    const sources = await BookSourceMySQL.findAll();
    logger.info(`当前数据库中有 ${sources.length} 个书源`);
    
    // 列出所有书源
    for (const source of sources) {
      logger.info(`- ${source.name} (${source.enabled ? '启用' : '禁用'})`);
    }
    
  } catch (error) {
    logger.error('添加样例书源失败:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

// 执行函数
if (require.main === module) {
  addSampleSource().then(() => {
    logger.info('添加样例书源完成');
    process.exit(0);
  });
} 