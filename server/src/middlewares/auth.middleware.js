const { verifyToken } = require('../utils/jwt');
const User = require('../models/user.model');

/**
 * 验证用户是否已认证
 */
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 开发环境下的测试token
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {
      console.log('开发环境使用测试token');
      // 为测试token创建一个测试用户
      req.user = {
        id: 1,
        username: 'test-user',
        email: 'test@example.com',
        role: 'user',
        isActive: true
      };
      next();
      return;
    }
    
    // 验证令牌
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: '无效的认证令牌' });
    }

    // 查找用户
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: '用户账号已被禁用' });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: '认证过程中发生错误' });
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
  isAdmin
}; 