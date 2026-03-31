const Book = require('../models/book.model');
const Bookshelf = require('../models/bookshelf.model');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const coverResolverService = require('../services/cover/CoverResolverService');

function toPlainBook(book) {
  const plainBook = typeof book.toJSON === 'function' ? book.toJSON() : { ...book };
  plainBook.coverUrl = plainBook.coverImage || '';
  return plainBook;
}

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

    await coverResolverService.ensureBooksHaveCovers(books);

    const normalizedBooks = books.map(toPlainBook);
    
    return res.status(200).json({
      books: normalizedBooks,
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

    await coverResolverService.ensureBookCover(book);

    const plainBook = toPlainBook(book);
    
    return res.status(200).json({ book: plainBook });
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
    
    // 检查书籍是否存在，先尝试通过ID查找，然后尝试通过书名查找
    let book;
    if (!isNaN(bookId)) {
      // 如果是数字，通过ID查找
      book = await Book.findByPk(bookId);
    } else {
      // 如果不是数字，通过书名查找
      book = await Book.findOne({ where: { title: bookId } });
    }
    
    // 如果书籍不存在，创建一个新的书籍记录
    if (!book) {
      console.log(`书籍"${bookId}"不存在，创建新书籍记录`);
      // 创建一个新的书籍记录 - 优先使用请求体中的title字段
      const bookTitle = req.body.title || bookId;
      book = await Book.create({
        title: bookTitle,
        author: req.body.author || '未知作者',
        description: req.body.description || '暂无描述',
        coverImage: req.body.coverImage || '',
        isbn: req.body.isbn || null,
        isbn10: req.body.isbn10 || null,
        isbn13: req.body.isbn13 || null,
        publisher: req.body.publisher || null
      });
      console.log(`创建了新书籍: ${book.title}, ID: ${book.id}`);
    } else {
      // 如果书籍存在但数据不完整，使用请求中的数据更新书籍信息
      const shouldUpdate = 
        (book.title === bookId && req.body.title && req.body.title !== bookId) ||
        (book.author === '未知作者' && req.body.author) || 
        ((!book.description || book.description === '暂无描述') && req.body.description) ||
        ((!book.coverImage || book.coverImage === 'default-cover.png') && req.body.coverImage);
      
      if (shouldUpdate) {
        console.log(`书籍"${bookId}"存在但信息不完整，更新书籍信息`);
        await book.update({
          title: req.body.title || book.title,
          author: req.body.author || book.author,
          description: req.body.description || book.description,
          coverImage: req.body.coverImage || book.coverImage,
          isbn: req.body.isbn || book.isbn,
          isbn10: req.body.isbn10 || book.isbn10,
          isbn13: req.body.isbn13 || book.isbn13,
          publisher: req.body.publisher || book.publisher
        });
        console.log(`更新了书籍信息: ${book.title}, ID: ${book.id}`);
      }
    }

    await coverResolverService.ensureBookCover(book);
    
    // 使用找到的书籍的ID
    const actualBookId = book.id;
    
    // 检查是否已在书架中
    const existingEntry = await Bookshelf.findOne({
      where: { userId, bookId: actualBookId }
    });
    
    if (existingEntry) {
      return res.status(400).json({ message: '该书籍已在您的书架中' });
    }
    
    // 添加到书架
    const bookshelfEntry = await Bookshelf.create({
      userId,
      bookId: actualBookId,
      reading_status: req.body.reading_status || '未开始',
      current_page: req.body.current_page || 0,
      last_read_at: new Date()
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
    
    // 先检查书籍是否存在，先尝试通过ID查找，然后尝试通过书名查找
    let book;
    if (!isNaN(bookId)) {
      // 如果是数字，通过ID查找
      book = await Book.findByPk(bookId);
    } else {
      // 如果不是数字，通过书名查找
      book = await Book.findOne({ where: { title: bookId } });
    }
    
    if (!book) {
      return res.status(404).json({ message: `书籍"${bookId}"不存在，无法从书架中移除` });
    }
    
    // 使用找到的书籍的ID
    const actualBookId = book.id;
    
    // 检查是否在书架中
    const bookshelfEntry = await Bookshelf.findOne({
      where: { userId, bookId: actualBookId }
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
    const { current_page, reading_status } = req.body;
    
    // 先检查书籍是否存在，先尝试通过ID查找，然后尝试通过书名查找
    let book;
    if (!isNaN(bookId)) {
      // 如果是数字，通过ID查找
      book = await Book.findByPk(bookId);
    } else {
      // 如果不是数字，通过书名查找
      book = await Book.findOne({ where: { title: bookId } });
    }
    
    if (!book) {
      return res.status(404).json({ message: `书籍"${bookId}"不存在，无法更新阅读进度` });
    }
    
    // 使用找到的书籍的ID
    const actualBookId = book.id;
    
    // 检查是否在书架中
    const bookshelfEntry = await Bookshelf.findOne({
      where: { userId, bookId: actualBookId }
    });
    
    if (!bookshelfEntry) {
      return res.status(404).json({ message: '该书籍不在您的书架中' });
    }
    
    // 更新阅读进度
    const updatedEntry = await bookshelfEntry.update({
      current_page: current_page !== undefined ? current_page : bookshelfEntry.current_page,
      reading_status: reading_status || bookshelfEntry.reading_status,
      last_read_at: new Date()
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

/**
 * 主动解析并刷新书籍封面
 */
const resolveBookCover = async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findByPk(bookId);
    if (!book) {
      return res.status(404).json({ message: '书籍不存在' });
    }

    await coverResolverService.ensureBookCover(book, { forceRefresh: true });

    const plainBook = toPlainBook(book);

    return res.status(200).json({
      message: '书籍封面已刷新',
      book: plainBook
    });
  } catch (error) {
    logger.error(`刷新书籍封面失败: ${error.message}`);
    return res.status(500).json({ message: '刷新书籍封面过程中发生错误' });
  }
};

module.exports = {
  getAllBooks,
  getBookById,
  addToBookshelf,
  removeFromBookshelf,
  updateReadingProgress,
  resolveBookCover
};
