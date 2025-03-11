const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const logger = require('../config/logger');

/**
 * 用户注册
 */
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证请求数据
    if (!username || !email || !password) {
      return res.status(400).json({ message: '用户名、邮箱和密码都是必填项' });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ message: '用户名已被使用' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: '邮箱已被注册' });
    }

    // 创建新用户
    const newUser = await User.create({
      username,
      email,
      password,
      lastLogin: new Date()
    });

    // 生成JWT令牌
    const token = generateToken({ id: newUser.id, role: newUser.role });

    // 返回用户信息和令牌
    return res.status(201).json({
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role,
        createdAt: newUser.createdAt
      },
      token
    });
  } catch (error) {
    logger.error(`注册失败: ${error.message}`);
    return res.status(500).json({ message: '注册过程中发生错误' });
  }
};

/**
 * 用户登录
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证请求数据
    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码都是必填项' });
    }

    // 查找用户
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }

    // 验证密码
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }

    // 检查用户状态
    if (!user.isActive) {
      return res.status(403).json({ message: '账号已被禁用' });
    }

    // 更新最后登录时间
    await user.update({ lastLogin: new Date() });

    // 生成JWT令牌
    const token = generateToken({ id: user.id, role: user.role });

    // 返回用户信息和令牌
    return res.status(200).json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    logger.error(`登录失败: ${error.message}`);
    return res.status(500).json({ message: '登录过程中发生错误' });
  }
};

/**
 * 获取当前用户信息
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error(`获取用户信息失败: ${error.message}`);
    return res.status(500).json({ message: '获取用户信息过程中发生错误' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
}; 