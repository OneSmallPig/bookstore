const bookSourceManager = require('../../services/bookSource/BookSourceManager');
const bookSearchService = require('../../services/bookSource/BookSearchService');
const importTaskManager = require('../../services/bookSource/ImportTaskManager');
const logger = require('../../utils/logger');

/**
 * 书源管理控制器
 */
class BookSourceController {
  /**
   * 获取所有书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getAllSources(req, res) {
    try {
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const sources = bookSourceManager.getAllSources();
      
      res.json({
        success: true,
        data: sources
      });
    } catch (error) {
      logger.error('获取所有书源失败', error);
      res.status(500).json({
        success: false,
        message: '获取书源失败',
        error: error.message
      });
    }
  }

  /**
   * 获取书源分组
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getSourceGroups(req, res) {
    try {
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const sources = bookSourceManager.getAllSources();
      const groups = [...new Set(sources.map(source => source.group))];
      
      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      logger.error('获取书源分组失败', error);
      res.status(500).json({
        success: false,
        message: '获取书源分组失败',
        error: error.message
      });
    }
  }

  /**
   * 获取指定分组的书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getSourcesByGroup(req, res) {
    try {
      const { group } = req.params;
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const sources = bookSourceManager.getSourcesByGroup(group);
      
      res.json({
        success: true,
        data: sources
      });
    } catch (error) {
      logger.error(`获取分组 ${req.params.group} 的书源失败`, error);
      res.status(500).json({
        success: false,
        message: '获取分组书源失败',
        error: error.message
      });
    }
  }

  /**
   * 获取指定名称的书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getSourceByName(req, res) {
    try {
      const { name } = req.params;
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const source = bookSourceManager.getSourceByName(name);
      
      if (!source) {
        return res.status(404).json({
          success: false,
          message: `未找到书源: ${name}`
        });
      }
      
      res.json({
        success: true,
        data: source
      });
    } catch (error) {
      logger.error(`获取书源 ${req.params.name} 失败`, error);
      res.status(500).json({
        success: false,
        message: '获取书源失败',
        error: error.message
      });
    }
  }

  /**
   * 添加或更新书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async addOrUpdateSource(req, res) {
    try {
      const sourceData = req.body;
      
      if (!sourceData || !sourceData.name || !sourceData.url) {
        return res.status(400).json({
          success: false,
          message: '无效的书源数据，必须提供name和url'
        });
      }
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const source = await bookSourceManager.addOrUpdateSource(sourceData);
      
      res.json({
        success: true,
        message: `书源 ${source.name} 已${source.isNew ? '添加' : '更新'}`,
        data: source
      });
    } catch (error) {
      logger.error('添加或更新书源失败', error);
      res.status(500).json({
        success: false,
        message: '添加或更新书源失败',
        error: error.message
      });
    }
  }

  /**
   * 删除书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async deleteSource(req, res) {
    try {
      const { name } = req.params;
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const success = await bookSourceManager.deleteSource(name);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: `未找到书源: ${name}`
        });
      }
      
      res.json({
        success: true,
        message: `书源 ${name} 已删除`
      });
    } catch (error) {
      logger.error(`删除书源 ${req.params.name} 失败`, error);
      res.status(500).json({
        success: false,
        message: '删除书源失败',
        error: error.message
      });
    }
  }

  /**
   * 启用或禁用书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async setSourceEnabled(req, res) {
    try {
      const { name } = req.params;
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'enabled必须是一个布尔值'
        });
      }
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const source = await bookSourceManager.setSourceEnabled(name, enabled);
      
      if (!source) {
        return res.status(404).json({
          success: false,
          message: `未找到书源: ${name}`
        });
      }
      
      res.json({
        success: true,
        message: `书源 ${name} 已${enabled ? '启用' : '禁用'}`,
        data: source
      });
    } catch (error) {
      logger.error(`设置书源 ${req.params.name} 状态失败`, error);
      res.status(500).json({
        success: false,
        message: '设置书源状态失败',
        error: error.message
      });
    }
  }

  /**
   * 导入书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async importSources(req, res) {
    try {
      const { sources } = req.body;
      
      if (!sources) {
        return res.status(400).json({
          success: false,
          message: '无效的书源数据'
        });
      }
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const count = await bookSourceManager.importSources(sources);
      
      res.json({
        success: true,
        message: `已成功导入${count}个书源`,
        data: { count }
      });
    } catch (error) {
      logger.error('导入书源失败', error);
      res.status(500).json({
        success: false,
        message: '导入书源失败',
        error: error.message
      });
    }
  }

  /**
   * 批量导入书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async batchImportSources(req, res) {
    try {
      const { sources, options } = req.body;
      
      if (!sources || !Array.isArray(sources) || sources.length === 0) {
        return res.status(400).json({
          success: false,
          message: '无效的书源数据，必须提供书源数组'
        });
      }
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      // 创建导入任务
      const taskId = importTaskManager.createTask(sources, options);
      
      // 启动异步处理 - 将函数和所有参数传递给独立的处理函数
      setImmediate(() => processBatchImportStatic(taskId, sources, options, importTaskManager, bookSourceManager));
      
      // 立即返回任务ID
      res.json({
        success: true,
        message: `已创建批量导入任务，共 ${sources.length} 个书源`,
        data: {
          taskId,
          total: sources.length
        }
      });
    } catch (error) {
      logger.error('创建批量导入任务失败', error);
      res.status(500).json({
        success: false,
        message: '创建批量导入任务失败',
        error: error.message
      });
    }
  }
  
  /**
   * 异步处理批量导入
   * @param {String} taskId 任务ID
   * @param {Array} sources 书源数组
   * @param {Object} options 导入选项
   */
  async processBatchImport(taskId, sources, options) {
    try {
      // 标记任务为处理中
      importTaskManager.startProcessing(taskId);
      
      // 提取选项
      const overwriteExisting = options?.overwriteExisting || false;
      const enableAfterImport = options?.enableAfterImport || true;
      
      // 批量处理书源
      for (const source of sources) {
        try {
          // 检查书源是否存在
          const existingSource = bookSourceManager.getSourceByName(source.name);
          
          // 如果书源存在且不允许覆盖，则跳过
          if (existingSource && !overwriteExisting) {
            importTaskManager.addSourceResult(
              taskId, 
              source, 
              false, 
              `跳过已存在的书源: ${source.name}`
            );
            continue;
          }
          
          // 确保启用状态
          if (enableAfterImport !== undefined) {
            source.enabled = enableAfterImport;
          }
          
          // 添加或更新书源
          await bookSourceManager.addOrUpdateSource(source);
          
          importTaskManager.addSourceResult(
            taskId, 
            source, 
            true, 
            `成功导入书源: ${source.name}`
          );
        } catch (error) {
          logger.error(`导入书源 ${source.name || '未知'} 失败`, error);
          
          importTaskManager.addSourceResult(
            taskId, 
            source, 
            false, 
            `导入失败: ${error.message}`
          );
        }
      }
      
      // 标记任务为已完成
      importTaskManager.completeTask(taskId);
      logger.info(`批量导入任务 ${taskId} 完成`);
      
    } catch (error) {
      logger.error(`批量导入任务 ${taskId} 失败`, error);
      importTaskManager.failTask(taskId, error);
    }
  }

