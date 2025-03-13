const User = require('../models/user.model');
const { generateToken, verifyToken } = require('../utils/jwt');
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

/**
 * 忘记密码 - 发送重置验证码
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 验证请求数据
    if (!email) {
      return res.status(400).json({ message: '邮箱是必填项' });
    }

    // 查找用户
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // 出于安全考虑，即使用户不存在也返回成功
      return res.status(200).json({ message: '验证码已发送到您的邮箱' });
    }

    // 生成6位随机验证码
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 设置验证码过期时间（15分钟）
    const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    
    // 保存验证码到用户记录
    await user.update({
      resetCode,
      resetCodeExpires
    });

    // TODO: 发送验证码到用户邮箱
    // 这里应该集成邮件发送服务
    logger.info(`重置密码验证码 ${resetCode} 已生成，应发送到 ${email}`);

    return res.status(200).json({ message: '验证码已发送到您的邮箱' });
  } catch (error) {
    logger.error(`发送重置验证码失败: ${error.message}`);
    return res.status(500).json({ message: '发送验证码过程中发生错误' });
  }
};

/**
 * 验证重置密码验证码
 */
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // 验证请求数据
    if (!email || !code) {
      return res.status(400).json({ message: '邮箱和验证码都是必填项' });
    }

    // 查找用户
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: '验证码无效或已过期' });
    }

    // 验证验证码
    if (user.resetCode !== code) {
      return res.status(400).json({ message: '验证码无效或已过期' });
    }

    // 验证验证码是否过期
    if (!user.resetCodeExpires || new Date() > user.resetCodeExpires) {
      return res.status(400).json({ message: '验证码无效或已过期' });
    }

    // 生成重置令牌
    const token = generateToken({ id: user.id, purpose: 'reset-password' }, '15m');

    return res.status(200).json({ 
      message: '验证码验证成功',
      token
    });
  } catch (error) {
    logger.error(`验证重置验证码失败: ${error.message}`);
    return res.status(500).json({ message: '验证验证码过程中发生错误' });
  }
};

/**
 * 重置密码
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // 验证请求数据
    if (!token || !password) {
      return res.status(400).json({ message: '令牌和新密码都是必填项' });
    }

    // 验证令牌
    const decoded = verifyToken(token);
    if (!decoded || decoded.purpose !== 'reset-password') {
      return res.status(400).json({ message: '无效的重置令牌' });
    }

    // 查找用户
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(400).json({ message: '用户不存在' });
    }

    // 更新密码
    await user.update({
      password,
      resetCode: null,
      resetCodeExpires: null
    });

    return res.status(200).json({ message: '密码重置成功' });
  } catch (error) {
    logger.error(`重置密码失败: ${error.message}`);
    return res.status(500).json({ message: '重置密码过程中发生错误' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  verifyResetCode,
  resetPassword
}; 