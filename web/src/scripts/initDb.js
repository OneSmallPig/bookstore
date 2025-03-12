import { sequelize, User, Book } from '../models/index.js';
import bcrypt from 'bcrypt';

async function initializeDatabase() {
  try {
    // 同步数据库结构
    await sequelize.sync({ force: true });
    console.log('数据库表已创建');

    // 创建测试用户
    const hashedPassword = await bcrypt.hash('test123', 10);
    await User.create({
      username: 'testuser',
      password: hashedPassword,
      email: 'test@example.com'
    });
    console.log('测试用户已创建');

    // 创建示例书籍
    const books = [
      {
        title: '深度学习',
        author: '伊恩·古德费洛',
        cover: 'src/images/book-covers/deep-learning.svg',
        description: '这是一本关于深度学习的综合指南...',
        category: '计算机科学',
        rating: 4.5
      },
      {
        title: '人工智能简史',
        author: '尼克·波斯特罗姆',
        cover: 'src/images/book-covers/ai-history.svg',
        description: '探索人工智能的发展历程...',
        category: '科技',
        rating: 4.2
      }
    ];

    await Book.bulkCreate(books);
    console.log('示例书籍已创建');

    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  } finally {
    await sequelize.close();
  }
}

initializeDatabase(); 