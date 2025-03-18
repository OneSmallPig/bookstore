const BookSourceParser = require('./BookSourceParser');
const bookSourceManager = require('./BookSourceManager');
const logger = require('../../utils/logger');

/**
 * 书籍搜索服务
 * 用于在多个书源中搜索书籍
 */
class BookSearchService {
  /**
   * 构造函数
   */
  constructor() {
    this.parserCache = new Map(); // 缓存书源解析器
  }

  /**
   * 获取书源解析器
   * @param {Object} bookSource 书源对象
   * @returns {BookSourceParser} 书源解析器
   */
  _getParser(bookSource) {
    if (!this.parserCache.has(bookSource.name)) {
      const parser = new BookSourceParser(bookSource);
      this.parserCache.set(bookSource.name, parser);
    }
    return this.parserCache.get(bookSource.name);
  }

  /**
   * 搜索书籍
   * @param {string} keyword 搜索关键词
   * @param {Array} sourceNames 要搜索的书源名称数组，为空则搜索所有
   * @param {number} timeout 超时时间（毫秒）
   * @returns {Promise<Array>} 搜索结果
   */
  async searchBooks(keyword, sourceNames = [], timeout = 30000) {
    // 确保书源管理器已初始化
    if (!bookSourceManager.initialized) {
      await bookSourceManager.initialize();
    }

    let sources;
    if (sourceNames.length === 0) {
      // 使用所有启用的书源
      sources = bookSourceManager.getAllSources();
    } else {
      // 使用指定的书源
      sources = sourceNames.map(name => bookSourceManager.getSourceByName(name)).filter(Boolean);
    }

    if (sources.length === 0) {
      logger.warn('没有可用的书源进行搜索');
      return [];
    }

    // 创建超时Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('搜索超时')), timeout);
    });

    logger.info(`使用${sources.length}个书源搜索: ${keyword}`);

    // 并行搜索所有书源
    const searchPromises = sources.map(async (source) => {
      try {
        const parser = this._getParser(source);
        const results = await parser.search(keyword);
        
        // 记录使用次数
        try {
          source.usageCount = (source.usageCount || 0) + 1;
          source.lastUsed = new Date();
          await source.save();
        } catch (error) {
          logger.error(`更新书源使用统计失败: ${source.name}`, error);
        }
        
        return results.map(result => ({
          ...result,
          source: source.name,
          sourceUrl: source.url
        }));
      } catch (error) {
        logger.error(`使用书源 ${source.name} 搜索失败`, error);
        return []; // 返回空结果，不中断整个搜索
      }
    });

    try {
      // 使用Promise.race实现超时
      const results = await Promise.race([
        Promise.all(searchPromises),
        timeoutPromise
      ]);
      
      // 合并所有搜索结果
      const mergedResults = [].concat(...results);
      
      // 去重（根据书名和作者）
      const uniqueResults = this._deduplicateResults(mergedResults);
      
      logger.info(`搜索完成，找到${uniqueResults.length}个结果（去重前${mergedResults.length}个）`);
      
      return uniqueResults;
    } catch (error) {
      if (error.message === '搜索超时') {
        logger.warn(`搜索超时 (${timeout}ms): ${keyword}`);
      } else {
        logger.error('搜索过程出错', error);
      }
      throw error;
    }
  }

  /**
   * 去重搜索结果
   * @param {Array} results 搜索结果数组
   * @returns {Array} 去重后的结果
   */
  _deduplicateResults(results) {
    const seen = new Map();
    
    return results.filter(book => {
      // 创建去重键（书名+作者）
      const key = `${book.name || ''}|${book.author || ''}`.toLowerCase();
      
      if (!seen.has(key)) {
        seen.set(key, true);
        return true;
      }
      
      return false;
    });
  }

  /**
   * 获取书籍详情
   * @param {string} url 书籍详情页URL
   * @param {string} sourceName 书源名称
   * @returns {Promise<Object>} 书籍详情
   */
  async getBookDetail(url, sourceName) {
    // 确保书源管理器已初始化
    if (!bookSourceManager.initialized) {
      await bookSourceManager.initialize();
    }

    const source = bookSourceManager.getSourceByName(sourceName);
    if (!source) {
      throw new Error(`未找到书源: ${sourceName}`);
    }

    try {
      const parser = this._getParser(source);
      const detail = await parser.getBookDetail(url);
      
      logger.info(`获取书籍详情成功: ${detail.name || url}`);
      
      // 更新书源使用统计
      try {
        source.usageCount = (source.usageCount || 0) + 1;
        source.lastUsed = new Date();
        await source.save();
      } catch (error) {
        logger.error(`更新书源使用统计失败: ${source.name}`, error);
      }
      
      return detail;
    } catch (error) {
      logger.error(`获取书籍详情失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 获取章节列表
   * @param {string} url 章节列表页URL
   * @param {string} sourceName 书源名称
   * @returns {Promise<Array>} 章节列表
   */
  async getChapterList(url, sourceName) {
    // 确保书源管理器已初始化
    if (!bookSourceManager.initialized) {
      await bookSourceManager.initialize();
    }

    const source = bookSourceManager.getSourceByName(sourceName);
    if (!source) {
      throw new Error(`未找到书源: ${sourceName}`);
    }

    try {
      const parser = this._getParser(source);
      const chapters = await parser.getChapterList(url);
      
      logger.info(`获取章节列表成功: ${url}, 共${chapters.length}章`);
      return chapters;
    } catch (error) {
      logger.error(`获取章节列表失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 获取章节内容
   * @param {string} url 章节内容页URL
   * @param {string} sourceName 书源名称
   * @returns {Promise<Object>} 章节内容
   */
  async getChapterContent(url, sourceName) {
    // 确保书源管理器已初始化
    if (!bookSourceManager.initialized) {
      await bookSourceManager.initialize();
    }

    const source = bookSourceManager.getSourceByName(sourceName);
    if (!source) {
      throw new Error(`未找到书源: ${sourceName}`);
    }

    try {
      const parser = this._getParser(source);
      const content = await parser.getChapterContent(url);
      
      logger.info(`获取章节内容成功: ${url}, 长度: ${content.content.length}`);
      return content;
    } catch (error) {
      logger.error(`获取章节内容失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 搜索并获取完整书籍信息
   * @param {string} keyword 搜索关键词
   * @param {Object} options 选项
   * @returns {Promise<Array>} 完整书籍信息
   */
  async searchAndGetBookInfo(keyword, options = {}) {
    const {
      sourceNames = [],
      timeout = 30000,
      fetchDetails = false,
      maxResults = 10
    } = options;

    // 搜索书籍
    const searchResults = await this.searchBooks(keyword, sourceNames, timeout);
    
    // 如果不需要获取详情，则直接返回搜索结果
    if (!fetchDetails) {
      return searchResults.slice(0, maxResults);
    }

    // 并行获取前N个结果的详情
    const detailPromises = searchResults.slice(0, maxResults).map(async (book) => {
      try {
        const detail = await this.getBookDetail(book.detail, book.source);
        return {
          ...book,
          ...detail,
          source: book.source,
          sourceUrl: book.sourceUrl
        };
      } catch (error) {
        logger.error(`获取书籍 ${book.name} 详情失败`, error);
        return book; // 失败时返回原始信息
      }
    });

    const booksWithDetails = await Promise.all(detailPromises);
    logger.info(`已获取${booksWithDetails.length}本书的详细信息`);
    
    return booksWithDetails;
  }
  
  /**
   * 清除解析器缓存
   */
  clearParserCache() {
    this.parserCache.clear();
    logger.info('已清除书源解析器缓存');
  }
}

// 单例模式
const bookSearchService = new BookSearchService();

module.exports = bookSearchService; 