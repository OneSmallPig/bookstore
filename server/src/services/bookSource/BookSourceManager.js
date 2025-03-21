const fs = require('fs').promises;
const path = require('path');
const BookSourceMySQL = require('../../models/bookSource/BookSourceMySQL');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

/**
 * 书源管理器 - MySQL版本
 * 负责加载、保存和管理书源
 */
class BookSourceManager {
  constructor() {
    this.sources = new Map(); // 使用Map存储书源，键为书源名称
    this.initialized = false;
  }

  /**
   * 初始化书源管理器
   */
  async initialize() {
    try {
      if (this.initialized) return;
      
      // 从MySQL中加载所有书源
      const sources = await BookSourceMySQL.findAll();
      
      // 清空现有书源
      this.sources.clear();
      
      // 将书源添加到内存中
      sources.forEach(source => {
        const plainSource = source.get({ plain: true });
        this.sources.set(plainSource.name, plainSource);
      });
      
      logger.info(`已加载 ${this.sources.size} 个书源`);
      this.initialized = true;
      
    } catch (error) {
      logger.error('初始化书源管理器失败', error);
      throw error;
    }
  }

  /**
   * 获取所有书源
   * @returns {Array} 书源数组
   */
  getAllSources() {
    return Array.from(this.sources.values());
  }

  /**
   * 获取指定分组的书源
   * @param {string} group 分组名称
   * @returns {Array} 书源数组
   */
  getSourcesByGroup(group) {
    return this.getAllSources().filter(source => source.group === group);
  }

  /**
   * 获取指定名称的书源
   * @param {string} name 书源名称
   * @returns {Object} 书源对象
   */
  getSourceByName(name) {
    return this.sources.get(name);
  }

  /**
   * 添加或更新书源
   * @param {Object} sourceData 书源数据
   * @returns {Object} 书源对象，包含isNew字段表示是否为新增
   */
  async addOrUpdateSource(sourceData) {
    try {
      // 确保初始化
      if (!this.initialized) {
        await this.initialize();
      }
      
      const { name } = sourceData;
      
      // 优化: 先从内存中检查书源是否存在
      const existingInMemory = this.sources.get(name);
      const isNew = !existingInMemory;
      
      // 创建或更新书源对象
      try {
        // 使用upsert操作，减少数据库查询次数
        const [source, created] = await BookSourceMySQL.upsert(sourceData, {
          returning: true
        });
        
        // 获取纯对象表示
        const plainSource = source.get({ plain: true });
        
        // 更新内存中的书源
        this.sources.set(name, plainSource);
        
        // 记录日志
        logger.info(`书源 ${name} 已${created ? '添加' : '更新'}`);
        
        // 添加isNew字段以便知道是新增还是更新
        plainSource.isNew = created;
        
        return plainSource;
      } catch (dbError) {
        // 处理数据库错误
        logger.error(`数据库操作失败: ${dbError.message}`);
        throw new Error(`保存书源到MySQL数据库失败: ${dbError.message}`);
      }
    } catch (error) {
      logger.error(`添加或更新书源 ${sourceData.name} 失败:`, error);
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
      // 确保初始化
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 检查书源是否存在
      if (!this.sources.has(name)) {
        return false;
      }
      
      // 从数据库中删除
      const deletedCount = await BookSourceMySQL.destroy({
        where: { name }
      });
      
      // 从内存中删除
      if (deletedCount > 0) {
        this.sources.delete(name);
        logger.info(`已删除书源: ${name}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`删除书源失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 设置书源启用状态
   * @param {string} name 书源名称
   * @param {boolean} enabled 是否启用
   * @returns {Object} 更新后的书源对象
   */
  async setSourceEnabled(name, enabled) {
    try {
      // 确保初始化
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 检查书源是否存在
      const source = this.getSourceByName(name);
      if (!source) {
        return null;
      }
      
      // 更新数据库
      await BookSourceMySQL.update(
        { enabled },
        { where: { name } }
      );
      
      // 更新内存中的书源
      source.enabled = enabled;
      
      logger.info(`书源 ${name} 已${enabled ? '启用' : '禁用'}`);
      
      return source;
    } catch (error) {
      logger.error(`设置书源状态失败: ${name}`, error);
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
   * @returns {string} 书源JSON字符串
   */
  async exportSources(names = []) {
    try {
      // 确保初始化
      if (!this.initialized) {
        await this.initialize();
      }
      
      let sources;
      
      if (names && names.length > 0) {
        // 导出指定的书源
        sources = names.map(name => this.getSourceByName(name)).filter(Boolean);
      } else {
        // 导出所有书源
        sources = this.getAllSources();
      }
      
      // 转换为JSON字符串
      return JSON.stringify(sources, null, 2);
    } catch (error) {
      logger.error('导出书源失败', error);
      throw error;
    }
  }
}

// 导出单例
module.exports = new BookSourceManager(); 