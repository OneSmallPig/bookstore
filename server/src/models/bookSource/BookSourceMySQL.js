const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database'); // 从database.js中解构导入sequelize实例

/**
 * 书源MySQL模型
 */
const BookSourceMySQL = sequelize.define('BookSource', {
  name: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  group: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // 搜索规则
  searchUrl: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  searchList: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  searchName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  searchAuthor: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  searchDetail: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 详情页规则
  detailName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  detailAuthor: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  detailCover: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  detailIntro: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  detailChapterUrl: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 章节列表规则
  chapterList: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  chapterName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  chapterLink: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 内容规则
  contentRule: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  contentFilter: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('contentFilter');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('contentFilter', JSON.stringify(value || []));
    }
  },
  // 额外设置
  charset: {
    type: DataTypes.STRING(20),
    defaultValue: 'utf-8'
  },
  enableJs: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  loadImages: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  timeout: {
    type: DataTypes.INTEGER,
    defaultValue: 15000
  },
  retry: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  }
}, {
  tableName: 'book_sources',
  timestamps: true
});

module.exports = BookSourceMySQL; 