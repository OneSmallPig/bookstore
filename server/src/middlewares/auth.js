/**
 * 认证中间件
 */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT密钥，生产环境应从环境变量或配置文件中获取
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * 验证用户是否已认证
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const authenticate = (req, res, next) => {
  // 开发环境直接通过认证
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    logger.warn('开发环境跳过认证，请勿在生产环境使用此选项');
    req.user = { id: 1, username: 'admin', role: 'admin' };
    return next();
  }

  try {
    // 从请求头获取认证令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('认证失败: 缺少令牌');
      return res.status(401).json({ 
        success: false,
        message: '请先登录' 
      });
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('认证失败: 无效的令牌', err);
        return res.status(401).json({ 
          success: false,
          message: '登录已过期，请重新登录' 
        });
      }
      
      // 将解码后的用户信息添加到请求对象
      req.user = decoded;
      next();
    });
  } catch (error) {
    logger.error('认证处理过程中发生错误', error);
    return res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
};

/**
 * 验证用户是否为管理员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn(`用户 ${req.user?.username || '未知'} 尝试访问管理员资源`);
    return res.status(403).json({ 
      success: false,
      message: '需要管理员权限' 
    });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin
}; 