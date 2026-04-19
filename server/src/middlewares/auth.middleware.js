const { verifyToken } = require('../utils/jwt');
const config = require('../config/config');
const User = require('../models/user.model');
const logger = require('../utils/logger');

function buildDevUser(role = 'admin') {
  return {
    id: 1,
    username: role === 'admin' ? 'dev-admin' : 'test-user',
    email: 'test@example.com',
    role,
    isActive: true
  };
}

async function resolveUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  const user = await User.findByPk(decoded.id);
  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

/**
 * 验证用户是否已认证
 */
const authenticate = async (req, res, next) => {
  try {
    if (config.isDev && config.auth.skip) {
      logger.warn('开发环境跳过认证，请勿在生产环境启用 SKIP_AUTH');
      req.user = buildDevUser();
      return next();
    }

    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 开发环境下的测试token
    if (config.isDev && token === config.auth.testToken) {
      logger.warn('开发环境使用测试令牌');
      req.user = buildDevUser('user');
      return next();
    }

    const user = await resolveUserFromToken(token);
    if (!user) {
      return res.status(401).json({ message: '无效的认证令牌' });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    return next();
  } catch (error) {
    logger.error('认证过程中发生错误', error);
    return res.status(500).json({ message: '认证过程中发生错误' });
  }
};

/**
 * 可选认证
 * 允许匿名访问，在令牌有效时补充用户信息
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    if (config.isDev && config.auth.skip) {
      req.user = buildDevUser();
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      req.user = null;
      return next();
    }

    if (config.isDev && token === config.auth.testToken) {
      req.user = buildDevUser('user');
      return next();
    }

    req.user = await resolveUserFromToken(token);
    return next();
  } catch (error) {
    logger.warn('可选认证失败，按匿名用户处理', error);
    req.user = null;
    return next();
  }
};

/**
 * 验证用户是否为管理员
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  isAdmin
};
