const mongoose = require('mongoose');

/**
 * 阅读记录模型
 * 用于记录用户的阅读进度、阅读时长和笔记等信息
 */
const readingRecordSchema = new mongoose.Schema({
  // 关联用户和书籍
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  bookId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Book', 
    required: true 
  },
  
  // 阅读进度信息
  chapterId: { type: String }, // 当前章节ID
  chapterTitle: { type: String }, // 当前章节标题
  chapterIndex: { type: Number }, // 当前章节索引
  position: { type: Number, default: 0 }, // 章节内阅读位置（百分比或字符位置）
  totalChapters: { type: Number }, // 总章节数
  
  // 阅读时间统计
  startTime: { type: Date }, // 开始阅读时间
  lastReadTime: { type: Date, default: Date.now }, // 最后阅读时间
  totalReadingTime: { type: Number, default: 0 }, // 总阅读时长（分钟）
  readingTimeHistory: [{ // 阅读时长历史记录
    date: { type: Date },
    duration: { type: Number } // 分钟
  }],
  
  // 阅读设置
  fontSize: { type: Number }, // 字体大小
  lineHeight: { type: Number }, // 行高
  theme: { type: String }, // 主题（日间、夜间等）
  fontFamily: { type: String }, // 字体
  
  // 笔记和标注
  notes: [{ 
    chapterId: { type: String }, // 章节ID
    chapterTitle: { type: String }, // 章节标题
    content: { type: String }, // 笔记内容
    highlight: { type: String }, // 高亮的原文
    position: { type: Number }, // 位置
    color: { type: String }, // 高亮颜色
    createdAt: { type: Date, default: Date.now } // 创建时间
  }],
  
  // 书签
  bookmarks: [{
    chapterId: { type: String }, // 章节ID
    chapterTitle: { type: String }, // 章节标题
    position: { type: Number }, // 位置
    excerpt: { type: String }, // 摘录
    createdAt: { type: Date, default: Date.now } // 创建时间
  }],
  
  // 阅读状态
  status: { 
    type: String, 
    enum: ['未读', '阅读中', '已读', '暂停', '放弃'], 
    default: '未读' 
  },
  
  // 评分和评价
  rating: { type: Number, min: 0, max: 5 }, // 用户评分
  review: { type: String }, // 用户评价
  
  // 元数据
  createdAt: { type: Date, default: Date.now }, // 记录创建时间
  updatedAt: { type: Date, default: Date.now }, // 记录更新时间
  
  // 书源信息
  sourceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'BookSource' 
  }, // 关联的书源ID
  sourceUrl: { type: String }, // 书源URL
});

// 更新时自动更新updatedAt字段
readingRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 复合索引，确保每个用户对每本书只有一条阅读记录
readingRecordSchema.index({ userId: 1, bookId: 1 }, { unique: true });
// 其他索引
readingRecordSchema.index({ userId: 1, lastReadTime: -1 }); // 用于查询用户最近阅读
readingRecordSchema.index({ userId: 1, status: 1 }); // 用于查询用户阅读状态
readingRecordSchema.index({ bookId: 1, rating: -1 }); // 用于查询书籍评分

const ReadingRecord = mongoose.model('ReadingRecord', readingRecordSchema);

module.exports = ReadingRecord; 