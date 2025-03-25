const axios = require('axios');
const logger = require('../utils/logger');

/**
 * AI服务
 * 提供与AI模型交互的功能
 */
class AIService {
  constructor() {
    this.apiKey = process.env.VOLC_API_KEY || process.env.DEEPSEEK_API_KEY || 'af65b0b7-e01d-4fd3-8a64-04db65f2b730';
    this.apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    
    // 调试模式 - 设置为true以打印更多日志
    this.debugMode = true;
    
    // 开发模式下是否始终使用模拟数据
    this.useMockData = process.env.USE_MOCK_DATA === 'true';
    
    // 初始化
    logger.info('AI服务初始化完成，使用火山引擎DeepSeek模型');
    logger.info(`API端点: ${this.apiUrl}`);
    logger.info(`API密钥: ${this.apiKey.substring(0, 5)}...`);
    logger.info(`调试模式: ${this.debugMode ? '开启' : '关闭'}`);
    logger.info(`环境变量: ${process.env.VOLC_API_KEY ? 'VOLC_API_KEY已设置' : 'VOLC_API_KEY未设置'}, ${process.env.DEEPSEEK_API_KEY ? 'DEEPSEEK_API_KEY已设置' : 'DEEPSEEK_API_KEY未设置'}`);
    logger.info(`模拟数据模式: ${this.useMockData ? '开启 (将始终使用模拟数据而不调用AI)' : '关闭'}`);
    
    // 添加搜索会话存储
    this.searchSessions = new Map();
  }

