require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/user.model');
const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');

async function cleanDatabase() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 删除所有表（按照依赖关系的反向顺序）
    console.log('正在删除所有表...');
    try {
      // 先删除外键约束
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
      
      // 删除所有表（包括大小写不同的表名）
      await sequelize.query('DROP TABLE IF EXISTS `Bookshelves`;');
      await sequelize.query('DROP TABLE IF EXISTS `bookshelves`;');
      await sequelize.query('DROP TABLE IF EXISTS `Books`;');
      await sequelize.query('DROP TABLE IF EXISTS `books`;');
      await sequelize.query('DROP TABLE IF EXISTS `Users`;');
      await sequelize.query('DROP TABLE IF EXISTS `users`;');
      
      // 恢复外键约束检查
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
      
      console.log('✅ 所有表已删除');
    } catch (error) {
      console.log('❌ 删除表失败:', error.message);
      if (error.original) {
        console.log('原始错误:', error.original.message);
      }
      return;
    }

    // 按照依赖关系的正确顺序创建表
    console.log('正在创建用户表...');
    await User.sync({ force: true });
    console.log('✅ 用户表创建成功!');

    console.log('正在创建书籍表...');
    await Book.sync({ force: true });
    console.log('✅ 书籍表创建成功!');

    console.log('正在创建书架表...');
    await Bookshelf.sync({ force: true });
    console.log('✅ 书架表创建成功!');

    console.log('✅ 所有表创建完成!');
  } catch (error) {
    console.log('❌ 操作失败:', error.message);
    if (error.original) {
      console.log('原始错误:', error.original.message);
    }
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    console.log('\n数据库连接已关闭');
  }
}

// 执行函数
cleanDatabase()
  .then(() => {
    console.log('数据库清理和重建完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据库清理和重建失败:', error);
    process.exit(1);
  }); 