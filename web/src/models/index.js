import { Sequelize } from 'sequelize';
import { dbConfig } from '../config/database.js';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    port: config.port,
    pool: config.pool,
    logging: false
  }
);

// 用户模型
const User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  avatar: {
    type: Sequelize.STRING,
    defaultValue: 'default-avatar.png'
  },
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE
});

// 书籍模型
const Book = sequelize.define('Book', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false
  },
  author: {
    type: Sequelize.STRING,
    allowNull: false
  },
  cover: {
    type: Sequelize.STRING,
    allowNull: false
  },
  description: {
    type: Sequelize.TEXT
  },
  category: {
    type: Sequelize.STRING
  },
  rating: {
    type: Sequelize.FLOAT,
    defaultValue: 0
  },
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE
});

// 用户书架模型
const Bookshelf = sequelize.define('Bookshelf', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  status: {
    type: Sequelize.ENUM('want', 'reading', 'finished'),
    defaultValue: 'want'
  },
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE
});

// 设置关联关系
User.hasMany(Bookshelf);
Bookshelf.belongsTo(User);
Book.hasMany(Bookshelf);
Bookshelf.belongsTo(Book);

export { sequelize, User, Book, Bookshelf }; 