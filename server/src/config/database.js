const { Sequelize } = require('sequelize');
// 注释掉mongoose，暂时不使用MongoDB
// const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./config');

// 创建Sequelize实例
const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: config.database.logging ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    }
  }
);

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL数据库连接成功');
  } catch (error) {
    logger.error('MySQL数据库连接失败:', error);
  }
};

// 连接到MongoDB (暂时禁用)
const connectMongoDB = async () => {
  // 暂时禁用MongoDB连接，所有数据存储到MySQL
  logger.info('MongoDB连接已禁用，所有数据将存储在MySQL中');
  return true;
  
  /*
  try {
    if (!config.mongodb.uri) {
      logger.warn('未找到MongoDB连接URI，跳过MongoDB连接');
      return;
    }
    
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('MongoDB连接成功');
  } catch (error) {
    logger.error('MongoDB连接失败', error);
    
    // 如果允许MongoDB连接失败，继续运行
    if (config.mongodb.allowFailover) {
      logger.warn('MongoDB连接失败，但允许应用继续运行');
    } else {
      throw error; // 如果不允许失败，则抛出错误中断应用启动
    }
  }
  */
};

// 在应用启动时连接MongoDB (已禁用)
// connectMongoDB();

// 导出
module.exports = {
  sequelize,
  testConnection,
  connectMongoDB
}; 