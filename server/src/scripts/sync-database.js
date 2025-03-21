const { sequelize } = require('../config/database');
const BookSourceMySQL = require('../models/bookSource/BookSourceMySQL');
const ReadingRecordMySQL = require('../models/ReadingRecordMySQL');
const logger = require('../utils/logger');

/**
 * 数据库同步脚本
 * 用于创建和更新MySQL数据库表结构
 */
async function syncDatabase() {
  try {
    logger.info('开始同步数据库表结构...');
    
    // 同步书源表
    logger.info('正在同步书源表(book_sources)...');
    await BookSourceMySQL.sync({ alter: true }); // 使用alter:true确保更新表结构
    logger.info('book_sources表同步完成');
    
    // 同步阅读记录表
    logger.info('正在同步阅读记录表(reading_records)...');
    await ReadingRecordMySQL.sync({ alter: true });
    logger.info('reading_records表同步完成');
    
    // 检查表是否存在
    try {
      await sequelize.query("SHOW TABLES LIKE 'book_sources'");
      logger.info('已确认book_sources表存在');
    } catch (err) {
      logger.error('book_sources表检查失败:', err);
    }
    
    logger.info('数据库表结构同步完成');
  } catch (error) {
    logger.error('数据库同步失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行同步
if (require.main === module) {
  syncDatabase().then(() => {
    logger.info('数据库同步脚本执行完成');
    process.exit(0);
  });
} else {
  // 作为模块导出
  module.exports = syncDatabase;
} 