/**
 * 数据库初始化脚本
 * 用于初始化数据库并导入示例数据
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/user.model');
const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');
const { books, users, categories } = require('../config/sample-data');
const logger = require('../config/logger');

// 初始化数据库
async function initDatabase() {
  try {
    // 检查表是否已存在
    const [userTableExists] = await sequelize.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = '${process.env.DB_NAME}' AND table_name = 'users'`
    );
    
    const [bookTableExists] = await sequelize.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = '${process.env.DB_NAME}' AND table_name = 'books'`
    );
    
    const [bookshelfTableExists] = await sequelize.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = '${process.env.DB_NAME}' AND table_name = 'bookshelves'`
    );
    
    const tablesExist = userTableExists[0].count > 0 && 
                        bookTableExists[0].count > 0 && 
                        bookshelfTableExists[0].count > 0;
    
    // 如果表已存在，检查是否为空
    let isEmpty = true;
    if (tablesExist) {
      const [userCount] = await sequelize.query('SELECT COUNT(*) as count FROM users');
      const [bookCount] = await sequelize.query('SELECT COUNT(*) as count FROM books');
      
      isEmpty = userCount[0].count === 0 && bookCount[0].count === 0;
      
      if (!isEmpty) {
        logger.info('数据库表已存在且包含数据，跳过初始化');
        return;
      }
    }
    
    // 同步数据库模型（如果表不存在或为空）
    if (!tablesExist) {
      logger.info('创建数据库表...');
      await sequelize.sync({ force: true });
      logger.info('数据库表结构已创建');
    } else if (isEmpty) {
      logger.info('数据库表已存在但为空，将导入示例数据');
    }

    // 导入用户数据
    await User.bulkCreate(users);
    logger.info(`已导入 ${users.length} 个用户`);

    // 导入书籍数据
    await Book.bulkCreate(books);
    logger.info(`已导入 ${books.length} 本书籍`);

    // 为测试用户创建书架
    const testUser = await User.findOne({ where: { username: 'testuser' } });
    const allBooks = await Book.findAll();
    
    // 将前3本书添加到测试用户的书架
    const bookshelfItems = allBooks.slice(0, 3).map(book => ({
      userId: testUser.id,
      bookId: book.id,
      status: 'reading',
      progress: Math.floor(Math.random() * 100),
      startDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    }));
    
    await Bookshelf.bulkCreate(bookshelfItems);
    logger.info(`已为测试用户创建书架，添加了 ${bookshelfItems.length} 本书`);

    logger.info('数据库初始化完成');
  } catch (error) {
    logger.error('数据库初始化失败:', error.message);
    if (error.original) {
      logger.error('原始错误:', error.original.message);
    }
    process.exit(1);
  }
}

// 执行初始化
initDatabase()
  .then(() => {
    logger.info('脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    logger.error('脚本执行失败:', error.message);
    process.exit(1);
  }); 