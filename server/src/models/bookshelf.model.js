const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');
const Book = require('./book.model');

const Bookshelf = sequelize.define('Bookshelf', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  bookId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Book,
      key: 'id'
    }
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readingStatus: {
    type: DataTypes.ENUM('未开始', '阅读中', '已完成'),
    defaultValue: '未开始'
  },
  currentPage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastReadAt: {
    type: DataTypes.DATE
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'bookshelves',
  timestamps: true
});

// 定义关联关系
User.hasMany(Bookshelf, { foreignKey: 'userId' });
Bookshelf.belongsTo(User, { foreignKey: 'userId' });

Book.hasMany(Bookshelf, { foreignKey: 'bookId' });
Bookshelf.belongsTo(Book, { foreignKey: 'bookId' });

// 同步模型到数据库
Bookshelf.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => console.log('书架表同步成功'))
  .catch(err => console.error('书架表同步失败:', err));

module.exports = Bookshelf; 