/**
 * 数据库连接测试脚本
 */

require('dotenv').config();
const { sequelize, testConnection } = require('../config/database');
const config = require('../config/config');

console.log('数据库连接信息:');
console.log('主机:', config.database.host);
console.log('端口:', config.database.port);
console.log('数据库名:', config.database.name);
console.log('用户名:', config.database.user);
console.log('密码:', '******'); // 出于安全考虑不显示实际密码

// 测试数据库连接
async function runTest() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功!');
    
    // 尝试查询一些基本信息
    try {
      const [results] = await sequelize.query('SHOW TABLES');
      console.log('\n数据库中的表:');
      if (results.length === 0) {
        console.log('数据库中没有表');
      } else {
        results.forEach(row => {
          const tableName = Object.values(row)[0];
          console.log(`- ${tableName}`);
        });
      }
    } catch (error) {
      console.error('查询表信息失败:', error.message);
    }
    
    // 关闭连接
    await sequelize.close();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    if (error.original) {
      console.error('原始错误:', error.original.message);
    }
    process.exit(1);
  }
}

runTest(); 
