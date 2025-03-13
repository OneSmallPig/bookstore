/**
 * 创建数据库表脚本
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/user.model');
const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');
const logger = require('../config/logger');

// 创建数据库表
async function createTables() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 先删除所有表（按照依赖关系的反向顺序）
    console.log('正在删除现有表...');
    try {
      await sequelize.query('DROP TABLE IF EXISTS `bookshelves`;');
      await sequelize.query('DROP TABLE IF EXISTS `books`;');
      await sequelize.query('DROP TABLE IF EXISTS `users`;');
      console.log('✅ 现有表已删除');
    } catch (error) {
      console.log('❌ 删除表失败:', error.message);
    }

    // 按照依赖关系的正确顺序创建表
    // 1. 先创建用户表（没有外键依赖）
    console.log('正在创建用户表...');
    await User.sync({ force: false });
    console.log('✅ 用户表创建成功!');

    // 2. 然后创建书籍表（没有外键依赖）
    console.log('正在创建书籍表...');
    await Book.sync({ force: false });
    console.log('✅ 书籍表创建成功!');

    // 3. 最后创建书架表（依赖于用户表和书籍表）
    console.log('正在创建书架表...');
    await Bookshelf.sync({ force: false });
    console.log('✅ 书架表创建成功!');

    console.log('✅ 所有表创建完成!');
  } catch (error) {
    console.log('❌ 创建表失败:', error.message);
    if (error.original) {
      console.log('原始错误:', error.original.message);
    }
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

// 执行创建表函数
createTables()
  .then(() => {
    console.log('表创建过程完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('表创建过程失败:', error);
    process.exit(1);
  }); 