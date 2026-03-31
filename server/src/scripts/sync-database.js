const { sequelize } = require('../config/database');
const BookSourceMySQL = require('../models/bookSource/BookSourceMySQL');
const ReadingRecordMySQL = require('../models/ReadingRecordMySQL');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * 数据库同步脚本
 * 用于创建和更新MySQL数据库表结构
 */
async function syncDatabase() {
  const syncAlter = config.database.syncAlter;

  try {
    logger.info('开始同步数据库表结构...');

    if (!syncAlter) {
      logger.info('DB_SYNC_ALTER=false，跳过启动时的书源表结构变更');
      return true;
    }

    // 同步书源表
    logger.info('正在同步书源表(book_sources)...');
    await BookSourceMySQL.sync({ alter: true });
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
    return true;
  } catch (error) {
    logger.error('数据库同步失败:', error);
    return false;
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
