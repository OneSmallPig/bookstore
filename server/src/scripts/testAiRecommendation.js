/**
 * AI推荐测试脚本
 * 用于测试AI推荐和热门书籍功能
 */

require('dotenv').config();
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// 测试获取推荐书籍
async function testRecommendedBooks() {
  try {
    console.log('测试获取AI推荐书籍...');
    const books = await aiService.getRecommendedBooks(null, 3);
    console.log('AI推荐书籍结果:');
    console.log(JSON.stringify(books, null, 2));
    return books;
  } catch (error) {
    logger.error('测试AI推荐书籍失败:', error);
    console.error('测试AI推荐书籍失败:', error.message);
  }
}

// 测试获取热门书籍
async function testPopularBooks() {
  try {
    console.log('\n测试获取热门书籍...');
    const books = await aiService.getPopularBooks(null, 3);
    console.log('热门书籍结果:');
    console.log(JSON.stringify(books, null, 2));
    return books;
  } catch (error) {
    logger.error('测试热门书籍失败:', error);
    console.error('测试热门书籍失败:', error.message);
  }
}

// 测试指定分类的热门书籍
async function testCategoryPopularBooks(category) {
  try {
    console.log(`\n测试获取${category}分类的热门书籍...`);
    const books = await aiService.getPopularBooks(category, 3);
    console.log(`${category}分类热门书籍结果:`);
    console.log(JSON.stringify(books, null, 2));
    return books;
  } catch (error) {
    logger.error(`测试${category}分类热门书籍失败:`, error);
    console.error(`测试${category}分类热门书籍失败:`, error.message);
  }
}

// 主函数
async function main() {
  try {
    console.log('开始AI推荐测试...\n');
    
    // 测试推荐书籍
    await testRecommendedBooks();
    
    // 测试热门书籍
    await testPopularBooks();
    
    // 测试分类热门书籍
    await testCategoryPopularBooks('玄幻');
    
    console.log('\n测试完成!');
  } catch (error) {
    logger.error('测试过程中发生错误:', error);
    console.error('测试过程中发生错误:', error.message);
  }
}

// 运行测试
main(); 