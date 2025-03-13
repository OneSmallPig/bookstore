require('dotenv').config();
const { sequelize } = require('../config/database');
const Bookshelf = require('../models/bookshelf.model');
const sampleData = require('../config/sample-data');

async function importBookshelfData() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 导入书架数据
    console.log('正在导入书架数据...');
    const bookshelves = [];
    for (const bookshelfData of sampleData.bookshelves) {
      try {
        const bookshelf = await Bookshelf.create({
          userId: bookshelfData.user_id,
          bookId: bookshelfData.book_id,
          isFavorite: bookshelfData.is_favorite,
          readingStatus: bookshelfData.reading_status,
          currentPage: bookshelfData.current_page,
          notes: bookshelfData.notes
        });
        bookshelves.push(bookshelf);
        console.log(`创建书架项: 用户ID ${bookshelfData.user_id}, 书籍ID ${bookshelfData.book_id}`);
      } catch (error) {
        console.log(`❌ 创建书架项失败 (用户ID ${bookshelfData.user_id}, 书籍ID ${bookshelfData.book_id}):`, error.message);
      }
    }
    console.log(`✅ 成功导入 ${bookshelves.length} 个书架项`);

  } catch (error) {
    console.log('❌ 导入数据失败:', error.message);
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
importBookshelfData()
  .then(() => {
    console.log('书架数据导入完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('书架数据导入失败:', error);
    process.exit(1);
  }); 