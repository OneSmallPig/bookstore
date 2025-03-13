require('dotenv').config();
const { sequelize } = require('../config/database');
const Bookshelf = require('../models/bookshelf.model');

async function fixBookshelfTable() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 直接使用原始SQL删除书架表
    console.log('正在删除书架表...');
    try {
      await sequelize.query('DROP TABLE IF EXISTS `bookshelves`;');
      console.log('✅ 书架表已删除');
    } catch (error) {
      console.log('❌ 删除书架表失败:', error.message);
      if (error.original) {
        console.log('原始错误:', error.original.message);
      }
      return;
    }

    // 重新创建书架表
    console.log('正在重新创建书架表...');
    await Bookshelf.sync({ force: true });
    console.log('✅ 书架表创建成功!');

  } catch (error) {
    console.log('❌ 操作失败:', error.message);
    if (error.original) {
      console.log('原始错误:', error.original.message);
    }
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

// 执行函数
fixBookshelfTable()
  .then(() => {
    console.log('书架表修复过程完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('书架表修复过程失败:', error);
    process.exit(1);
  }); 