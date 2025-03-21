const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 阅读记录MySQL模型
 * 用于记录用户的阅读进度、阅读时长和笔记等信息
 */
const ReadingRecordMySQL = sequelize.define('ReadingRecord', {
  // 主键
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // 关联用户和书籍
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  bookId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  
  // 阅读进度信息
  chapterId: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  chapterTitle: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  chapterIndex: { 
    type: DataTypes.INTEGER,
    allowNull: true
  },
  position: { 
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  totalChapters: { 
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // 阅读时间统计
  startTime: { 
    type: DataTypes.DATE,
    allowNull: true
  },
  lastReadTime: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  totalReadingTime: { 
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  readingTimeHistory: { 
    type: DataTypes.TEXT,
    get() {
      const raw = this.getDataValue('readingTimeHistory');
      return raw ? JSON.parse(raw) : [];
    },
    set(value) {
      this.setDataValue('readingTimeHistory', JSON.stringify(value || []));
    }
  },
  
  // 阅读设置
  fontSize: { 
    type: DataTypes.INTEGER,
    allowNull: true
  },
  lineHeight: { 
    type: DataTypes.FLOAT,
    allowNull: true
  },
  theme: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  fontFamily: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // 笔记和标注 (JSON格式)
  notes: { 
    type: DataTypes.TEXT,
    get() {
      const raw = this.getDataValue('notes');
      return raw ? JSON.parse(raw) : [];
    },
    set(value) {
      this.setDataValue('notes', JSON.stringify(value || []));
    }
  },
  
  // 书签 (JSON格式)
  bookmarks: { 
    type: DataTypes.TEXT,
    get() {
      const raw = this.getDataValue('bookmarks');
      return raw ? JSON.parse(raw) : [];
    },
    set(value) {
      this.setDataValue('bookmarks', JSON.stringify(value || []));
    }
  },
  
  // 阅读状态
  status: { 
    type: DataTypes.ENUM('未读', '阅读中', '已读', '暂停', '放弃'),
    defaultValue: '未读'
  },
  
  // 评分和评价
  rating: { 
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 5
    },
    allowNull: true
  },
  review: { 
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // 书源信息
  sourceId: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  sourceUrl: { 
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'reading_records',
  indexes: [
    // 复合索引，确保每个用户对每本书只有一条阅读记录
    {
      unique: true,
      fields: ['userId', 'bookId']
    },
    // 其他索引
    {
      fields: ['userId', 'lastReadTime']
    },
    {
      fields: ['userId', 'status']
    },
    {
      fields: ['bookId', 'rating']
    }
  ]
});

module.exports = ReadingRecordMySQL; 