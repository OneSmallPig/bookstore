const logger = require('../utils/logger');
const axios = require('axios');

// 有条件地导入 node-fetch
let fetch;
try {
  // 首先尝试使用全局fetch
  if (typeof global.fetch === 'function') {
    fetch = global.fetch;
    logger.info('使用全局fetch');
  } else {
    // 如果没有全局fetch，则使用node-fetch
    const nodeFetch = require('node-fetch');
    fetch = nodeFetch;
    logger.info('使用node-fetch');
  }
} catch (error) {
  // 如果node-fetch不可用，回退到axios
  logger.warn('fetch不可用，回退到axios: ' + error.message);
  fetch = async (url, options) => {
    const axiosOptions = {
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      data: options.body ? JSON.parse(options.body) : undefined,
      timeout: options.timeout || 30000,
      responseType: 'json'
    };
    
    try {
      const response = await axios(axiosOptions);
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        text: async () => JSON.stringify(response.data),
        json: async () => response.data
      };
    } catch (axiosError) {
      if (axiosError.response) {
        // 请求已发出，服务器返回状态码不在2xx范围内
        return {
          ok: false,
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          text: async () => JSON.stringify(axiosError.response.data),
          json: async () => axiosError.response.data
        };
      } else {
        // 请求未能发出
        throw new Error(`请求失败: ${axiosError.message}`);
      }
    }
  };
}

/**
 * AI服务
 * 提供与AI模型交互的功能
 */
