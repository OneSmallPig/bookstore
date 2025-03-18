const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// 导入配置
const { testConnection } = require('./config/database');
const logger = require('./config/logger');

// 导入路由
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const bookRoutes = require('./routes/book.routes');
const bookSourceRoutes = require('./routes/bookSource');
const aiRoutes = require('./routes/ai');

// 创建Express应用
const app = express();

// 测试数据库连接
testConnection();

// 中间件
app.use(helmet({
  contentSecurityPolicy: false, // 在开发阶段禁用CSP
  crossOriginEmbedderPolicy: false,
})); // 安全HTTP头
app.use(cors({
  origin: '*', // 开发阶段允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
})); // 跨域资源共享
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体
app.use(morgan('combined')); // HTTP请求日志

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP在windowMs内最多100个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: '请求过于频繁，请稍后再试'
});
app.use(limiter);

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/booksource', bookSourceRoutes);
app.use('/api/ai', aiRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: '未找到请求的资源' });
});

// 错误处理
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// 初始化书源管理器
const bookSourceManager = require('./services/bookSource/BookSourceManager');
bookSourceManager.initialize().catch(err => {
  logger.error('初始化书源管理器失败', err);
  // 即使书源管理器初始化失败，应用也会继续运行
  if (process.env.ALLOW_MONGODB_FAILOVER !== 'true') {
    // 如果没有配置允许MongoDB故障转移，则输出更详细的错误日志
    logger.error(`如果这是MongoDB连接问题，您可以在.env文件中设置ALLOW_MONGODB_FAILOVER=true以允许应用在MongoDB不可用时仍能运行`);
  }
});

// 捕获未处理的异常，避免应用崩溃
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  // 生产环境中可能需要在这里执行优雅关闭或通知管理员
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`服务器运行在端口 ${PORT}`);
});

module.exports = app; 