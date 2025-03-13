const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');
const { Op } = require('sequelize');
const logger = require('../config/logger');

/**
 * 获取所有书籍
 */
const getAllBooks = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereClause = {};
    
    if (category) {
      whereClause.categories = {
        [Op.like]: `%${category}%`
      };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { author: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 处理特殊排序
    let orderClause = [];
    
    if (sort === 'recommended') {
      whereClause.isRecommended = true;
      orderClause = [['rating', 'DESC']];
    } else if (sort === 'popular') {
      whereClause.isPopular = true;
      orderClause = [['rating', 'DESC']];
    } else {
      orderClause = [[sort, order]];
    }
    
    // 查询书籍
    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderClause
    });
    
    return res.status(200).json({
      books,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error(`获取书籍列表失败: ${error.message}`);
    return res.status(500).json({ message: '获取书籍列表过程中发生错误' });
  }
};

/**
 * 获取书籍详情
 */
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const book = await Book.findByPk(id);
    
    if (!book) {
      return res.status(404).json({ message: '书籍不存在' });
    }
    
    return res.status(200).json({ book });
  } catch (error) {
    logger.error(`获取书籍详情失败: ${error.message}`);
    return res.status(500).json({ message: '获取书籍详情过程中发生错误' });
  }
};

/**
 * 添加书籍到书架
 */
const addToBookshelf = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;
    
    // 检查书籍是否存在
    const book = await Book.findByPk(bookId);
    if (!book) {
      return res.status(404).json({ message: '书籍不存在' });
    }
    
    // 检查是否已在书架中
    const existingEntry = await Bookshelf.findOne({
      where: { userId, bookId }
    });
    
    if (existingEntry) {
      return res.status(400).json({ message: '该书籍已在您的书架中' });
    }
    
    // 添加到书架
    const bookshelfEntry = await Bookshelf.create({
      userId,
      bookId,
      readingStatus: '未开始',
      currentPage: 0,
      lastReadAt: new Date()
    });
    
    return res.status(201).json({
      message: '书籍已添加到书架',
      bookshelfEntry
    });
  } catch (error) {
    logger.error(`添加书籍到书架失败: ${error.message}`);
    return res.status(500).json({ message: '添加书籍到书架过程中发生错误' });
  }
};

/**
 * 从书架移除书籍
 */
const removeFromBookshelf = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;
    
    // 检查是否在书架中
    const bookshelfEntry = await Bookshelf.findOne({
      where: { userId, bookId }
    });
    
    if (!bookshelfEntry) {
      return res.status(404).json({ message: '该书籍不在您的书架中' });
    }
    
    // 从书架移除
    await bookshelfEntry.destroy();
    
    return res.status(200).json({
      message: '书籍已从书架移除'
    });
  } catch (error) {
    logger.error(`从书架移除书籍失败: ${error.message}`);
    return res.status(500).json({ message: '从书架移除书籍过程中发生错误' });
  }
};

/**
 * 更新阅读进度
 */
const updateReadingProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;
    const { currentPage, readingStatus } = req.body;
    
    // 检查是否在书架中
    const bookshelfEntry = await Bookshelf.findOne({
      where: { userId, bookId }
    });
    
    if (!bookshelfEntry) {
      return res.status(404).json({ message: '该书籍不在您的书架中' });
    }
    
    // 更新阅读进度
    const updatedEntry = await bookshelfEntry.update({
      currentPage: currentPage !== undefined ? currentPage : bookshelfEntry.currentPage,
      readingStatus: readingStatus || bookshelfEntry.readingStatus,
      lastReadAt: new Date()
    });
    
    return res.status(200).json({
      message: '阅读进度已更新',
      bookshelfEntry: updatedEntry
    });
  } catch (error) {
    logger.error(`更新阅读进度失败: ${error.message}`);
    return res.status(500).json({ message: '更新阅读进度过程中发生错误' });
  }
};

module.exports = {
  getAllBooks,
  getBookById,
  addToBookshelf,
  removeFromBookshelf,
  updateReadingProgress
};