class AIService {
  constructor(config = {}) {
    // 添加对火山方舟API支持
    this.apiKey = config.apiKey || process.env.VOLC_API_KEY || process.env.DEEPSEEK_API_KEY || 'mock-api-key';
    this.apiUrl = config.apiUrl || process.env.DEEPSEEK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    this.model = config.model || process.env.AI_MODEL || 'deepseek-r1-250120';
    this.useMockData = config.useMockData || process.env.USE_MOCK_DATA === 'true' || false;
    this.debugMode = config.debugMode || process.env.DEBUG_MODE === 'true' || false;
    
    // 存储活跃搜索会话的Map
    this.searchSessions = new Map();
    
    // 添加API调用统计
    this.apiCallStats = {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      lastCallTimestamp: null,
      errorTypes: {}
    };
    
    logger.info(`AI服务初始化完成 [模型: ${this.model}, 模拟数据: ${this.useMockData}]`);
    logger.info(`API URL: ${this.apiUrl}`);
    
    if (this.debugMode) {
      logger.debug(`API Key: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    }
    
    // 每小时记录一次调用统计
    setInterval(() => this._logApiCallStats(), 3600000);
  }
  
  /**
   * 记录API调用统计
   * @private
   */
  _logApiCallStats() {
    if (this.apiCallStats.totalCalls > 0) {
      logger.info(`===== AI API调用统计 =====`);
      logger.info(`总调用次数: ${this.apiCallStats.totalCalls}`);
      logger.info(`成功调用: ${this.apiCallStats.successCalls} (${(this.apiCallStats.successCalls / this.apiCallStats.totalCalls * 100).toFixed(2)}%)`);
      logger.info(`失败调用: ${this.apiCallStats.failedCalls} (${(this.apiCallStats.failedCalls / this.apiCallStats.totalCalls * 100).toFixed(2)}%)`);
      logger.info(`平均响应时间: ${this.apiCallStats.avgResponseTime.toFixed(2)}ms`);
      logger.info(`上次调用时间: ${this.apiCallStats.lastCallTimestamp ? new Date(this.apiCallStats.lastCallTimestamp).toLocaleString() : 'N/A'}`);
      
      if (Object.keys(this.apiCallStats.errorTypes).length > 0) {
        logger.info(`错误类型统计:`);
        for (const [errorType, count] of Object.entries(this.apiCallStats.errorTypes)) {
          logger.info(`  - ${errorType}: ${count} 次`);
        }
      }
    }
  }
  
  /**
   * 更新API调用统计
   * @param {boolean} success - 调用是否成功
   * @param {number} responseTime - 响应时间(ms)
   * @param {string} errorType - 错误类型(如果失败)
   * @private
   */
  _updateApiCallStats(success, responseTime, errorType = null) {
    this.apiCallStats.totalCalls++;
    this.apiCallStats.lastCallTimestamp = Date.now();
    
    if (success) {
      this.apiCallStats.successCalls++;
      this.apiCallStats.totalResponseTime += responseTime;
      this.apiCallStats.avgResponseTime = this.apiCallStats.totalResponseTime / this.apiCallStats.successCalls;
    } else {
      this.apiCallStats.failedCalls++;
      
      if (errorType) {
        if (!this.apiCallStats.errorTypes[errorType]) {
          this.apiCallStats.errorTypes[errorType] = 0;
        }
        this.apiCallStats.errorTypes[errorType]++;
      }
    }
  }

  /**
   * 调用AI模型
   * @param {Array} messages - 消息列表
   * @returns {Promise<Object>} - AI响应
   */
  async callAI(messages) {
    // 如果开启了模拟数据模式，直接返回模拟结果
    if (this.useMockData) {
      logger.info('使用模拟数据模式，跳过真实API调用');
      return this._getMockResponse(messages);
    }
    
    // 检查API密钥是否配置
    if (!this.apiKey || this.apiKey === 'mock-api-key') {
      logger.warn('未配置有效的API密钥，使用模拟数据');
      return this._getMockResponse(messages);
    }
    
    // 创建唯一请求ID，用于追踪
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    logger.info(`开始AI调用 [请求ID: ${requestId}]`);
    
    // 失败重试计数器
    let retryCount = 0;
    const maxRetries = 3; // 增加到最多重试3次
    
    // 使用指数退避策略的重试函数
    const callWithRetry = async () => {
      try {
        // 根据火山方舟API文档，更新请求参数
        const payload = {
          model: this.model, // 使用配置的模型名称
          messages: messages,
          temperature: 0.5, // 降低温度，使结果更加确定性
          max_tokens: 4000, // 保持回复长度上限
          top_p: 0.9, // 稍微降低以减少随机性
          presence_penalty: 0.0,  // 按文档添加参数
          frequency_penalty: 0.0, // 按文档添加参数
          stream: false, // 非流式响应
          request_id: requestId, // 添加请求ID用于追踪
          system_fingerprint: "search_engine_bookstore" // 系统指纹，帮助追踪
        };
        
        // 配置请求选项
        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        };
        
        logger.info(`发送AI请求到 ${this.apiUrl} [请求ID: ${requestId}]`);
        
        if (this.debugMode) {
          logger.debug(`请求负载: ${JSON.stringify(payload)}`);
        }
        
        const startTime = Date.now();
        
        // 使用axios直接请求，避免fetch的限制
        let response;
        try {
          // 创建超时处理器
          const CancelToken = axios.CancelToken;
          const source = CancelToken.source();
          
          // 增加超时时间至180秒，更适合大模型推理
          const timeout = 180000; // 180秒超时
          setTimeout(() => {
            source.cancel('请求超时 - 180秒');
          }, timeout);
          
          response = await axios({
            method: 'post',
            url: this.apiUrl,
            headers: requestOptions.headers,
            data: payload,
            timeout: timeout, // 180秒超时
            cancelToken: source.token,
            // 添加特殊处理，解决火山引擎在请求等待期间发送空行保持连接的问题
            transformResponse: [function(data) {
              try {
                // 尝试解析JSON
                return JSON.parse(data);
              } catch (e) {
                // 如果不是有效的JSON（可能是空行或保持连接消息），返回原始数据
                logger.debug('收到非JSON响应，可能是保持连接消息');
                return data;
              }
            }],
            // 处理进度事件，避免长时间没有数据导致断开连接
            onUploadProgress: (progressEvent) => {
              logger.debug(`上传进度: ${progressEvent.loaded}/${progressEvent.total || 'unknown'}`);
            },
            onDownloadProgress: (progressEvent) => {
              logger.debug(`下载进度: ${progressEvent.loaded}/${progressEvent.total || 'unknown'}`);
            }
          });
          
          const responseTime = Date.now() - startTime;
          logger.info(`AI响应时间: ${responseTime}ms [请求ID: ${requestId}]`);
          
          // 更新调用统计
          this._updateApiCallStats(true, responseTime);
          
          // 记录火山引擎DeepSeek API的响应详情
          if (this.debugMode && response.headers) {
            logger.debug(`API响应头信息 [请求ID: ${requestId}]:`);
            Object.entries(response.headers).forEach(([key, value]) => {
              logger.debug(`  ${key}: ${value}`);
            });
          }
          
          // 处理成功响应
          const data = response.data;
          
          // 额外检查：确保响应是有效的
          if (typeof data === 'string') {
            // 如果响应是字符串，尝试JSON解析
            try {
              return JSON.parse(data);
            } catch (error) {
              logger.warn(`响应不是有效JSON [请求ID: ${requestId}]: ${data.substring(0, 100)}...`);
              throw new Error('响应格式无效');
            }
          }
          
          return data;
        } catch (axiosError) {
          // 处理Axios错误
          const responseTime = Date.now() - startTime;
          
          if (axiosError.response) {
            // 请求已发送，服务器回复了错误状态码
            const statusCode = axiosError.response.status;
            const errorMessage = axiosError.response.data?.error?.message || JSON.stringify(axiosError.response.data || {});
            
            logger.error(`AI请求失败 [请求ID: ${requestId}], 状态码: ${statusCode}, 错误: ${errorMessage}`);
            
            // 更新调用统计
            this._updateApiCallStats(false, responseTime, `HTTP_${statusCode}`);
            
            // 针对特定状态码的处理
            if (statusCode === 429) {
              // 速率限制，使用指数退避策略
              const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // 最多等待10秒
              logger.warn(`遇到速率限制，等待${waitTime}ms后重试 [请求ID: ${requestId}]`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              throw new Error('速率限制，需要重试');
            } else if (statusCode === 503) {
              // 服务不可用，使用指数退避策略
              const waitTime = Math.min(2000 * Math.pow(2, retryCount), 15000); // 最多等待15秒
              logger.warn(`服务暂时不可用，等待${waitTime}ms后重试 [请求ID: ${requestId}]`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              throw new Error('服务暂时不可用，需要重试');
            } else if (statusCode === 504) {
              // 网关超时，检查是否可以重试
              if (retryCount < maxRetries) {
                const waitTime = 3000 * (retryCount + 1);
                logger.warn(`网关超时，等待${waitTime}ms后重试 [请求ID: ${requestId}]`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                throw new Error('网关超时，准备重试');
              } else {
                // 达到最大重试次数，使用模拟数据
                logger.error(`达到最大重试次数(${maxRetries})，网关超时，使用模拟数据 [请求ID: ${requestId}]`);
                return this._getMockResponse(messages);
              }
            } else {
              // 其他错误，尝试使用回退模拟数据
              logger.error(`HTTP错误 ${statusCode}，使用模拟数据 [请求ID: ${requestId}]`);
              return this._getMockResponse(messages);
            }
          } else if (axiosError.request) {
            // 请求已发送但没有收到响应
            logger.error(`未收到服务器响应 [请求ID: ${requestId}, 耗时: ${responseTime}ms]: ${axiosError.message}`);
            
            // 更新调用统计
            this._updateApiCallStats(false, responseTime, axiosError.code || 'NO_RESPONSE');
            
            if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
              // 连接超时，可以重试
              if (retryCount < maxRetries) {
                const waitTime = 2000 * (retryCount + 1);
                logger.warn(`连接超时，等待${waitTime}ms后重试 [请求ID: ${requestId}]`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                throw new Error('连接超时，需要重试');
              } else {
                // 达到最大重试次数，使用模拟数据
                logger.warn(`达到最大重试次数(${maxRetries})，连接超时，使用模拟数据`);
                return this._getMockResponse(messages);
              }
            } else {
              // 其他网络错误，使用模拟数据
              logger.error(`网络错误，使用模拟数据 [请求ID: ${requestId}]`);
              return this._getMockResponse(messages);
            }
          } else {
            // 其他错误
            logger.error(`其他错误 [请求ID: ${requestId}]: ${axiosError.message}`);
            
            // 更新调用统计
            this._updateApiCallStats(false, Date.now() - startTime, 'OTHER_ERROR');
            
            throw axiosError;
          }
        }
      } catch (error) {
        // 处理网络错误和超时
        logger.error(`AI调用出错 [请求ID: ${requestId}]: ${error.message}`);
        
        // 检查是否可以重试
        if (retryCount < maxRetries) {
          retryCount++;
          // 使用指数退避策略
          const waitTime = Math.min(2000 * Math.pow(2, retryCount - 1), 10000); // 最多等待10秒
          logger.warn(`准备第${retryCount}次重试 [请求ID: ${requestId}]，等待${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return callWithRetry(); // 递归重试
        } else {
          // 达到最大重试次数，返回模拟数据
          logger.error(`达到最大重试次数(${maxRetries})，AI调用失败 [请求ID: ${requestId}]，使用模拟数据`);
          
          // 更新调用统计
          this._updateApiCallStats(false, 0, 'MAX_RETRIES_EXCEEDED');
          
          return this._getMockResponse(messages);
        }
      }
    };
    
    return callWithRetry();
  }

