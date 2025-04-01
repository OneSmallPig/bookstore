const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
Book.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => console.log('书籍表同步成功'))
  .catch(err => console.error('书籍表同步失败:', err));

module.exports = Book; 