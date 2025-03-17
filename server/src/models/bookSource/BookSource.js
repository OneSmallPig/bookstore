const mongoose = require('mongoose');

/**
 * 书源模型
 * 用于定义网络书籍来源的抓取规则
 */
const bookSourceSchema = new mongoose.Schema({
  // 基本信息
  name: { type: String, required: true, unique: true }, // 书源名称
  url: { type: String, required: true }, // 书源网址
  version: { type: Number, default: 1 }, // 规则版本
  icon: { type: String }, // 书源图标
  group: { type: String, default: '默认' }, // 书源分组
  enabled: { type: Boolean, default: true }, // 是否启用
  
  // 搜索相关规则
  searchUrl: { type: String, required: true }, // 搜索URL，可包含占位符如 {keyword}
  searchList: { type: String, required: true }, // 搜索结果列表选择器
  searchName: { type: String, required: true }, // 书名选择器
  searchAuthor: { type: String }, // 作者选择器
  searchCover: { type: String }, // 封面选择器
  searchDetail: { type: String, required: true }, // 详情页链接选择器
  searchIntro: { type: String }, // 简介选择器
  
  // 书籍详情页规则
  detailUrl: { type: String }, // 详情页URL，可选，如果为空则使用searchDetail
  detailName: { type: String }, // 详情页书名选择器
  detailAuthor: { type: String }, // 详情页作者选择器
  detailCover: { type: String }, // 详情页封面选择器
  detailIntro: { type: String }, // 详情页简介选择器
  detailCategory: { type: String }, // 详情页分类选择器
  detailChapterUrl: { type: String }, // 章节列表URL选择器，如果为空则使用当前页面
  
  // 章节列表规则
  chapterUrl: { type: String }, // 章节列表URL，可选，如果为空则使用detailChapterUrl
  chapterList: { type: String, required: true }, // 章节列表选择器
  chapterName: { type: String, required: true }, // 章节名选择器
  chapterLink: { type: String, required: true }, // 章节链接选择器
  
  // 章节内容规则
  contentUrl: { type: String }, // 内容页URL，可选，如果为空则使用chapterLink
  contentRule: { type: String, required: true }, // 内容选择器
  contentFilter: { type: [String], default: [] }, // 内容过滤规则，数组形式
  
  // HTTP请求相关
  headers: { 
    type: Map, 
    of: String,
    default: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
  }, // 自定义HTTP头
  cookies: { type: String }, // 网站Cookie
  charset: { type: String, default: 'utf-8' }, // 网站编码
  
  // 高级设置
  enableJs: { type: Boolean, default: false }, // 是否启用JavaScript
  loadImages: { type: Boolean, default: false }, // 是否加载图片
  timeout: { type: Number, default: 10000 }, // 请求超时时间(毫秒)
  retry: { type: Number, default: 3 }, // 请求失败重试次数
  
  // 元数据
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 创建者
  createdAt: { type: Date, default: Date.now }, // 创建时间
  updatedAt: { type: Date, default: Date.now }, // 更新时间
  lastUsed: { type: Date }, // 最后使用时间
  usageCount: { type: Number, default: 0 }, // 使用次数
  rating: { type: Number, default: 0 }, // 评分
  
  // 自定义规则
  customRules: { type: Map, of: String }, // 自定义规则，可用于特殊网站
});

// 更新时自动更新updatedAt字段
bookSourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引
bookSourceSchema.index({ name: 1 }, { unique: true });
bookSourceSchema.index({ group: 1 });
bookSourceSchema.index({ enabled: 1 });
bookSourceSchema.index({ rating: -1 });
bookSourceSchema.index({ usageCount: -1 });

const BookSource = mongoose.model('BookSource', bookSourceSchema);

module.exports = BookSource; 