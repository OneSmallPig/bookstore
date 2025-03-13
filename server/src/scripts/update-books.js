require('dotenv').config();
const { sequelize } = require('../config/database');
const Book = require('../models/book.model');

async function updateBooks() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 更新推荐书籍
    console.log('正在更新推荐书籍...');
    const recommendedBooks = [1, 2, 3, 4]; // 深度学习, 人类简史, 未来简史, 思考，快与慢
    for (const bookId of recommendedBooks) {
      await Book.update(
        { isRecommended: true },
        { where: { id: bookId } }
      );
      console.log(`书籍ID ${bookId} 已设置为推荐`);
    }

    // 更新热门书籍
    console.log('正在更新热门书籍...');
    const popularBooks = [2, 3, 4, 5, 6, 7]; // 人类简史, 未来简史, 思考，快与慢, 原子习惯, 刻意练习, 心理学入门
    for (const bookId of popularBooks) {
      await Book.update(
        { isPopular: true },
        { where: { id: bookId } }
      );
      console.log(`书籍ID ${bookId} 已设置为热门`);
    }

    console.log('✅ 所有书籍更新完成!');
  } catch (error) {
    console.log('❌ 更新书籍失败:', error.message);
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
updateBooks()
  .then(() => {
    console.log('书籍数据更新完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('书籍数据更新失败:', error);
    process.exit(1);
  }); 