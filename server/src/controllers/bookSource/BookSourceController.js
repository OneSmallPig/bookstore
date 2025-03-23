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
   * 切换书源状态（启用/禁用）
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async toggleSource(req, res) {
    try {
      const { name, enabled } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: '必须提供书源名称'
        });
      }
      
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
      logger.error(`切换书源状态失败`, error);
      res.status(500).json({
        success: false,
        message: '切换书源状态失败',
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
      
      logger.info(`开始测试书源: ${sourceName}, 类型: ${type || '完整测试'}, 关键词: "${keyword || '天才'}"`);
      
      // 确保书源管理器已初始化
      if (!bookSourceManager.initialized) {
        await bookSourceManager.initialize();
      }
      
      // 获取书源
      const sourceData = bookSourceManager.getSourceByName(sourceName);
      if (!sourceData) {
        logger.warn(`测试失败: 未找到书源 "${sourceName}"`);
        return res.status(404).json({
          success: false,
          message: `未找到书源: ${sourceName}`
        });
      }
      
      logger.info(`找到书源: ${sourceName}, 规则配置: ${JSON.stringify({
        search: !!sourceData.searchUrl,
        detail: !!sourceData.detailName,
        chapter: !!sourceData.chapterList,
        content: !!sourceData.contentRule
      })}`);
      
      // 创建临时解析器进行测试
      const BookSourceParser = require('../../services/bookSource/BookSourceParser');
      const parser = new BookSourceParser(sourceData);
      
      // 根据请求类型执行不同的测试
      if (type === 'search' && keyword) {
        // 测试搜索功能
        logger.info(`执行搜索测试, 关键词: "${keyword}"`);
        const searchResults = await parser.search(keyword, true);
        
        logger.info(`搜索测试完成, 结果数量: ${searchResults ? searchResults.length : 0}`);
        
        return res.json({
          success: searchResults && searchResults.length > 0,
          message: searchResults && searchResults.length > 0 ? '搜索成功' : '搜索失败：未找到匹配结果',
          data: searchResults || []
        });
      } 
      else if (type === 'detail' && bookUrl) {
        // 测试获取书籍详情
        logger.info(`执行书籍详情测试, URL: ${bookUrl}`);
        const detail = await parser.getBookDetail(bookUrl, true);
        
        logger.info(`详情测试完成, 结果: ${detail ? '成功' : '失败'}`);
        if (detail) {
          logger.info(`书籍信息: 书名="${detail.name}", 作者="${detail.author}", 分类="${detail.category}"`);
        }
        
        return res.json({
          success: !!detail,
          message: detail ? '获取书籍详情成功' : '获取书籍详情失败',
          data: detail || null
        });
      } 
      else if (type === 'chapters' && chapterUrl) {
        // 测试获取章节列表
        logger.info(`执行章节列表测试, URL: ${chapterUrl}`);
        const chapters = await parser.getChapterList(chapterUrl, true);
        
        logger.info(`章节列表测试完成, 结果数量: ${chapters ? chapters.length : 0}`);
        if (chapters && chapters.length > 0) {
          logger.info(`前3章: ${chapters.slice(0, 3).map(c => c.title).join(', ')}`);
        }
        
        return res.json({
          success: chapters && chapters.length > 0,
          message: chapters && chapters.length > 0 ? '获取章节列表成功' : '获取章节列表失败',
          data: chapters || []
        });
      } 
      else if (type === 'content' && chapterUrl) {
        // 测试获取章节内容
        logger.info(`执行章节内容测试, URL: ${chapterUrl}`);
        const content = await parser.getChapterContent(chapterUrl, true);
        
        logger.info(`章节内容测试完成, 结果: ${content ? '成功' : '失败'}`);
        if (content && content.content) {
          const preview = content.content.substring(0, 100) + (content.content.length > 100 ? '...' : '');
          logger.info(`内容预览: ${preview}`);
        }
        
        return res.json({
          success: !!content,
          message: content ? '获取章节内容成功' : '获取章节内容失败',
          data: content || null
        });
      }
      else {
        // 默认执行完整测试
        const testKeyword = keyword || '天才';
        logger.info(`执行完整测试流程, 关键词: "${testKeyword}"`);
        
        // 测试搜索功能
        logger.info(`1. 开始搜索测试...`);
        const searchResults = await parser.search(testKeyword, true);
        
        // 如果没有搜索结果，直接返回测试失败
        if (!searchResults || searchResults.length === 0) {
          logger.warn(`搜索测试失败: 未找到结果`);
          return res.json({
            success: false,
            message: '测试失败：未找到搜索结果',
            data: { searchResults: [] }
          });
        }
        
        logger.info(`搜索测试成功, 找到 ${searchResults.length} 条结果`);
        
        // 测试获取书籍详情
        logger.info(`2. 开始书籍详情测试, URL: ${searchResults[0].detail}...`);
        const detail = await parser.getBookDetail(searchResults[0].detail, true);
        
        if (detail) {
          logger.info(`详情测试成功, 书名: "${detail.name}", 作者: "${detail.author}"`);
        } else {
          logger.warn(`详情测试失败`);
        }
        
        // 测试获取章节列表
        const chaptersUrl = detail ? (detail.chapterUrl || detail.detailUrl) : null;
        
        if (chaptersUrl) {
          logger.info(`3. 开始章节列表测试, URL: ${chaptersUrl}...`);
          const chapters = await parser.getChapterList(chaptersUrl, true);
          
          if (chapters && chapters.length > 0) {
            logger.info(`章节列表测试成功, 共 ${chapters.length} 章, 第一章: "${chapters[0].title}"`);
            
            // 测试获取章节内容
            logger.info(`4. 开始章节内容测试, URL: ${chapters[0].url}...`);
            const content = await parser.getChapterContent(chapters[0].url, true);
            
            if (content && content.content) {
              const preview = content.content.substring(0, 100) + (content.content.length > 100 ? '...' : '');
              logger.info(`章节内容测试成功, 内容预览: ${preview}`);
            } else {
              logger.warn(`章节内容测试失败`);
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
          } else {
            logger.warn(`章节列表测试失败: 未找到章节`);
          }
        } else {
          logger.warn(`无法获取章节列表URL`);
        }
        
        // 如果能获取到搜索结果和详情，但无法获取章节，也返回部分成功
        return res.json({
          success: !!detail,
          message: detail ? '书源测试部分成功（无法获取章节）' : '书源测试失败',
          data: {
            searchResults,
            detail,
            chapters: [],
            content: null
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

  /**
   * 批量测试书源
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async batchTestBookSources(req, res) {
    try {
      const { sourceNames, keyword } = req.body;
      
      if (!sourceNames || !Array.isArray(sourceNames) || sourceNames.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的书源名称列表'
        });
      }

      // 导入配置
      const config = require('../../config/config');

      // 生成唯一的任务ID
      const taskId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // 初始化任务状态
      const testTasks = {
        taskId,
        total: sourceNames.length,
        completed: 0,
        inProgress: true,
        results: {},
        startTime: new Date(),
        concurrency: config.bookSourceTest.concurrency, // 添加并发信息
        settings: {
          keyword: keyword || '天才',
          timeout: config.bookSourceTest.timeout
        }
      };
      
      // 存储任务状态（在生产环境中应该使用Redis或其他持久化存储）
      if (!global.testTasksStore) {
        global.testTasksStore = {};
      }
      global.testTasksStore[taskId] = testTasks;
      
      // 返回任务ID，允许客户端轮询进度
      res.json({
        success: true,
        message: '批量测试任务已提交',
        data: { 
          taskId,
          concurrency: config.bookSourceTest.concurrency,
          total: sourceNames.length
        }
      });
      
      // 异步执行测试，使用独立的静态函数避免this指向问题
      setImmediate(() => processBatchTestStatic(taskId, sourceNames, keyword, bookSourceManager));
    } catch (error) {
      logger.error('提交批量测试任务失败', error);
      res.status(500).json({
        success: false,
        message: '提交批量测试任务失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取批量测试任务进度
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getBatchTestProgress(req, res) {
    try {
      const { taskId } = req.params;
      
      if (!taskId || !global.testTasksStore || !global.testTasksStore[taskId]) {
        return res.status(404).json({
          success: false,
          message: '未找到测试任务'
        });
      }
      
      const taskStatus = global.testTasksStore[taskId];
      
      // 如果任务已完成且超过1小时，清理任务数据
      if (!taskStatus.inProgress) {
        const now = new Date();
        const taskEndTime = new Date(taskStatus.endTime || taskStatus.startTime);
        
        if ((now - taskEndTime) > 3600000) { // 1小时 = 3600000毫秒
          delete global.testTasksStore[taskId];
          return res.status(404).json({
            success: false,
            message: '测试任务已过期'
          });
        }
      }
      
      // 计算时间信息
      const startTime = new Date(taskStatus.startTime);
      const currentTime = taskStatus.endTime ? new Date(taskStatus.endTime) : new Date();
      const elapsedTime = Math.floor((currentTime - startTime) / 1000); // 秒
      
      // 计算进度和预估剩余时间
      const progress = Math.round((taskStatus.completed / taskStatus.total) * 100);
      
      // 估算剩余时间（如果进度大于0且任务仍在进行中）
      let estimatedTimeRemaining = null;
      if (progress > 0 && taskStatus.inProgress) {
        const timePerItem = elapsedTime / taskStatus.completed;
        const remainingItems = taskStatus.total - taskStatus.completed;
        estimatedTimeRemaining = Math.floor(timePerItem * remainingItems);
      }
      
      res.json({
        success: true,
        data: {
          taskId: taskStatus.taskId,
          total: taskStatus.total,
          completed: taskStatus.completed,
          inProgress: taskStatus.inProgress,
          progress: progress,
          elapsedTime: elapsedTime,
          estimatedTimeRemaining: estimatedTimeRemaining,
          concurrency: taskStatus.concurrency || 1, // 并发数
          settings: taskStatus.settings || {}, // 任务设置
          results: taskStatus.results,
          startTime: taskStatus.startTime,
          endTime: taskStatus.endTime
        }
      });
    } catch (error) {
      logger.error('获取测试任务进度失败', error);
      res.status(500).json({
        success: false,
        message: '获取测试任务进度失败',
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

/**
 * 静态函数：处理批量测试任务
 * @param {string} taskId 任务ID
 * @param {Array} sourceNames 书源名称列表
 * @param {string} keyword 搜索关键词
 * @param {Object} sourceManager 书源管理器实例
 */
async function processBatchTestStatic(taskId, sourceNames, keyword, sourceManager) {
  try {
    logger.info(`开始批量测试任务 ${taskId}，共 ${sourceNames.length} 个书源`);
    
    // 导入配置
    const config = require('../../config/config');
    const concurrency = config.bookSourceTest.concurrency;
    logger.info(`批量测试配置：并发数=${concurrency}，超时=${config.bookSourceTest.timeout}ms`);

    // 确保书源管理器已初始化
    if (!sourceManager.initialized) {
      await sourceManager.initialize();
    }
    
    const testKeyword = keyword || '天才';
    logger.info(`使用测试关键词: "${testKeyword}"`);
    
    // 创建书源队列
    const sourceQueue = [...sourceNames];
    const activePromises = new Map(); // 跟踪活动的Promise
    
    // 处理单个书源测试的函数
    async function processSource(sourceName) {
      try {
        logger.info(`开始测试书源: ${sourceName}`);
        
        // 获取书源
        const sourceData = sourceManager.getSourceByName(sourceName);
        if (!sourceData) {
          logger.warn(`无法找到书源: ${sourceName}`);
          global.testTasksStore[taskId].results[sourceName] = {
            success: false,
            message: `未找到书源: ${sourceName}`
          };
          return;
        }
        
        // 创建解析器
        const BookSourceParser = require('../../services/bookSource/BookSourceParser');
        const parser = new BookSourceParser(sourceData);
        
        // 测试搜索
        logger.info(`[${sourceName}] 执行搜索测试，关键词: "${testKeyword}"`);
        const startTime = Date.now();
        const searchResults = await parser.search(testKeyword, true);
        const searchTime = Date.now() - startTime;
        
        if (!searchResults || searchResults.length === 0) {
          logger.warn(`[${sourceName}] 搜索测试失败，未找到结果，耗时: ${searchTime}ms`);
          global.testTasksStore[taskId].results[sourceName] = {
            success: false,
            message: '搜索测试失败：未找到匹配结果',
            searchResults: [],
            testTime: searchTime
          };
        } else {
          // 测试成功，记录结果
          logger.info(`[${sourceName}] 搜索测试成功，找到 ${searchResults.length} 个结果，耗时: ${searchTime}ms`);
          global.testTasksStore[taskId].results[sourceName] = {
            success: true,
            message: '搜索测试成功',
            searchResults: searchResults,
            detail: null,
            chapters: [],
            testTime: searchTime
          };
          
          // 尝试获取书籍详情（如果有搜索结果）
          try {
            logger.info(`[${sourceName}] 执行详情测试，URL: ${searchResults[0].detail}`);
            const detailStartTime = Date.now();
            const detail = await parser.getBookDetail(searchResults[0].detail, true);
            const detailTime = Date.now() - detailStartTime;
            
            if (detail) {
              logger.info(`[${sourceName}] 详情测试成功，书名: "${detail.name}"，耗时: ${detailTime}ms`);
              global.testTasksStore[taskId].results[sourceName].detail = detail;
              global.testTasksStore[taskId].results[sourceName].message = '搜索和详情测试成功';
              global.testTasksStore[taskId].results[sourceName].testTime += detailTime;
              
              // 尝试获取章节列表
              try {
                const chapterUrl = detail.chapterUrl || detail.detailUrl;
                logger.info(`[${sourceName}] 执行章节列表测试，URL: ${chapterUrl}`);
                const chapterStartTime = Date.now();
                const chapters = await parser.getChapterList(chapterUrl, true);
                const chapterTime = Date.now() - chapterStartTime;
                
                if (chapters && chapters.length > 0) {
                  logger.info(`[${sourceName}] 章节列表测试成功，共 ${chapters.length} 章，耗时: ${chapterTime}ms`);
                  global.testTasksStore[taskId].results[sourceName].chapters = 
                    chapters.slice(0, 5); // 只保存前5章
                  global.testTasksStore[taskId].results[sourceName].message = 
                    '搜索、详情和章节列表测试成功';
                  global.testTasksStore[taskId].results[sourceName].testTime += chapterTime;
                } else {
                  logger.warn(`[${sourceName}] 章节列表测试失败，耗时: ${chapterTime}ms`);
                }
              } catch (err) {
                logger.error(`[${sourceName}] 获取章节列表失败: ${err.message}`, err);
              }
            } else {
              logger.warn(`[${sourceName}] 详情测试失败，耗时: ${detailTime}ms`);
            }
          } catch (err) {
            logger.error(`[${sourceName}] 获取书籍详情失败: ${err.message}`, err);
          }
        }
      } catch (err) {
        logger.error(`测试书源失败: ${sourceName}, 错误: ${err.message}`, err);
        global.testTasksStore[taskId].results[sourceName] = {
          success: false,
          message: `测试失败: ${err.message}`
        };
      }
      
      // 更新进度
      global.testTasksStore[taskId].completed++;
      logger.info(`完成书源测试: ${sourceName}，进度: ${global.testTasksStore[taskId].completed}/${global.testTasksStore[taskId].total}`);
    }
    
    // 调度函数：当有空闲线程时，分配新的书源进行测试
    async function scheduleNextSource() {
      // 如果有待处理的书源且活动Promise数量小于并发上限
      while (sourceQueue.length > 0 && activePromises.size < concurrency) {
        const sourceName = sourceQueue.shift();
        logger.info(`分配书源到测试线程: ${sourceName}，当前活动线程: ${activePromises.size}/${concurrency}`);
        const promise = processSource(sourceName);
        
        // 将Promise添加到活动Map中
        activePromises.set(sourceName, promise);
        
        // 设置Promise完成后的处理
        promise.then(() => {
          activePromises.delete(sourceName);
          // 递归调度下一个任务
          return scheduleNextSource();
        }).catch(error => {
          activePromises.delete(sourceName);
          logger.error(`处理书源 ${sourceName} 出错:`, error);
          global.testTasksStore[taskId].completed++;
          // 递归调度下一个任务
          return scheduleNextSource();
        });
      }
      
      // 如果所有书源都已分配且没有活动Promise，则所有任务已完成
      if (sourceQueue.length === 0 && activePromises.size === 0) {
        // 标记任务已完成
        global.testTasksStore[taskId].inProgress = false;
        global.testTasksStore[taskId].endTime = new Date();
        logger.info(`批量测试任务 ${taskId} 完成，总耗时: ${Math.floor((new Date() - new Date(global.testTasksStore[taskId].startTime)) / 1000)}秒`);
      }
    }
    
    // 开始调度处理
    await scheduleNextSource();
    
    // 等待所有活动的Promise完成（如果有）
    if (activePromises.size > 0) {
      logger.info(`等待 ${activePromises.size} 个剩余测试完成...`);
      await Promise.all(Array.from(activePromises.values()));
    }
    
  } catch (error) {
    logger.error(`批量测试任务处理失败: ${taskId}`, error);
    
    // 标记任务失败
    if (global.testTasksStore && global.testTasksStore[taskId]) {
      global.testTasksStore[taskId].inProgress = false;
      global.testTasksStore[taskId].error = error.message;
      global.testTasksStore[taskId].endTime = new Date();
    }
  }
}

module.exports = new BookSourceController(); 