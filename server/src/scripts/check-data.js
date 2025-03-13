require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/user.model');
const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');

async function checkData() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 检查用户数据
    console.log('\n正在检查用户数据...');
    const users = await User.findAll();
    console.log(`数据库中有 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`- ID: ${user.id}, 用户名: ${user.username}, 邮箱: ${user.email}, 角色: ${user.role}`);
    });

    // 检查书籍数据
    console.log('\n正在检查书籍数据...');
    const books = await Book.findAll();
    console.log(`数据库中有 ${books.length} 本书籍:`);
    books.forEach(book => {
      console.log(`- ID: ${book.id}, 标题: ${book.title}, 作者: ${book.author}`);
    });

    // 检查书架数据
    console.log('\n正在检查书架数据...');
    const bookshelves = await Bookshelf.findAll();
    console.log(`数据库中有 ${bookshelves.length} 个书架项:`);
    bookshelves.forEach(bookshelf => {
      console.log(`- ID: ${bookshelf.id}, 用户ID: ${bookshelf.userId}, 书籍ID: ${bookshelf.bookId}, 阅读状态: ${bookshelf.readingStatus}`);
    });

  } catch (error) {
    console.log('❌ 检查数据失败:', error.message);
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
checkData()
  .then(() => {
    console.log('数据检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据检查失败:', error);
    process.exit(1);
  }); 