  /**
   * 当AI服务不可用时，提供模拟数据
   * @param {Array} messages - 消息列表
   * @returns {Object} - 模拟的AI响应
   * @private
   */
  _getMockResponse(messages) {
    // 提取用户查询
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    
    // 生成模拟搜索结果
    const mockBooks = this._getMockSearchResults(userMessage);
    
    // 将书籍转换为JSON字符串
    const booksJson = JSON.stringify(mockBooks);
    
    // 构造模拟响应
    return {
      id: 'mock-chatcmpl-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'mock-deepseek-r1',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: booksJson,
            reasoning_content: '这是一个模拟的分析过程，实际使用中会包含AI对用户需求的分析和推荐理由。'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: booksJson.length / 4,
        total_tokens: 100 + booksJson.length / 4
      }
    };
  }

  /**
   * 获取AI推荐的书籍
   * @param {Object} user - 用户信息(可选)
   * @param {Number} limit - 返回的书籍数量
   * @returns {Promise<Array>} - 推荐书籍列表
   */
  async getRecommendedBooks(user = null, limit = 5) {
    try {
      logger.info(`获取AI推荐书籍, limit: ${limit}, 用户: ${user ? user.username : '未登录'}`);
      
      // 构建系统提示 - 使用中文，更简洁
      const systemPrompt = "你是一个专业的图书推荐助手。请直接返回JSON格式的推荐书籍列表。";
      
      // 构建用户提示 - 使用中文，指令更明确
      let userPrompt = `请推荐${limit}本优质书籍，直接返回JSON数组，格式如下：
[
  {
    "title": "书名",
    "author": "作者",
    "category": "分类",
    "tags": ["标签1", "标签2", "标签3"],
    "coverUrl": "封面URL",
    "introduction": "简介"
  }
]
请使用豆瓣图书的真实封面URL，确保返回的是有效的JSON格式，不要有任何额外文字说明。`;
      
      if (user && user.readHistory && user.readHistory.length > 0) {
        // 如果有用户阅读历史，加入个性化推荐
        userPrompt += `\n根据用户最近阅读的书籍：${user.readHistory.join(", ")}进行个性化推荐。`;
      }
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];
      
      logger.info('准备调用AI模型获取推荐书籍');
      const response = await this.callAI(messages);
      
      // 从AI响应中提取JSON数据
      logger.info('开始解析AI响应');
      const content = response.choices[0].message.content;
      
      if (this.debugMode) {
        logger.debug('AI响应内容:', content);
      }
      
      let books = [];
      
      try {
        // 使用辅助方法解析JSON
        logger.info('尝试提取JSON数据');
        books = this._extractJsonFromContent(content);
        
        // 验证书籍数据格式
        logger.info(`成功解析出${books.length}本书，开始验证和格式化`);
        books = books.map(book => this._validateAndFormatBook(book));
        
        logger.info(`成功获取${books.length}本AI推荐书籍`);
      } catch (parseError) {
        logger.error('解析AI推荐书籍失败', parseError);
        logger.error('原始响应内容:', content);
        throw new Error(`解析AI推荐书籍失败: ${parseError.message}`);
      }
      
      return books;
    } catch (error) {
      logger.error('获取AI推荐书籍失败', error);
      logger.info('回退到模拟推荐数据');
      // 返回示例数据，避免前端显示错误
      return this._getMockRecommendedBooks();
    }
  }

  /**
   * 获取热门书籍
   * @param {String} category - 可选的分类过滤
   * @param {Number} limit - 返回的书籍数量
   * @returns {Promise<Array>} - 热门书籍列表
   */
  async getPopularBooks(category = null, limit = 5) {
    try {
      logger.info(`获取热门书籍, limit: ${limit}, 分类: ${category || '全部'}`);
      
      // 首先尝试从缓存获取数据
      const cacheKey = `popular_books_${category || 'all'}_${limit}`;
      const cachedData = await this._getFromCache(cacheKey);
      
      if (cachedData) {
        logger.info('从缓存返回热门书籍数据');
        return cachedData;
      }
      
      // 对于小数量请求(≤3)，直接返回预设数据，提高响应速度
      if (limit <= 3) {
        const mockBooks = this._getMockPopularBooks(category).slice(0, limit);
        // 将结果保存到缓存
        await this._saveToCache(cacheKey, mockBooks, 3600); // 缓存1小时
        return mockBooks;
      }
      
      // 构建系统提示 - 简化提示
      const systemPrompt = "你是一个专业的图书推荐助手。请直接返回JSON格式的热门书籍列表。";
      
      // 构建用户提示 - 使用中文，类似getRecommendedBooks的格式
      let userPrompt = `请列出当前${limit}本最热门的书籍，直接返回JSON数组，格式如下：
[
  {
    "title": "书名",
    "author": "作者",
    "category": "分类",
    "popularity": 95,
    "tags": ["标签1", "标签2", "标签3"],
    "coverUrl": "封面URL",
    "introduction": "简介"
  }
]
请使用豆瓣图书的真实封面URL，确保返回的是有效的JSON格式，不要有任何额外文字说明。`;
      
      if (category) {
        userPrompt += `\n只需要推荐类别为【${category}】的书籍。`;
      }
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];
      
      let result;
      
      // 尝试调用AI获取推荐
      try {
        result = await this.callAI(messages);
      } catch (error) {
        logger.error('调用AI服务获取热门书籍失败，使用模拟数据：', error);
        const mockBooks = this._getMockPopularBooks(category).slice(0, limit);
        await this._saveToCache(cacheKey, mockBooks, 1800); // 缓存30分钟
        return mockBooks;
      }
      
      try {
        // 尝试解析JSON响应
        let books;
        
        // 检查result是否已经是对象，包含choices属性
        if (result && typeof result === 'object' && result.choices && result.choices[0]) {
          // 提取content内容
          const content = result.choices[0].message.content;
          try {
            // 尝试解析content中的JSON
            books = this._extractJsonFromContent(content);
          } catch (contentError) {
            logger.warn('无法从content中提取书籍数据:', contentError);
            books = this._getMockPopularBooks(category).slice(0, limit);
          }
        } else if (typeof result === 'string') {
          // 如果是字符串，尝试解析JSON
          books = JSON.parse(result);
        } else if (result && typeof result === 'object') {
          // 如果已经是对象但不是标准AI响应格式，可能是模拟数据
          books = Array.isArray(result) ? result : this._getMockPopularBooks(category).slice(0, limit);
        } else {
          logger.warn('AI返回的热门书籍格式无效，使用模拟数据');
          books = this._getMockPopularBooks(category).slice(0, limit);
        }
        
        // 确保结果是数组
        if (!Array.isArray(books)) {
          logger.warn('AI返回的热门书籍不是数组格式，使用模拟数据');
          books = this._getMockPopularBooks(category).slice(0, limit);
        } else {
          // 验证和格式化每本书的数据
          books = books
            .map(book => this._validateAndFormatBook(book, true))
            .filter(book => book !== null)
            .slice(0, limit);
          
          // 如果结果为空，使用模拟数据
          if (books.length === 0) {
            logger.warn('AI返回的有效热门书籍为空，使用模拟数据');
            books = this._getMockPopularBooks(category).slice(0, limit);
          }
        }
        
        // 将结果保存到缓存
        await this._saveToCache(cacheKey, books, 3600); // 缓存1小时
        
        return books;
      } catch (error) {
        logger.error('解析AI返回的热门书籍JSON失败，使用模拟数据：', error);
        const mockBooks = this._getMockPopularBooks(category).slice(0, limit);
        await this._saveToCache(cacheKey, mockBooks, 1800); // 缓存30分钟
        return mockBooks;
      }
    } catch (error) {
      logger.error('获取热门书籍时发生错误，返回模拟数据：', error);
      return this._getMockPopularBooks(category).slice(0, limit);
    }
  }
  
  /**
   * 从缓存获取数据
   * @param {String} key - 缓存键名
   * @returns {Promise<any>} - 缓存的数据或null
   */
  async _getFromCache(key) {
    try {
      // 这里可以接入Redis或其他缓存系统
      // 目前使用内存缓存模拟
      if (!this.cache) {
        this.cache = {};
      }
      
      const cachedItem = this.cache[key];
      if (cachedItem && cachedItem.expiry > Date.now()) {
        return cachedItem.data;
      }
      return null;
    } catch (error) {
      logger.error('从缓存获取数据失败：', error);
      return null;
    }
  }
  
  /**
   * 保存数据到缓存
   * @param {String} key - 缓存键名
   * @param {any} data - 要缓存的数据
   * @param {Number} ttlSeconds - 过期时间(秒)
   */
  async _saveToCache(key, data, ttlSeconds = 3600) {
    try {
      // 这里可以接入Redis或其他缓存系统
      // 目前使用内存缓存模拟
      if (!this.cache) {
        this.cache = {};
      }
      
      this.cache[key] = {
        data,
        expiry: Date.now() + (ttlSeconds * 1000)
      };
    } catch (error) {
      logger.error('保存数据到缓存失败：', error);
    }
  }

  /**
   * 验证并格式化书籍数据
   * @param {Object} book - 书籍数据
   * @param {Boolean} isPopular - 是否是热门书籍
   * @returns {Object} - 格式化后的书籍数据
   * @private
   */
  _validateAndFormatBook(book, isPopular = false) {
    // 确保所有必要字段都存在
    const formattedBook = {
      title: book.title || '未知书名',
      author: book.author || '未知作者',
      category: book.category || book.categories?.[0] || '未分类',
      tags: Array.isArray(book.tags) ? book.tags : 
            (book.tags ? [book.tags] : []),
      coverUrl: book.coverUrl || 'https://img9.doubanio.com/view/subject/l/public/s33950303.jpg', // 提供默认封面
      introduction: book.introduction || book.description || '暂无简介',
      rating: typeof book.rating === 'number' ? book.rating : 4.0,
      reasons: book.reasons || '',
      description: book.description || book.introduction || '暂无简介'
    };
    
    // 如果是热门书籍，添加热度字段
    if (isPopular) {
      formattedBook.popularity = typeof book.popularity === 'number' ? book.popularity : 
        (Math.floor(Math.random() * 20) + 80); // 默认80-100的随机值
    }
    
    // 确保标签是数组且不超过5个
    if (!Array.isArray(formattedBook.tags)) {
      formattedBook.tags = [];
    } else if (formattedBook.tags.length > 5) {
      formattedBook.tags = formattedBook.tags.slice(0, 5);
    }
    
    return formattedBook;
  }
  
  /**
   * 提供模拟的推荐书籍数据
   * @returns {Array} - 模拟的推荐书籍列表
   * @private
   */
  _getMockRecommendedBooks() {
    return [
      {
        title: "诡秘之主",
        author: "爱潜水的乌贼",
        category: "玄幻",
        tags: ["克苏鲁", "蒸汽朋克", "诡异"],
        coverUrl: "https://img1.doubanio.com/view/subject/l/public/s33688265.jpg",
        introduction: "穿越者周明瑞在蒸汽与机械的时代，以愚者身份参与了一场命运游戏，揭开世界的真相。"
      },
      {
        title: "赘婿",
        author: "愤怒的香蕉",
        category: "历史",
        tags: ["穿越", "商战", "古代"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s33488572.jpg",
        introduction: "现代商业奇才穿越成为没落世家的赘婿，凭借超前知识和商业头脑崛起的故事。"
      },
      {
        title: "庆余年",
        author: "猫腻",
        category: "仙侠",
        tags: ["权谋", "争斗", "武侠"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s29651121.jpg",
        introduction: "范闲从南方小城初入京都，卷入庞大阴谋的故事。既是江湖故事，也是庙堂传说。"
      },
      {
        title: "十宗罪",
        author: "蜘蛛",
        category: "悬疑",
        tags: ["推理", "犯罪", "心理"],
        coverUrl: "https://img9.doubanio.com/view/subject/l/public/s27137654.jpg",
        introduction: "讲述警方对十种极端罪犯进行抓捕的故事，深入探索人性的扭曲与救赎。"
      }
    ];
  }
  
  /**
   * 提供模拟的热门书籍数据
   * @param {String} category - 分类(可选)
   * @returns {Array} - 模拟的热门书籍列表
   * @private
   */
  _getMockPopularBooks(category = null) {
    const allBooks = [
      {
        title: "夜的命名术",
        author: "会说话的肘子",
        category: "都市",
        popularity: 98,
        tags: ["超能力", "都市异能", "成长"],
        coverUrl: "https://img9.doubanio.com/view/subject/l/public/s33718940.jpg",
        introduction: "在黑暗中寻找光明的少年，获得了为黑暗命名的能力，开始了一段非凡的旅程。"
      },
      {
        title: "人造天才",
        author: "七月新番",
        category: "科幻",
        popularity: 92,
        tags: ["人工智能", "未来", "悬疑"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s33463958.jpg",
        introduction: "一个被植入人工智能芯片的平凡少年，逐渐发现背后隐藏的巨大阴谋。"
      },
      {
        title: "大奉打更人",
        author: "卖报小郎君",
        category: "武侠",
        popularity: 95,
        tags: ["古代", "打更人", "江湖"],
        coverUrl: "https://img1.doubanio.com/view/subject/l/public/s33950303.jpg",
        introduction: "一个身为打更人的少年，揭露世间不为人知的诡异事件，在黑暗中守护光明。"
      },
      {
        title: "深空彼岸",
        author: "辰东",
        category: "玄幻",
        popularity: 96,
        tags: ["宇宙", "星际", "成长"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s34095772.jpg",
        introduction: "地球少年穿越星海，在浩瀚宇宙中寻找生命的意义，探索未知文明的奥秘。"
      }
    ];
    
    if (category) {
      return allBooks.filter(book => 
        book.category.toLowerCase() === category.toLowerCase() || 
        book.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
      );
    }
    
    return allBooks;
  }

  /**
   * 获取热门搜索
   * @param {Number} limit - 返回结果数量
   * @returns {Promise<Array>} - 热门搜索书籍列表
   */
  async getPopularSearches(limit = 3) {
    try {
      logger.info(`获取热门搜索, limit: ${limit}`);
      
      // 构建系统提示
      const systemPrompt = "你是一个专业的图书推荐助手。请直接返回JSON格式的热门搜索书籍列表。";
      
      // 构建用户提示
      const userPrompt = `请列出当前全平台用户搜索频率最高的前${limit}本书籍，按搜索频率从高到低排序。直接返回JSON数组，格式如下：
[
  {
    "title": "书名",
    "author": "作者",
    "category": "分类",
    "searchFrequency": 95,
    "tags": ["标签1", "标签2", "标签3"],
    "coverUrl": "封面URL",
    "introduction": "简介"
  }
]
请使用豆瓣图书的真实封面URL，尽量选择流行度高、大众关注的图书，如畅销书、热门网文、知名作家的作品等。确保返回的是有效的JSON格式，不要有任何额外文字说明。`;
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];
      
      logger.info('准备调用AI模型获取热门搜索书籍');
      const response = await this.callAI(messages);
      
      // 从AI响应中提取JSON数据
      logger.info('开始解析AI响应');
      const content = response.choices[0].message.content;
      
      if (this.debugMode) {
        logger.debug('AI响应内容:', content);
      }
      
      let books = [];
      
      try {
        // 使用辅助方法解析JSON
        logger.info('尝试提取JSON数据');
        books = this._extractJsonFromContent(content);
        
        // 验证书籍数据格式
        logger.info(`成功解析出${books.length}本书，开始验证和格式化`);
        books = books.map(book => {
          const formattedBook = this._validateAndFormatBook(book, true);
          // 添加搜索频率字段
          formattedBook.searchFrequency = typeof book.searchFrequency === 'number' ? book.searchFrequency : 
            (Math.floor(Math.random() * 20) + 80); // 默认80-100的随机值
          return formattedBook;
        });
        
        logger.info(`成功获取${books.length}本热门搜索书籍`);
      } catch (parseError) {
        logger.error('解析热门搜索书籍失败', parseError);
        logger.error('原始响应内容:', content);
        throw new Error(`解析热门搜索书籍失败: ${parseError.message}`);
      }
      
      return books;
    } catch (error) {
      logger.error('获取热门搜索书籍失败', error);
      logger.info('回退到模拟热门搜索数据');
      // 返回示例数据，避免前端显示错误
      return this._getMockPopularSearches();
    }
  }
  
  /**
   * 生成模拟的热门搜索数据
   * @returns {Array} - 模拟的热门搜索书籍列表
   * @private
   */
  _getMockPopularSearches() {
    const books = [
      {
        title: "长安十二时辰",
        author: "马伯庸",
        category: "历史小说",
        searchFrequency: 98,
        tags: ["历史", "悬疑", "唐朝"],
        coverUrl: "https://img9.doubanio.com/view/subject/l/public/s29799794.jpg",
        introduction: "《长安十二时辰》以唐朝一座城市的十二个时辰为背景，讲述了一个紧张刺激的故事。"
      },
      {
        title: "活着",
        author: "余华",
        category: "当代文学",
        searchFrequency: 95,
        tags: ["生存", "苦难", "中国现代"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s29053580.jpg",
        introduction: "《活着》是余华的代表作，描述了农村人福贵悲惨的人生。"
      },
      {
        title: "三体",
        author: "刘慈欣",
        category: "科幻小说",
        searchFrequency: 93,
        tags: ["硬科幻", "宇宙文明", "哲学思考"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s2768378.jpg",
        introduction: "《三体》是中国科幻小说的里程碑作品，讲述了地球文明与三体文明的复杂关系。"
      }
    ];
    
    return books;
  }

  /**
   * 创建搜索会话
   * @param {string} query 搜索查询
   * @returns {string} 会话ID
   */
  async createSearchSession(query) {
    // 生成唯一会话ID
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    
    // 初始化会话状态
    this.searchSessions.set(sessionId, {
      query,
      status: 'pending',  // pending, processing, completed, failed
      progress: 0,
      thinking: ['正在分析您的搜索需求...'],
      results: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    logger.info(`创建搜索会话 [ID: ${sessionId}], 查询: "${query}"`);
    
    return sessionId;
  }

  /**
   * 异步处理搜索查询
   * @param {string} sessionId 会话ID
   * @param {string} query 搜索查询
   */
  async processSearchQuery(sessionId, query) {
    try {
      const session = this.searchSessions.get(sessionId);
      if (!session) {
        throw new Error(`找不到会话: ${sessionId}`);
      }
      
      // 更新会话状态
      session.status = 'processing';
      session.startTimestamp = Date.now();
      session.progress = 10;
      session.thinking = ['正在分析您的搜索需求...'];
      
      // 保存原始查询，用于展示
      session.originalQuery = query;
      
      // 净化和优化查询
      const refinedQuery = this._refineUserQuery(query);
      logger.info(`原始查询: "${query}"，优化后: "${refinedQuery}"`);
      
      // 启动进度更新器
      this._startProgressUpdater(sessionId);
      
      // 构建系统提示信息 - 更加明确的指示
      const systemPrompt = {
        role: "system",
        content: `你是一个精通中文文学的智能图书推荐助手。请基于用户的搜索需求，推荐5-8本最相关的书籍。分析用户的意图和兴趣，理解查询中隐含的主题、类型或风格偏好。

请按以下步骤分析用户需求并提供推荐：
1. 理解用户查询的核心意图和主题
2. 确定相关的书籍类别和风格
3. 筛选匹配度最高的书籍
4. 简要解释每本书为何符合用户需求

必须以特定JSON格式返回结果，包含以下字段：
[
  {
    "title": "书名",
    "author": "作者",
    "description": "100-150字的简介",
    "categories": ["类别1", "类别2"],
    "reasons": "为什么这本书符合用户需求的简短说明，不超过50字",
    "rating": 书籍评分(1-5的数字，可以有小数)
  },
  ...
]

在JSON格式外，请先提供一段分析用户需求的说明(200-300字)，帮助用户理解你的推荐逻辑。分析应该简洁清晰，避免过多专业术语。`
      };
      
      // 用户消息
      const userMessage = {
        role: "user",
        content: `我想找这样的书籍: ${refinedQuery}`
      };
      
      // 准备消息数组
      const messages = [systemPrompt, userMessage];
      
      // 更新思考进度
      this._updateThinkingProgress(sessionId, '连接AI服务...', 20);
      this._updateThinkingProgress(sessionId, '分析您的阅读需求...', 30, 800);
      
      // 声明变量
      let aiResponse;
      
      // 设置最大AI调用尝试次数
      const MAX_AI_CALL_ATTEMPTS = 3;
      let attempts = 0;
      let aiCallSuccess = false;
      
      // 如果使用模拟数据模式，直接跳过AI调用
      if (this.useMockData) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        aiResponse = this._getMockSearchResults(query);
        aiCallSuccess = true;
      }
      
      // 如果已经成功获取模拟数据，直接完成
      if (aiCallSuccess) {
        this._finalizeSearchResults(sessionId, aiResponse);
        return;
      }
      
      // 启动一个异步超时检查，即使AI调用时间较长也能定期更新会话状态
      
      // 尝试调用AI，最多尝试MAX_AI_CALL_ATTEMPTS次
      while (attempts < MAX_AI_CALL_ATTEMPTS && !aiCallSuccess) {
        attempts++;
        
        try {
          // 更新思考进度
          session.progress = 25 + attempts * 5;
          
          this._updateThinkingProgress(sessionId, `第${attempts}次尝试连接AI服务...`, 40, 0);
          
          this._updateThinkingProgress(sessionId, '连接AI模型获取智能推荐...', 40, 200);
          
          // 设置超时 - 增加到180秒，因为DeepSeek模型可能需要较长思考时间
          const AI_CALL_TIMEOUT = 180000; // 180秒超时
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI调用超时')), AI_CALL_TIMEOUT)
          );
          
          // 竞争Promise，谁先完成就采用谁的结果
          const response = await Promise.race([
            this.callAI(messages),
            timeoutPromise
          ]);
          
          if (!response || !response.choices || !response.choices[0]) {
            throw new Error('AI响应格式无效');
          }
          
          aiCallSuccess = true;
          
          // 更新思考进度
          this._updateThinkingProgress(sessionId, '分析AI返回的推荐结果...', 70, 200);
          
          // 解析AI响应
          const content = response.choices[0].message.content;
          
          // 保存AI分析过程，如果存在
          if (response.choices[0].message.reasoning_content) {
            const aiAnalysis = response.choices[0].message.reasoning_content;
            
            session.aiAnalysis = aiAnalysis;
            logger.info('保存AI分析过程，长度: ' + aiAnalysis.length);
          } else {
            // 尝试从内容中提取分析部分
            const analysisExtract = this._extractAnalysisFromContent(content);
            
            session.aiAnalysis = analysisExtract;
            logger.info('从内容中提取AI分析过程，长度: ' + analysisExtract.length);
          }
          
          // 记录AI响应内容，便于调试
          if (this.debugMode) {
            logger.debug('AI响应内容:', content.substring(0, 500) + (content.length > 500 ? '...' : ''));
          }
          
          // 更新思考进度
          this._updateThinkingProgress(sessionId, '解析AI推荐数据...', 75, 100);
          this._updateThinkingProgress(sessionId, '整理推荐书籍信息...', 85, 300);
          
          // 从内容中提取JSON数据
          aiResponse = this._extractJsonFromContent(content);
          
          // 检查是否成功提取了书籍数据
          if (Array.isArray(aiResponse) && aiResponse.length > 0) {
            logger.info(`成功从AI响应中提取到${aiResponse.length}本书籍`);
            aiCallSuccess = true;
            break;
          } else {
            // 未能提取到有效数据，记录错误并准备重试
            logger.warn(`未能从AI响应中提取到有效的书籍数据，尝试重新调用`);
            this._updateThinkingProgress(sessionId, '推荐数据格式有误，重新分析...', 60);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            aiCallSuccess = false;
          }
        } catch (error) {
          // 记录错误，准备重试
          logger.error(`AI调用失败 (尝试 ${attempts}/${MAX_AI_CALL_ATTEMPTS}):`, error);
          this._updateThinkingProgress(sessionId, `分析复杂，继续处理中... (${attempts}/${MAX_AI_CALL_ATTEMPTS})`, 40 + attempts * 10);
          
          // 如果是最后一次尝试，还是失败了，就使用模拟数据
          if (attempts >= MAX_AI_CALL_ATTEMPTS) {
            logger.warn('达到最大尝试次数，使用模拟数据');
            aiResponse = this._getMockSearchResults(query);
            aiCallSuccess = true;
            this._updateThinkingProgress(sessionId, '使用备选数据源...', 90);
            break;
          }
          
          // 等待一段时间后重试
          const waitTime = 2000 * attempts;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // 处理最终结果
      this._finalizeSearchResults(sessionId, aiResponse);
      
    } catch (error) {
      logger.error('处理搜索查询时发生错误:', error);
      
      // 如果会话存在，更新状态
      const session = this.searchSessions.get(sessionId);
      if (session) {
        session.status = 'failed';
        session.error = error.message;
        session.progress = 100;
        session.endTimestamp = Date.now();
      }
    }
  }
  
  /**
   * 启动一个进度更新器，即使AI调用时间较长也能定期更新会话状态
   * @param {string} sessionId 会话ID
   * @private
   */
  _startProgressUpdater(sessionId) {
    // 进度更新间隔(毫秒)
    const UPDATE_INTERVAL = 5000;
    // 思考提示列表
    const thinkingPrompts = [
      '分析您的查询关键词...',
      '搜索相关主题的书籍...',
      '根据搜索词深度分析您的阅读需求...',
      '查找最匹配的书籍类别...',
      '根据您的兴趣筛选优质书籍...',
      '对候选书籍进行排序...',
      '评估书籍的匹配度...',
      '优化推荐结果...',
      'AI还在思考中，请稍等片刻...',
      '正在整理书籍信息...',
      '正在完善推荐列表...'
    ];
    
    let promptIndex = 0;
    let progress = 50; // 起始进度
    let updaterId = null;
    
    const updateProgress = () => {
      if (this.searchSessions.has(sessionId)) {
        const session = this.searchSessions.get(sessionId);
        
        // 只有在处理中状态才更新
        if (session.status === 'processing') {
          // 随机选择一个思考提示
          const randomPrompt = thinkingPrompts[promptIndex % thinkingPrompts.length];
          promptIndex++;
          
          // 缓慢增加进度，最高到85%
          progress += Math.floor(Math.random() * 5) + 1;
          progress = Math.min(progress, 85);
          
          session.thinking.push(randomPrompt);
          session.progress = progress;
          session.updatedAt = Date.now();
          
          // 继续更新
          updaterId = setTimeout(updateProgress, UPDATE_INTERVAL);
        } else {
          // 如果会话状态不再是processing，则停止更新
          clearTimeout(updaterId);
        }
      } else {
        // 如果会话不存在，也停止更新
        clearTimeout(updaterId);
      }
    };
    
    // 启动更新器
    updaterId = setTimeout(updateProgress, UPDATE_INTERVAL);
    
    // 5分钟后强制停止更新器（防止无限运行）
    setTimeout(() => {
      if (updaterId) {
        clearTimeout(updaterId);
        // 如果会话仍然存在且状态仍为processing，则标记为失败
        if (this.searchSessions.has(sessionId)) {
          const session = this.searchSessions.get(sessionId);
          if (session.status === 'processing') {
            session.status = 'failed';
            session.thinking.push('AI响应时间过长，请稍后重试。');
            session.progress = 100;
            session.updatedAt = Date.now();
          }
        }
      }
    }, 5 * 60 * 1000);
  }
  
  /**
   * 从内容中提取分析部分（非JSON部分）
   * @param {string} content AI响应内容
   * @returns {string} 提取的分析文本
   * @private
   */
  _extractAnalysisFromContent(content) {
    if (!content || typeof content !== 'string') return '';
    
    try {
      // 查找可能的JSON开始位置
      const jsonStartIndex = content.indexOf('[');
      
      // 如果找到JSON开始位置且有前导文本，认为前导文本是分析部分
      if (jsonStartIndex > 20) { // 至少有一定长度才认为是分析
        return content.substring(0, jsonStartIndex).trim();
      }
      
      // 或者，查找Markdown代码块前的文本
      const markdownBlockIndex = content.indexOf('```');
      if (markdownBlockIndex > 20) {
        return content.substring(0, markdownBlockIndex).trim();
      }
    } catch (error) {
      logger.error('提取分析过程失败: ' + error.message);
    }
    
    return '';
  }
  
  /**
   * 优化用户查询，去除不必要的冗余信息
   * @param {string} query 原始查询
   * @returns {string} 优化后的查询
   * @private
   */
  _refineUserQuery(query) {
    // 移除"我想要"、"帮我找"等冗余前缀
    let refined = query.replace(/^(我想要|我想获取|我需要|请给我|帮我找|帮我推荐|我希望得到|请问有没有|有没有)/i, '');
    
    // 提取关键信息
    refined = refined.trim();
    
    // 如果查询中包含数字+本书籍的模式，保留但格式化
    if (/\d+本/.test(refined)) {
      refined = refined.replace(/(\d+)本(.+?)$/, '推荐$1本$2');
    }
    
    logger.debug(`优化查询: "${query}" => "${refined}"`);
    return refined;
  }
  
  /**
   * 更新思考进度，带延迟
   * @param {string} sessionId 会话ID 
   * @param {string} thought 思考内容
   * @param {number} progress 进度百分比
   * @param {number} delay 延迟毫秒数
   * @private
   */
  _updateThinkingProgress(sessionId, thought, progress, delay = 500) {
    setTimeout(() => {
      if (this.searchSessions.has(sessionId)) {
        const session = this.searchSessions.get(sessionId);
        session.thinking.push(thought);
        session.progress = progress;
        session.updatedAt = Date.now();
      }
    }, delay);
  }
  
  /**
   * 完成搜索结果处理
   * @param {string} sessionId 会话ID
   * @param {Array} results 搜索结果
   * @private
   */
  _finalizeSearchResults(sessionId, results) {
    if (!this.searchSessions.has(sessionId)) {
      logger.warn(`会话已不存在，无法完成结果 [ID: ${sessionId}]`);
      return;
    }
    
    const session = this.searchSessions.get(sessionId);
    
    // 处理和格式化结果
    const formattedResults = Array.isArray(results) 
      ? results.map((book, index) => {
          // 增加id字段确保前端能正确识别每本书
          const formattedBook = this._validateAndFormatBook(book);
          formattedBook.id = book.id || `search-${Date.now()}-${index}`;
          
          // 确保categories字段存在
          formattedBook.categories = Array.isArray(book.categories) ? book.categories : 
                                   (book.category ? [book.category] : ['未分类']);
          
          return formattedBook;
        })
      : [];
    
    // 立即更新结果
    session.status = 'completed';
    session.results = formattedResults;
    session.progress = 100;
    session.thinking.push('推荐完成！已为您找到最匹配的书籍。');
    session.updatedAt = Date.now();
    
    // 设置会话过期时间（60分钟后自动清除）
    setTimeout(() => {
      if (this.searchSessions.has(sessionId)) {
        this.searchSessions.delete(sessionId);
        logger.info(`搜索会话已过期并清除 [ID: ${sessionId}]`);
      }
    }, 60 * 60 * 1000);
    
    logger.info(`搜索结果更新完成 [会话ID: ${sessionId}], 共找到${formattedResults.length}本书籍`);
  }
  
  /**
   * 使用正则表达式提取JSON
   * @param {string} content 内容
   * @returns {Array|Object} 提取的JSON
   * @private
   */
  _extractJsonWithRegex(content) {
    try {
      // 尝试用更宽松的正则表达式提取JSON数组
      const arrayMatches = content.match(/\[\s*\{.+\}\s*\]/s);
      if (arrayMatches) {
        const startIndex = arrayMatches.index;
        let bracketCount = 0;
        let endIndex = startIndex;
        
        // 寻找匹配的闭合括号
        for (let i = startIndex; i < content.length; i++) {
          if (content[i] === '[') bracketCount++;
          else if (content[i] === ']') bracketCount--;
          
          if (bracketCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
        
        if (endIndex > startIndex) {
          const jsonText = content.substring(startIndex, endIndex);
          return JSON.parse(jsonText);
        }
      }
      
      throw new Error('无法找到有效的JSON结构');
    } catch (error) {
      logger.error('正则提取JSON失败', error);
      throw error;
    }
  }

  // 添加一个辅助方法来处理可能包含Markdown的JSON内容
  _extractJsonFromContent(content) {
    if (!content || typeof content !== 'string') {
      logger.error('提取JSON数据失败: 内容为空或不是字符串');
      throw new Error('无效的内容');
    }
    
    try {
      // 记录内容前100个字符，用于调试
      logger.debug(`准备提取JSON，内容开头: ${content.substring(0, 100)}...`);
      
      // 尝试方法1: 从Markdown代码块中提取JSON
      const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
        logger.info('从Markdown代码块中提取JSON数据');
        const jsonText = jsonCodeBlockMatch[1].trim();
        return JSON.parse(jsonText);
      }
      
      // 尝试方法2: 查找 [ 开头和 ] 结尾的部分（数组）
      const arrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        logger.info('从内容中直接提取JSON数组');
        return JSON.parse(arrayMatch[0]);
      }
      
      // 尝试方法3: 查找最长的 {...} 部分（对象）
      const objectMatches = content.match(/\{[\s\S]*?\}/g);
      if (objectMatches && objectMatches.length > 0) {
        // 选择最长的匹配
        const longestMatch = objectMatches.reduce((longest, current) => 
          current.length > longest.length ? current : longest, objectMatches[0]);
        
        logger.info('从内容中直接提取最长的JSON对象');
        const parsedObj = JSON.parse(longestMatch);
        
        // 如果是对象但包含数组属性，尝试使用该数组
        for (const key in parsedObj) {
          if (Array.isArray(parsedObj[key]) && parsedObj[key].length > 0) {
            logger.info(`找到对象中的数组属性: ${key}, 长度: ${parsedObj[key].length}`);
            return parsedObj[key];
          }
        }
        
        return parsedObj;
      }
      
      // 尝试方法4: 直接解析整个内容
      logger.info('尝试直接解析整个内容');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`提取JSON数据失败: ${error.message}`);
      
      // 最后尝试: 查找和清理可能的JSON字符串
      try {
        // 查找可能的JSON开始位置 [{ 或 {"
        const potentialStartIndex = Math.min(
          content.indexOf('[{') >= 0 ? content.indexOf('[{') : Infinity,
          content.indexOf('{"') >= 0 ? content.indexOf('{"') : Infinity
        );
        
        if (potentialStartIndex < Infinity) {
          // 查找可能的JSON结束位置
          const potentialEndJson = content.substring(potentialStartIndex);
          const balancedJson = this._findBalancedJsonSubstring(potentialEndJson);
          
          if (balancedJson) {
            logger.info(`找到可能的JSON子字符串，长度: ${balancedJson.length}`);
            return JSON.parse(balancedJson);
          }
        }
      } catch (finalError) {
        logger.error(`最终JSON提取尝试失败: ${finalError.message}`);
      }
      
      throw new Error(`解析JSON失败: ${error.message}`);
    }
  }
  
  /**
   * 查找平衡的JSON子字符串
   * @param {string} text 待查找的文本
   * @returns {string|null} 找到的JSON子字符串，或null
   * @private
   */
  _findBalancedJsonSubstring(text) {
    const firstChar = text.charAt(0);
    let depth = 0;
    let matching = firstChar === '[' ? ']' : '}';
    
    if (firstChar !== '[' && firstChar !== '{') {
      return null;
    }
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      if (char === '[' || char === '{') {
        depth++;
      } else if (char === ']' || char === '}') {
        depth--;
      }
      
      if (depth === 0) {
        return text.substring(0, i + 1);
      }
    }
    
    return null;
  }

  /**
   * 获取搜索进度
   * @param {string} sessionId 会话ID 
   * @returns {Object|null} 会话状态
   */
  async getSearchProgress(sessionId) {
    // 获取会话状态
    const session = this.searchSessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    return {
      query: session.query,
      status: session.status,
      progress: session.progress,
      thinking: session.thinking,
      results: session.results,
      aiAnalysis: session.aiAnalysis || "", // 返回AI分析过程
      updatedAt: session.updatedAt
    };
  }
  
  /**
   * 生成模拟搜索结果
   * @param {string} query 搜索查询
   * @returns {Array} 模拟的搜索结果
   * @private
   */
  _getMockSearchResults(query) {
    // 基于查询内容生成相关的模拟结果
    const mockBooks = [
      {
        title: "三体",
        author: "刘慈欣",
        category: "科幻",
        tags: ["硬科幻", "宇宙文明", "哲学思考"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s2768378.jpg",
        introduction: "地球文明面临危机，一个神秘组织发起一个计划，将人类的命运与三体文明联系在一起。"
      },
      {
        title: "活着",
        author: "余华",
        category: "文学",
        tags: ["生活", "苦难", "中国现代"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s29053580.jpg", 
        introduction: "讲述了福贵一生的故事，展示了普通人在大时代背景下的生存状态。"
      },
      {
        title: "白夜行",
        author: "东野圭吾",
        category: "推理",
        tags: ["悬疑", "心理", "日本文学"],
        coverUrl: "https://img9.doubanio.com/view/subject/l/public/s4610502.jpg",
        introduction: "一对少年少女被命运捆绑，在黑暗中寻找光明的故事。"
      },
      {
        title: "百年孤独",
        author: "加西亚·马尔克斯",
        category: "魔幻现实主义",
        tags: ["家族史诗", "拉美文学", "魔幻"],
        coverUrl: "https://img1.doubanio.com/view/subject/l/public/s6384944.jpg",
        introduction: "布恩迪亚家族七代人的兴衰史，影响了整整一代文学的经典。"
      },
      {
        title: "人类简史",
        author: "尤瓦尔·赫拉利",
        category: "历史",
        tags: ["历史", "人类学", "文明"],
        coverUrl: "https://img2.doubanio.com/view/subject/l/public/s27814883.jpg",
        introduction: "从认知革命、农业革命、科学革命到人工智能，重新审视人类发展历程。"
      },
      {
        title: "解忧杂货店",
        author: "东野圭吾",
        category: "小说",
        tags: ["治愈", "温情", "日本文学"],
        coverUrl: "https://img9.doubanio.com/view/subject/l/public/s27264181.jpg",
        introduction: "一家可以解决人们烦恼的杂货店，通过跨越时空的信件传递温暖与希望。"
      }
    ];
    
    // 基于查询选择最相关的书籍
    let relevantBooks = [...mockBooks];
    
    // 如果查询中包含特定关键词，尝试匹配相关书籍
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('科幻') || lowerQuery.includes('太空') || lowerQuery.includes('宇宙')) {
      relevantBooks = mockBooks.filter(book => 
        book.category === '科幻' || 
        book.tags.some(tag => ['科幻', '太空', '宇宙', '未来'].includes(tag))
      );
    } else if (lowerQuery.includes('悬疑') || lowerQuery.includes('推理') || lowerQuery.includes('犯罪')) {
      relevantBooks = mockBooks.filter(book => 
        book.category === '推理' || 
        book.tags.some(tag => ['悬疑', '推理', '犯罪', '心理'].includes(tag))
      );
    } else if (lowerQuery.includes('历史') || lowerQuery.includes('文明')) {
      relevantBooks = mockBooks.filter(book => 
        book.category === '历史' || 
        book.tags.some(tag => ['历史', '文明', '人类学'].includes(tag))
      );
    }
    
    // 如果没有匹配的，返回随机书籍
    if (relevantBooks.length === 0) {
      relevantBooks = mockBooks;
    }
    
    // 混洗数组，随机选择书籍
    relevantBooks.sort(() => 0.5 - Math.random());
    
    // 返回所有相关书籍结果
    return relevantBooks;
  }
}

module.exports = new AIService({
  apiKey: process.env.VOLC_API_KEY || process.env.DEEPSEEK_API_KEY,
  apiUrl: process.env.DEEPSEEK_API_URL,
  model: process.env.AI_MODEL || 'deepseek-r1-250120',
  useMockData: process.env.USE_MOCK_DATA === 'true',
  debugMode: process.env.DEBUG_MODE === 'true'
}); 