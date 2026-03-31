const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const config = require('../config/config');

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  author: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  coverImage: {
    type: DataTypes.STRING,
    defaultValue: 'default-cover.png'
  },
  coverSource: {
    type: DataTypes.STRING(50),
    defaultValue: 'missing'
  },
  coverOriginalUrl: {
    type: DataTypes.STRING
  },
  coverStorageKey: {
    type: DataTypes.STRING
  },
  coverStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'missing'
  },
  coverLastVerifiedAt: {
    type: DataTypes.DATE
  },
  coverWidth: {
    type: DataTypes.INTEGER
  },
  coverHeight: {
    type: DataTypes.INTEGER
  },
  coverHash: {
    type: DataTypes.STRING(64)
  },
  coverConfidence: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT
  },
  summary: {
    type: DataTypes.TEXT
  },
  categories: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  publishYear: {
    type: DataTypes.INTEGER
  },
  publisher: {
    type: DataTypes.STRING(100)
  },
  pageCount: {
    type: DataTypes.INTEGER
  },
  language: {
    type: DataTypes.STRING(50),
    defaultValue: '中文'
  },
  isbn: {
    type: DataTypes.STRING(20)
  },
  isbn10: {
    type: DataTypes.STRING(20)
  },
  isbn13: {
    type: DataTypes.STRING(20)
  },
  fileUrl: {
    type: DataTypes.STRING
  },
  fileFormat: {
    type: DataTypes.STRING(10)
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isRecommended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPopular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'books',
  timestamps: true,
  underscored: true
});

// 同步模型到数据库
Book.sync({ alter: config.database.syncAlter })
  .then(() => console.log('书籍表同步成功'))
  .catch(err => console.error('书籍表同步失败:', err));

module.exports = Book; 