  /**
   * 调用AI模型
   * @param {Array} messages - 消息列表
   * @returns {Promise<Object>} - AI响应
   */
  async callAI(messages) {
    // 如果配置为始终使用模拟数据，直接返回
    if (this.useMockData) {
      logger.info('模拟数据模式开启，直接使用模拟数据而不调用AI');
      return this._getMockResponse(messages);
    }
    
    let retryCount = 0;
    const maxRetries = 2; // 最多重试2次
    const timeout = 40000; // 增加到40秒

    const attemptCall = async () => {
      try {
        logger.info(`调用火山引擎DeepSeek API [尝试 ${retryCount + 1}/${maxRetries + 1}]，messages长度: ${messages.length}`);
        
        if (this.debugMode) {
          logger.debug('请求消息:', JSON.stringify(messages, null, 2));
        }
        
        const payload = {
          model: "deepseek-r1-250120",
          messages,
          temperature: 0.7,
          max_tokens: 2000
        };
        
        logger.debug('请求负载:', JSON.stringify(payload, null, 2));
        
        logger.info(`开始发送请求到 ${this.apiUrl}...`);
        const startTime = Date.now();
        
        const response = await axios.post(
          this.apiUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: timeout, // 使用更长的超时时间
            validateStatus: status => status < 500 // 只将500以上的状态码视为错误
          }
        );
        
        const elapsedTime = Date.now() - startTime;
        logger.info(`请求完成，耗时: ${elapsedTime}ms, 状态码: ${response.status}`);
        
        // 检查响应状态码
        if (response.status >= 400) {
          logger.error(`AI服务返回错误状态码: ${response.status}`, 
            typeof response.data === 'object' ? JSON.stringify(response.data) : response.data);
          // 返回模拟数据
          logger.info('AI服务返回错误，使用模拟数据');
          return this._getMockResponse(messages);
        }
        
        logger.info('AI模型调用成功');
        if (this.debugMode) {
          logger.debug('响应数据:', typeof response.data === 'object' ? 
            JSON.stringify(response.data, null, 2) : response.data);
        } else {
          // 非调试模式只记录响应结构
          const choicesCount = response.data?.choices?.length || 0;
          logger.info(`API响应: ${choicesCount}个选项, 模型: ${response.data?.model || '未知'}`);
        }
        
        return response.data;
      } catch (error) {
        if (retryCount < maxRetries) {
          // 如果是超时错误或网络错误，可以尝试重试
          if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || 
              !error.response || error.code === 'ENOTFOUND') {
            retryCount++;
            const waitTime = 1000 * retryCount; // 逐次增加等待时间
            logger.warn(`请求超时或网络错误，${waitTime/1000}秒后进行第${retryCount}次重试...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return attemptCall(); // 递归调用自身重试
          }
        }
        
        // 处理错误，与之前相同
        if (error.response) {
          // 请求成功发出且服务器也响应了状态码，但状态代码超出了2xx的范围
          logger.error(`调用AI模型失败 - 状态码: ${error.response.status}`, 
            typeof error.response.data === 'object' ? 
            JSON.stringify(error.response.data, null, 2) : 
            error.response.data);
        } else if (error.request) {
          // 请求已经发出，但没有收到响应
          logger.error('调用AI模型失败 - 无响应', 
            error.message || '请求超时或网络问题');
          
          logger.debug('请求配置:', JSON.stringify({
            url: this.apiUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ***' // 隐藏实际的API密钥
            },
            timeout: timeout
          }, null, 2));
        } else {
          // 发送请求时出了点问题
          logger.error('调用AI模型失败 - 请求错误', error.message);
        }
        
        // 当AI服务不可用时，返回模拟数据以保持应用运行
        logger.info('AI服务不可用，使用模拟数据');
        return this._getMockResponse(messages);
      }
    };
    
    return attemptCall();
  }

  /**
   * 当AI服务不可用时，提供模拟数据
   * @param {Array} messages - 消息列表
   * @returns {Object} - 模拟的AI响应
   * @private
   */
  _getMockResponse(messages) {
    // 根据请求内容判断是推荐书籍还是热门书籍
    const isRecommendation = messages.some(m => 
      m.content && m.content.includes('推荐') && !m.content.includes('热门')
    );
    
    const isPopular = messages.some(m => 
      m.content && m.content.includes('热门')
    );
    
    let content = '';
    
    if (isRecommendation) {
      content = JSON.stringify([
        {
          "title": "三体",
          "author": "刘慈欣",
          "category": "科幻",
          "tags": ["硬科幻", "宇宙文明", "哲学思考"],
          "coverUrl": "https://img2.doubanio.com/view/subject/l/public/s2768378.jpg",
          "introduction": "地球文明面临危机，一个神秘组织发起一个计划，将人类的命运与三体文明联系在一起。"
        },
        {
          "title": "活着",
          "author": "余华",
          "category": "文学",
          "tags": ["生活", "苦难", "中国现代"],
          "coverUrl": "https://img2.doubanio.com/view/subject/l/public/s29053580.jpg", 
          "introduction": "讲述了福贵一生的故事，展示了普通人在大时代背景下的生存状态。"
        },
        {
          "title": "白夜行",
          "author": "东野圭吾",
          "category": "推理",
          "tags": ["悬疑", "心理", "日本文学"],
          "coverUrl": "https://img9.doubanio.com/view/subject/l/public/s4610502.jpg",
          "introduction": "一对少年少女被命运捆绑，在黑暗中寻找光明的故事。"
        },
        {
          "title": "百年孤独",
          "author": "加西亚·马尔克斯",
          "category": "魔幻现实主义",
          "tags": ["家族史诗", "拉美文学", "魔幻"],
          "coverUrl": "https://img1.doubanio.com/view/subject/l/public/s6384944.jpg",
          "introduction": "布恩迪亚家族七代人的兴衰史，影响了整整一代文学的经典。"
        }
      ]);
    } else if (isPopular) {
      content = JSON.stringify([
        {
          "title": "长安的荔枝",
          "author": "马伯庸",
          "category": "历史小说",
          "popularity": 95,
          "tags": ["历史", "唐朝", "美食"],
          "coverUrl": "https://img2.doubanio.com/view/subject/l/public/s34069492.jpg",
          "introduction": "围绕一场荔枝入长安的任务展开，讲述了唐朝各阶层人物的命运。"
        },
        {
          "title": "云边有个小卖部",
          "author": "张嘉佳",
          "category": "青春文学",
          "popularity": 88,
          "tags": ["成长", "爱情", "小镇"],
          "coverUrl": "https://img1.doubanio.com/view/subject/l/public/s29799089.jpg",
          "introduction": "讲述了云边镇少年刘十三的成长故事和初恋。"
        },
        {
          "title": "生死疲劳",
          "author": "莫言",
          "category": "现代文学",
          "popularity": 92,
          "tags": ["乡土中国", "农村", "转世"],
          "coverUrl": "https://img2.doubanio.com/view/subject/l/public/s9140762.jpg",
          "introduction": "讲述了西门闹死后六道轮回的故事，展现了中国农村50年的变迁。"
        },
        {
          "title": "人生海海",
          "author": "麦家",
          "category": "当代文学",
          "popularity": 87,
          "tags": ["命运", "传奇", "谍战"],
          "coverUrl": "https://img9.doubanio.com/view/subject/l/public/s33642463.jpg",
          "introduction": "讲述了一个被称为老鬼的人物传奇一生。"
        }
      ]);
    } else {
      content = '[]';
    }
    
    return {
      choices: [
        {
          message: {
            content: content
          }
        }
      ]
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
        let books = JSON.parse(result);
        
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
      category: book.category || '未分类',
      tags: Array.isArray(book.tags) ? book.tags : [],
      coverUrl: book.coverUrl || '',
      introduction: book.introduction || '暂无简介'
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
   * @param {number} limit 结果数量限制
   */
  async processSearchQuery(sessionId, query, limit = 3) {
    try {
      // 获取会话状态
      const session = this.searchSessions.get(sessionId);
      if (!session) {
        logger.error(`处理搜索查询失败: 会话不存在 [ID: ${sessionId}]`);
        return;
      }
      
      // 更新会话状态
      session.status = 'processing';
      session.thinking.push('分析您的兴趣偏好和阅读需求...');
      session.progress = 10;
      session.updatedAt = Date.now();
      
      // 准备AI请求
      const messages = [
        {
          role: "system",
          content: `你是一个专业的图书推荐助手，精通各类书籍和文学作品。
          用户将描述他们的阅读需求、兴趣爱好或想了解的主题，你需要推荐最合适的书籍。
          请分析用户需求的深层含义，考虑可能隐含的阅读偏好、知识背景和阅读目的。
          
          你的回复必须是一个JSON格式的数组，包含${limit}本最匹配的书籍，每本书包含以下字段：
          - title: 书名
          - author: 作者
          - category: 分类
          - tags: 标签数组
          - coverUrl: 封面图片URL（尽量使用豆瓣图书的封面URL）
          - introduction: 简短介绍
          
          确保您的回复可以直接被JSON.parse()解析，不包含额外的说明文字。`
        },
        {
          role: "user",
          content: query
        }
      ];
      
      // 更新思考过程
      setTimeout(() => {
        if (this.searchSessions.has(sessionId)) {
          const session = this.searchSessions.get(sessionId);
          session.thinking.push('搜索相关主题的优质书籍...');
          session.progress = 30;
          session.updatedAt = Date.now();
        }
      }, 1500);
      
      setTimeout(() => {
        if (this.searchSessions.has(sessionId)) {
          const session = this.searchSessions.get(sessionId);
          session.thinking.push('根据您的需求定制个性化推荐...');
          session.progress = 50;
          session.updatedAt = Date.now();
        }
      }, 3000);
      
      // 调用AI模型或使用模拟数据
      let aiResponse;
      if (this.useMockData) {
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 4500));
        aiResponse = this._getMockSearchResults(query, limit);
        
        // 更新思考过程
        if (this.searchSessions.has(sessionId)) {
          const session = this.searchSessions.get(sessionId);
          session.thinking.push('筛选最符合您兴趣的书籍...');
          session.progress = 70;
          session.updatedAt = Date.now();
        }
        
        // 再次模拟延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // 真实API调用
        // 更新思考过程
        if (this.searchSessions.has(sessionId)) {
          const session = this.searchSessions.get(sessionId);
          session.thinking.push('连接AI模型获取智能推荐...');
          session.progress = 40;
          session.updatedAt = Date.now();
        }
        
        const response = await this.callAI(messages);
        
        if (this.searchSessions.has(sessionId)) {
          const session = this.searchSessions.get(sessionId);
          session.thinking.push('分析AI返回的推荐结果...');
          session.progress = 70;
          session.updatedAt = Date.now();
        }
        
        // 解析AI响应
        if (response && response.choices && response.choices.length > 0) {
          const content = response.choices[0].message.content;
          try {
            // 使用辅助方法解析JSON
            logger.info('尝试提取JSON数据');
            aiResponse = this._extractJsonFromContent(content);
            
            // 成功解析后立即更新会话状态，不要延迟
            if (this.searchSessions.has(sessionId)) {
              const session = this.searchSessions.get(sessionId);
              session.thinking.push('成功解析AI推荐结果...');
              session.thinking.push('筛选最符合您兴趣的书籍...');
              session.progress = 75;
              session.updatedAt = Date.now();
              
              // 处理和格式化结果
              const formattedResults = Array.isArray(aiResponse) 
                ? aiResponse.map(book => this._validateAndFormatBook(book))
                : [];
              
              // 立即更新结果
              session.status = 'completed';
              session.results = formattedResults;
              session.progress = 100;
              session.thinking.push('推荐完成！已为您找到最匹配的书籍。');
              session.updatedAt = Date.now();
              
              // 设置会话过期时间（60分钟后自动清除）
              setTimeout(() => {
                this.searchSessions.delete(sessionId);
                logger.info(`搜索会话已过期并清除 [ID: ${sessionId}]`);
              }, 60 * 60 * 1000);
              
              logger.info(`搜索结果更新完成 [会话ID: ${sessionId}], 共找到${formattedResults.length}本书籍`);
            }
          } catch (error) {
            logger.error(`解析AI响应失败 [会话ID: ${sessionId}]`, error);
            logger.debug('AI响应内容:', content);
            
            if (this.searchSessions.has(sessionId)) {
              const session = this.searchSessions.get(sessionId);
              session.thinking.push('解析AI返回结果出错，尝试使用备用数据...');
              session.progress = 80;
              session.updatedAt = Date.now();
              
              // 使用模拟数据作为备份
              aiResponse = this._getMockSearchResults(query, limit);
              
              // 处理和格式化结果
              const formattedResults = Array.isArray(aiResponse) 
                ? aiResponse.map(book => this._validateAndFormatBook(book))
                : [];
              
              // 立即更新结果
              session.status = 'completed';
              session.results = formattedResults;
              session.progress = 100;
              session.thinking.push('推荐完成！已为您找到最匹配的书籍。');
              session.updatedAt = Date.now();
              
              logger.info(`使用备用数据更新搜索结果 [会话ID: ${sessionId}], 共找到${formattedResults.length}本书籍`);
            }
          }
        } else {
          logger.error(`AI响应格式异常 [会话ID: ${sessionId}]`);
          
          if (this.searchSessions.has(sessionId)) {
            const session = this.searchSessions.get(sessionId);
            session.thinking.push('AI返回的数据格式异常，使用备用数据...');
            session.progress = 80;
            session.updatedAt = Date.now();
            
            // 使用模拟数据作为备份
            aiResponse = this._getMockSearchResults(query, limit);
            
            // 处理和格式化结果
            const formattedResults = Array.isArray(aiResponse) 
              ? aiResponse.map(book => this._validateAndFormatBook(book))
              : [];
            
            // 立即更新结果
            session.status = 'completed';
            session.results = formattedResults;
            session.progress = 100;
            session.thinking.push('推荐完成！已为您找到最匹配的书籍。');
            session.updatedAt = Date.now();
            
            logger.info(`使用备用数据更新搜索结果 [会话ID: ${sessionId}], 共找到${formattedResults.length}本书籍`);
          }
        }
      }
    } catch (error) {
      logger.error(`处理搜索查询失败 [会话ID: ${sessionId}]`, error);
      
      // 更新会话状态为失败
      if (this.searchSessions.has(sessionId)) {
        const session = this.searchSessions.get(sessionId);
        session.status = 'failed';
        session.thinking.push('搜索处理过程中发生错误，请重试。');
        session.progress = 100;
        session.updatedAt = Date.now();
      }
    }
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
      updatedAt: session.updatedAt
    };
  }

  /**
   * 生成模拟搜索结果
   * @param {string} query 搜索查询
   * @param {number} limit 结果数量限制
   * @returns {Array} 模拟的搜索结果
   * @private
   */
  _getMockSearchResults(query, limit = 3) {
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
    
    // 返回限制数量的结果
    return relevantBooks.slice(0, limit);
  }

  // 添加一个辅助方法来处理可能包含Markdown的JSON内容
  _extractJsonFromContent(content) {
    try {
      // 首先尝试从Markdown代码块中提取JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        logger.info('从Markdown代码块中提取JSON数据');
        return JSON.parse(jsonMatch[1]);
      }
      
      // 如果没有Markdown代码块，尝试直接解析
      return JSON.parse(content);
    } catch (error) {
      logger.error('提取JSON数据失败', error);
      throw error;
    }
  }
}

module.exports = new AIService(); 