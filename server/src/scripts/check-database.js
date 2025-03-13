require('dotenv').config();
const { sequelize } = require('../config/database');

async function checkDatabase() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');

    // 检查数据库中的表
    console.log('正在检查数据库中的表...');
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'versatile_bookstore'
    `);
    
    console.log('数据库中的表:');
    tables.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });

    // 检查外键约束
    console.log('\n正在检查外键约束...');
    const [constraints] = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE 
        CONSTRAINT_SCHEMA = 'versatile_bookstore' AND
        REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('外键约束:');
    constraints.forEach(constraint => {
      console.log(`- 表 ${constraint.TABLE_NAME} 上的约束 ${constraint.CONSTRAINT_NAME} 引用 ${constraint.REFERENCED_TABLE_NAME}(${constraint.REFERENCED_COLUMN_NAME})`);
    });

    // 检查索引
    console.log('\n正在检查索引...');
    const [indexes] = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM 
        INFORMATION_SCHEMA.STATISTICS
      WHERE 
        TABLE_SCHEMA = 'versatile_bookstore'
      ORDER BY 
        TABLE_NAME, INDEX_NAME
    `);
    
    console.log('索引:');
    indexes.forEach(index => {
      const uniqueStr = index.NON_UNIQUE === 0 ? '唯一' : '非唯一';
      console.log(`- 表 ${index.TABLE_NAME} 上的${uniqueStr}索引 ${index.INDEX_NAME} (列: ${index.COLUMN_NAME})`);
    });

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
checkDatabase()
  .then(() => {
    console.log('数据库检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据库检查失败:', error);
    process.exit(1);
  }); 