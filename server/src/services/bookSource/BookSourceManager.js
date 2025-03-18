const fs = require('fs').promises;
const path = require('path');
const BookSource = require('../../models/bookSource/BookSource');
const logger = require('../../utils/logger');
const mongoose = require('mongoose');

/**
 * 书源管理器
 * 负责加载、保存和管理书源
 */
class BookSourceManager {
  constructor() {
    this.sources = new Map(); // 使用Map存储书源，键为书源名称
    this.initialized = false;
  }

  /**
   * 初始化书源管理器
   * 从数据库和文件加载书源
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // 设置超时，防止无限期挂起
      const timeout = setTimeout(() => {
        if (!this.initialized) {
          logger.warn('书源管理器初始化超时，将使用默认书源');
          this._loadFromExampleFile()
            .then(() => {
              this.initialized = true;
              logger.info(`使用默认书源完成，已加载${this.sources.size}个书源`);
            })
            .catch(err => {
              logger.error('加载默认书源失败', err);
              // 即使加载默认书源失败，我们也标记为已初始化，避免卡住整个应用
              this.initialized = true;
            });
        }
      }, 15000); // 15秒超时

      try {
        // 从数据库加载书源
        await this._loadFromDatabase();
        
        // 如果数据库中没有书源，则从示例文件加载
        if (this.sources.size === 0) {
          await this._loadFromExampleFile();
        }
        
        clearTimeout(timeout); // 清除超时
        
        logger.info(`已成功加载${this.sources.size}个书源`);
        this.initialized = true;
      } catch (dbError) {
        logger.error('从数据库加载书源失败', dbError);
        
        // 尝试从示例文件加载
        try {
          await this._loadFromExampleFile();
          logger.info(`使用备用方案：已从示例文件加载${this.sources.size}个书源`);
        } catch (fileError) {
          logger.error('从示例文件加载书源失败', fileError);
          // 创建一个基本的内存书源，至少让应用能继续运行
          this._createBasicMemorySource();
        }
        
        clearTimeout(timeout); // 清除超时
        this.initialized = true;
      }
    } catch (error) {
      logger.error('初始化书源管理器失败', error);
      // 即使出错，我们也标记为已初始化，避免卡住整个应用
      this.initialized = true;
      throw error;
    }
  }

  /**
   * 从数据库加载书源
   */
  async _loadFromDatabase() {
    try {
      // 确保已经建立MongoDB连接
      if (mongoose?.connection?.readyState !== 1) {
        logger.warn('MongoDB未连接，无法从数据库加载书源');
        return;
      }
      
      const sources = await BookSource.find({ enabled: true });
      
      if (!sources || sources.length === 0) {
        logger.warn('数据库中没有启用的书源');
        return;
      }
      
      sources.forEach(source => {
        this.sources.set(source.name, source);
      });
      
      logger.info(`从数据库加载了${sources.length}个书源`);
    } catch (error) {
      logger.error('从数据库加载书源失败', error);
      throw error;
    }
  }

  /**
   * 从示例文件加载书源
   */
  async _loadFromExampleFile() {
    try {
      const exampleFilePath = path.join(__dirname, '../../data/bookSourceExample.json');
      const data = await fs.readFile(exampleFilePath, 'utf8');
      const sources = JSON.parse(data);
      
      // 将示例书源保存到数据库
      for (const sourceData of sources) {
        const source = new BookSource(sourceData);
        await source.save();
        this.sources.set(source.name, source);
      }
      
      logger.info(`从示例文件加载并保存了${sources.length}个书源到数据库`);
    } catch (error) {
      logger.error('从示例文件加载书源失败', error);
      
      // 如果文件不存在或解析失败，创建一个空的示例文件
      if (error.code === 'ENOENT') {
        try {
          const dirPath = path.join(__dirname, '../../data');
          await fs.mkdir(dirPath, { recursive: true });
          await fs.writeFile(
            path.join(dirPath, 'bookSourceExample.json'),
            '[]',
            'utf8'
          );
          logger.info('创建了空的书源示例文件');
        } catch (mkdirError) {
          logger.error('创建书源示例文件失败', mkdirError);
        }
      }
      
      throw error;
    }
  }

  /**
   * 创建基本的内存书源（作为最后的回退选项）
   * @private
   */
  _createBasicMemorySource() {
    try {
      // 内存中创建一个简单的书源，至少让系统能工作
      const basicSource = {
        name: '默认内存书源',
        url: 'https://www.example.com',
        version: 1,
        enabled: true,
        group: '默认',
        searchUrl: 'https://www.example.com/search?q={keyword}',
        searchList: '.book-list .book-item',
        searchName: '.book-title',
        searchDetail: '.book-link',
        chapterList: '.chapter-list .chapter-item',
        chapterName: '.chapter-title',
        chapterLink: '.chapter-link',
        contentRule: '.content-text'
      };
      
      this.sources.set(basicSource.name, basicSource);
      logger.info('创建了基本内存书源作为回退方案');
    } catch (error) {
      logger.error('创建基本内存书源失败', error);
    }
  }

