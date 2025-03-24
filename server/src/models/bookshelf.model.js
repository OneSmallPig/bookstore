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
    },
    field: 'user_id'
  },
  bookId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Book,
      key: 'id'
    },
    field: 'book_id'
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_favorite'
  },
  readingStatus: {
    type: DataTypes.ENUM('未开始', '阅读中', '已完成'),
    defaultValue: '未开始',
    field: 'reading_status'
  },
  currentPage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'current_page'
  },
  lastReadAt: {
    type: DataTypes.DATE,
    field: 'last_read_at'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'bookshelves',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义关联关系
User.hasMany(Bookshelf, { foreignKey: 'user_id' });
Bookshelf.belongsTo(User, { foreignKey: 'user_id' });

Book.hasMany(Bookshelf, { foreignKey: 'book_id' });
Bookshelf.belongsTo(Book, { foreignKey: 'book_id' });

// 同步模型到数据库
Bookshelf.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => console.log('书架表同步成功'))
  .catch(err => console.error('书架表同步失败:', err));

module.exports = Bookshelf; 