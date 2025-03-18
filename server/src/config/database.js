const { Sequelize } = require('sequelize');
require('dotenv').config();

// 从环境变量中获取数据库配置
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;

// 创建Sequelize实例
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true, // 默认为模型添加createdAt和updatedAt字段
    underscored: true, // 使用下划线命名法
  }
});

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
};

// MongoDB连接
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// 设置MongoDB连接选项
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 增加服务器选择超时
  socketTimeoutMS: 45000, // 增加套接字超时
  connectTimeoutMS: 30000, // 增加连接超时
  heartbeatFrequencyMS: 10000, // 增加心跳频率
  retryWrites: true,
  // 如果使用副本集或分片集群，可以启用这个选项
  // autoReconnect: true,
};

// 连接到MongoDB
const connectMongoDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      logger.warn('未找到MongoDB连接URI，跳过MongoDB连接');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    logger.info('MongoDB连接成功');
  } catch (error) {
    logger.error('MongoDB连接失败', error);
    // 不要因为MongoDB连接失败而中断服务
    // 在生产环境中可能需要重试连接或发送警报
  }
};

// 在应用启动时连接MongoDB
connectMongoDB();

// 导出连接测试函数
module.exports = {
  sequelize,
  testConnection
}; 