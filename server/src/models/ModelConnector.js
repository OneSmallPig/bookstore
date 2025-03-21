/**
 * 模型连接器
 * 用于将代码中使用的MongoDB模型重定向到MySQL模型
 * 这样不需要修改业务逻辑代码，只需要改变引入模型的方式
 */

// 导入MySQL模型
const BookSourceMySQL = require('./bookSource/BookSourceMySQL');
const ReadingRecordMySQL = require('./ReadingRecordMySQL');

// 导出模型映射
module.exports = {
  // 将MongoDB模型名重定向到MySQL模型
  BookSource: BookSourceMySQL,
  ReadingRecord: ReadingRecordMySQL,
  
  // 如果有需要，可以添加更多模型的映射
}; 