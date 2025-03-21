require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/user.model');
const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');
const bcrypt = require('bcryptjs');
const sampleData = require('../config/sample-data');
const fs = require('fs').promises;
const path = require('path');
const BookSourceMySQL = require('../models/bookSource/BookSourceMySQL');
const bookSourceManager = require('../services/bookSource/BookSourceManager');
const logger = require('../utils/logger');

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

/**
 * 导入样例书源数据
 */
async function importSampleBookSources() {
  try {
    logger.info('开始导入样例书源数据...');
    
    // 读取样例书源文件
    const sampleDataPath = path.join(__dirname, '../../测试模板书源文件.json');
    const fileExists = await fs.access(sampleDataPath).then(() => true).catch(() => false);
    
    if (!fileExists) {
      logger.warn(`样例数据文件不存在: ${sampleDataPath}`);
      return;
    }
    
    // 读取文件内容
    const data = await fs.readFile(sampleDataPath, 'utf8');
    
    // 解析JSON
    let sources;
    try {
      sources = JSON.parse(data);
      logger.info(`已读取 ${sources.length} 条书源记录`);
    } catch (parseError) {
      logger.error('解析JSON失败:', parseError);
      return;
    }
    
    // 如果是数组，使用书源管理器导入
    if (Array.isArray(sources)) {
      const result = await bookSourceManager.importSources(sources);
      logger.info(`成功导入 ${result} 条书源记录`);
    } else {
      logger.warn('书源数据不是数组格式');
    }
    
  } catch (error) {
    logger.error('导入样例数据失败:', error);
  }
}

// 如果直接运行此脚本，则执行导入
if (require.main === module) {
  importSampleData().then(() => {
    importSampleBookSources().then(() => {
      logger.info('样例数据导入脚本执行完成');
      process.exit(0);
    });
  });
} else {
  // 作为模块导出
  module.exports = { importSampleData, importSampleBookSources };
} 