  /**
   * 获取所有书源
   * @returns {Array} 书源列表
   */
  getAllSources() {
    return Array.from(this.sources.values());
  }

  /**
   * 根据名称获取书源
   * @param {string} name 书源名称
   * @returns {Object|null} 书源对象或null
   */
  getSourceByName(name) {
    return this.sources.get(name) || null;
  }

  /**
   * 根据URL获取书源
   * @param {string} url 书源URL
   * @returns {Object|null} 书源对象或null
   */
  getSourceByUrl(url) {
    for (const source of this.sources.values()) {
      if (source.url === url) {
        return source;
      }
    }
    return null;
  }

  /**
   * 根据分组获取书源
   * @param {string} group 书源分组
   * @returns {Array} 书源列表
   */
  getSourcesByGroup(group) {
    const result = [];
    for (const source of this.sources.values()) {
      if (source.group === group) {
        result.push(source);
      }
    }
    return result;
  }

  /**
   * 添加或更新书源
   * @param {Object} sourceData 书源数据
   * @returns {Object} 保存后的书源对象
   */
  async addOrUpdateSource(sourceData) {
    try {
      let source = await BookSource.findOne({ name: sourceData.name });
      
      if (source) {
        // 更新现有书源
        Object.assign(source, sourceData);
        source = await source.save();
        logger.info(`更新书源: ${source.name}`);
      } else {
        // 创建新书源
        source = new BookSource(sourceData);
        source = await source.save();
        logger.info(`添加新书源: ${source.name}`);
      }
      
      // 更新内存中的书源
      this.sources.set(source.name, source);
      
      return source;
    } catch (error) {
      logger.error(`添加或更新书源失败: ${sourceData.name}`, error);
      throw error;
    }
  }

  /**
   * 删除书源
   * @param {string} name 书源名称
   * @returns {boolean} 是否成功删除
   */
  async deleteSource(name) {
    try {
      const result = await BookSource.deleteOne({ name });
      
      if (result.deletedCount > 0) {
        // 从内存中移除
        this.sources.delete(name);
        logger.info(`删除书源: ${name}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`删除书源失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 启用或禁用书源
   * @param {string} name 书源名称
   * @param {boolean} enabled 是否启用
   * @returns {Object|null} 更新后的书源对象或null
   */
  async setSourceEnabled(name, enabled) {
    try {
      const source = await BookSource.findOne({ name });
      
      if (!source) {
        return null;
      }
      
      source.enabled = enabled;
      await source.save();
      
      // 更新内存中的书源
      if (enabled) {
        this.sources.set(name, source);
      } else {
        this.sources.delete(name);
      }
      
      logger.info(`${enabled ? '启用' : '禁用'}书源: ${name}`);
      return source;
    } catch (error) {
      logger.error(`${enabled ? '启用' : '禁用'}书源失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 导入书源
   * @param {string|Array} sourceData JSON字符串或对象数组
   * @returns {number} 成功导入的书源数量
   */
  async importSources(sourceData) {
    try {
      let sources;
      
      if (typeof sourceData === 'string') {
        sources = JSON.parse(sourceData);
      } else if (Array.isArray(sourceData)) {
        sources = sourceData;
      } else {
        throw new Error('无效的书源数据格式');
      }
      
      let successCount = 0;
      
      for (const source of sources) {
        try {
          await this.addOrUpdateSource(source);
          successCount++;
        } catch (error) {
          logger.error(`导入书源失败: ${source.name}`, error);
        }
      }
      
      logger.info(`成功导入${successCount}个书源，总共${sources.length}个`);
      return successCount;
    } catch (error) {
      logger.error('导入书源失败', error);
      throw error;
    }
  }

  /**
   * 导出书源
   * @param {Array} names 要导出的书源名称数组，为空则导出所有
   * @returns {string} 包含书源的JSON字符串
   */
  async exportSources(names = []) {
    try {
      let sources;
      
      if (names.length === 0) {
        sources = await BookSource.find({});
      } else {
        sources = await BookSource.find({ name: { $in: names } });
      }
      
      logger.info(`导出${sources.length}个书源`);
      return JSON.stringify(sources, null, 2);
    } catch (error) {
      logger.error('导出书源失败', error);
      throw error;
    }
  }
  
  /**
   * 重新加载所有书源
   */
  async reloadSources() {
    try {
      this.sources.clear();
      await this._loadFromDatabase();
      logger.info('重新加载书源完成');
    } catch (error) {
      logger.error('重新加载书源失败', error);
      throw error;
    }
  }
}

// 单例模式
const bookSourceManager = new BookSourceManager();

module.exports = bookSourceManager; 