  /**
   * 获取批量导入任务进度
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getImportTaskProgress(req, res) {
    try {
      const { taskId } = req.params;
      
      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: '必须提供任务ID'
        });
      }
      
      const task = importTaskManager.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: `未找到任务: ${taskId}`
        });
      }
      
      res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          total: task.total,
          processed: task.processed,
          success: task.success,
          failed: task.failed,
          progress: task.progress || 0,
          details: task.details.slice(-10), // 只返回最近的10条详情
          error: task.error
        }
      });
    } catch (error) {
      logger.error('获取导入任务进度失败', error);
      res.status(500).json({
        success: false,
        message: '获取导入任务进度失败',
        error: error.message
      });
    }
  }

  /**
   * 导出书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async exportSources(req, res) {
    try {
      const { names } = req.body || {};
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      const jsonStr = await bookSourceManager.exportSources(names || []);
      
      res.json({
        success: true,
        data: JSON.parse(jsonStr)
      });
    } catch (error) {
      logger.error('导出书源失败', error);
      res.status(500).json({
        success: false,
        message: '导出书源失败',
        error: error.message
      });
    }
  }

  /**
   * 搜索书籍
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async searchBooks(req, res) {
    try {
      const { keyword, sourceNames, timeout, fetchDetails, maxResults } = req.query;
      
      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: '必须提供搜索关键词'
        });
      }
      
      // 解析参数
      const options = {
        sourceNames: sourceNames ? sourceNames.split(',') : [],
        timeout: timeout ? parseInt(timeout) : 30000,
        fetchDetails: fetchDetails === 'true',
        maxResults: maxResults ? parseInt(maxResults) : 10
      };
      
      const results = await bookSearchService.searchAndGetBookInfo(keyword, options);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('搜索书籍失败', error);
      res.status(500).json({
        success: false,
        message: '搜索书籍失败',
        error: error.message
      });
    }
  }

  /**
   * 获取书籍详情
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getBookDetail(req, res) {
    try {
      const { url, sourceName } = req.query;
      
      if (!url || !sourceName) {
        return res.status(400).json({
          success: false,
          message: '必须提供书籍URL和书源名称'
        });
      }
      
      const detail = await bookSearchService.getBookDetail(url, sourceName);
      
      res.json({
        success: true,
        data: detail
      });
    } catch (error) {
      logger.error('获取书籍详情失败', error);
      res.status(500).json({
        success: false,
        message: '获取书籍详情失败',
        error: error.message
      });
    }
  }

  /**
   * 获取章节列表
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getChapterList(req, res) {
    try {
      const { url, sourceName } = req.query;
      
      if (!url || !sourceName) {
        return res.status(400).json({
          success: false,
          message: '必须提供章节列表URL和书源名称'
        });
      }
      
      const chapters = await bookSearchService.getChapterList(url, sourceName);
      
      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      logger.error('获取章节列表失败', error);
      res.status(500).json({
        success: false,
        message: '获取章节列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取章节内容
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getChapterContent(req, res) {
    try {
      const { url, sourceName } = req.query;
      
      if (!url || !sourceName) {
        return res.status(400).json({
          success: false,
          message: '必须提供章节URL和书源名称'
        });
      }
      
      const content = await bookSearchService.getChapterContent(url, sourceName);
      
      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      logger.error('获取章节内容失败', error);
      res.status(500).json({
        success: false,
        message: '获取章节内容失败',
        error: error.message
      });
    }
  }

  /**
   * 测试书源功能
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async testBookSource(req, res) {
    try {
      const { sourceName, keyword, bookUrl, chapterUrl, type } = req.body;
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      // 获取书源
      const sourceData = bookSourceManager.getSourceByName(sourceName);
      if (!sourceData) {
        return res.status(404).json({
          success: false,
          message: `未找到书源: ${sourceName}`
        });
      }
      
      // 创建临时解析器进行测试
      const BookSourceParser = require('../../services/bookSource/BookSourceParser');
      const parser = new BookSourceParser(sourceData);
      
      // 根据请求类型执行不同的测试
      if (type === 'search' && keyword) {
        // 测试搜索功能
        const searchResults = await parser.search(keyword);
        
        return res.json({
          success: searchResults && searchResults.length > 0,
          message: searchResults && searchResults.length > 0 ? '搜索成功' : '搜索失败：未找到匹配结果',
          data: searchResults || []
        });
      } 
      else if (type === 'detail' && bookUrl) {
        // 测试获取书籍详情
        const detail = await parser.getBookDetail(bookUrl);
        
        return res.json({
          success: !!detail,
          message: detail ? '获取书籍详情成功' : '获取书籍详情失败',
          data: detail || null
        });
      } 
      else if (type === 'chapters' && chapterUrl) {
        // 测试获取章节列表
        const chapters = await parser.getChapterList(chapterUrl);
        
        return res.json({
          success: chapters && chapters.length > 0,
          message: chapters && chapters.length > 0 ? '获取章节列表成功' : '获取章节列表失败',
          data: chapters || []
        });
      } 
      else if (type === 'content' && chapterUrl) {
        // 测试获取章节内容
        const content = await parser.getChapterContent(chapterUrl);
        
        return res.json({
          success: !!content,
          message: content ? '获取章节内容成功' : '获取章节内容失败',
          data: content || null
        });
      }
      else {
        // 默认执行完整测试
        const testKeyword = keyword || '天才';
        
        // 测试搜索功能
        const searchResults = await parser.search(testKeyword);
        
        // 如果没有搜索结果，直接返回测试失败
        if (!searchResults || searchResults.length === 0) {
          return res.json({
            success: false,
            message: '测试失败：未找到搜索结果',
            data: { searchResults: [] }
          });
        }
        
        // 测试获取书籍详情
        const detail = await parser.getBookDetail(searchResults[0].detail);
        
        // 测试获取章节列表
        const chaptersUrl = detail.chapterUrl || detail.detailUrl;
        const chapters = await parser.getChapterList(chaptersUrl);
        
        // 测试获取章节内容
        let content = null;
        if (chapters && chapters.length > 0) {
          content = await parser.getChapterContent(chapters[0].url);
        }
        
        return res.json({
          success: true,
          message: '书源测试成功',
          data: {
            searchResults,
            detail,
            chapters: chapters ? chapters.slice(0, 5) : [],
            content
          }
        });
      }
    } catch (error) {
      logger.error('测试书源失败', error);
      res.status(500).json({
        success: false,
        message: '测试书源失败',
        error: error.message
      });
    }
  }
}

// 然后在类外部或类内部定义静态处理函数
async function processBatchImportStatic(taskId, sources, options, taskManager, sourceManager) {
  try {
    // 标记任务为处理中
    taskManager.startProcessing(taskId);
    
    // 提取选项
    const overwriteExisting = options?.overwriteExisting || false;
    const enableAfterImport = options?.enableAfterImport || true;
    
    // 批量处理书源
    for (const source of sources) {
      try {
        // 检查书源是否存在
        const existingSource = sourceManager.getSourceByName(source.name);
        
        // 如果书源存在且不允许覆盖，则跳过
        if (existingSource && !overwriteExisting) {
          taskManager.addSourceResult(
            taskId, 
            source, 
            false, 
            `跳过已存在的书源`
          );
          continue;
        }
        
        // 确保启用状态
        if (enableAfterImport !== undefined) {
          source.enabled = enableAfterImport;
        }
        
        // 添加或更新书源
        await sourceManager.addOrUpdateSource(source);
        
        taskManager.addSourceResult(
          taskId, 
          source, 
          true, 
          `成功导入`
        );
      } catch (error) {
        logger.error(`导入书源 ${source.name || '未知'} 失败`, error);
        
        taskManager.addSourceResult(
          taskId, 
          source, 
          false, 
          `导入失败: ${error.message}`
        );
      }
    }
    
    // 标记任务为已完成
    taskManager.completeTask(taskId);
    logger.info(`批量导入任务 ${taskId} 完成`);
    
  } catch (error) {
    logger.error(`批量导入任务 ${taskId} 失败`, error);
    taskManager.failTask(taskId, error);
  }
}

module.exports = new BookSourceController(); 