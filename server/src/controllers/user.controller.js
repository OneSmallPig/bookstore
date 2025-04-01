const User = require('../models/user.model');
const Bookshelf = require('../models/bookshelf.model');
const logger = require('../config/logger');

/**
 * 获取用户个人资料
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    return res.status(200).json({ user });
  } catch (error) {
    logger.error(`获取用户资料失败: ${error.message}`);
    return res.status(500).json({ message: '获取用户资料过程中发生错误' });
  }
};

/**
 * 更新用户个人资料
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, avatar } = req.body;
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 更新用户信息
    const updatedUser = await user.update({
      username: username || user.username,
      avatar: avatar || user.avatar
    });
    
    return res.status(200).json({
      message: '个人资料更新成功',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    logger.error(`更新用户资料失败: ${error.message}`);
    return res.status(500).json({ message: '更新用户资料过程中发生错误' });
  }
};

/**
 * 更改密码
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '当前密码和新密码都是必填项' });
    }
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 验证当前密码
    const isPasswordValid = await user.validatePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '当前密码不正确' });
    }
    
    // 更新密码
    await user.update({ password: newPassword });
    
    return res.status(200).json({ message: '密码修改成功' });
  } catch (error) {
    logger.error(`修改密码失败: ${error.message}`);
    return res.status(500).json({ message: '修改密码过程中发生错误' });
  }
};

/**
 * 获取用户书架
 */
const getBookshelf = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bookshelf = await Bookshelf.findAll({
      where: { userId },
      include: [
        {
          model: require('../models/book.model'),
          attributes: ['id', 'title', 'author', 'cover_image', 'categories', 'rating']
        }
      ]
    });
    
    return res.status(200).json({ bookshelf });
  } catch (error) {
    logger.error(`获取用户书架失败: ${error.message}`);
    return res.status(500).json({ message: '获取用户书架过程中发生错误' });
  }
};

/**
 * 获取当前登录用户的书架
 */
const getCurrentUserBookshelf = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 加载用户的书架，包括书籍详情
    const bookshelf = await Bookshelf.findAll({
      where: { userId },
      include: [
        {
          model: require('../models/book.model'),
          as: 'book',
          attributes: ['id', 'title', 'author', 'coverImage', 'categories', 'rating', 'description']
        }
      ]
    });
    
    return res.status(200).json({ 
      bookshelf,
      message: '成功获取书架数据' 
    });
  } catch (error) {
    logger.error(`获取当前用户书架失败: ${error.message}`);
    return res.status(500).json({ message: '获取书架数据过程中发生错误' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getBookshelf,
  getCurrentUserBookshelf
}; 