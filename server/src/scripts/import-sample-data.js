require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/user.model');
const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');
const bcrypt = require('bcryptjs');
const sampleData = require('../config/sample-data');

async function importSampleData() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 导入用户数据
    console.log('正在导入用户数据...');
    const users = [];
    for (const userData of sampleData.users) {
      // 对密码进行哈希处理
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await User.create({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        isActive: userData.is_active
      });
      users.push(user);
      console.log(`创建用户: ${userData.username}`);
    }
    console.log(`✅ 成功导入 ${users.length} 个用户`);

    // 导入书籍数据
    console.log('正在导入书籍数据...');
    const books = [];
    for (const bookData of sampleData.books) {
      const book = await Book.create({
        title: bookData.title,
        author: bookData.author,
        coverImage: bookData.cover_image,
        description: bookData.description,
        categories: bookData.categories,
        rating: bookData.rating,
        pageCount: bookData.page_count,
        publishYear: bookData.publish_year,
        language: bookData.language,
        isRecommended: bookData.is_recommended,
        isPopular: bookData.is_popular
      });
      books.push(book);
      console.log(`创建书籍: ${bookData.title}`);
    }
    console.log(`✅ 成功导入 ${books.length} 本书籍`);

    // 导入书架数据
    console.log('正在导入书架数据...');
    const bookshelves = [];
    for (const bookshelfData of sampleData.bookshelves) {
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
    }
    console.log(`✅ 成功导入 ${bookshelves.length} 个书架项`);

    console.log('✅ 所有示例数据导入完成!');
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
importSampleData()
  .then(() => {
    console.log('示例数据导入完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('示例数据导入失败:', error);
    process.exit(1);
  }); 