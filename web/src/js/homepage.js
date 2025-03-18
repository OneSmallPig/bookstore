/**
 * 首页功能脚本
 * 负责加载AI推荐书籍和热门书籍
 */

// API基础URL配置 - 使用相对路径，通过Vite代理访问后端
const API_BASE_URL = '';

// 最长请求超时时间（毫秒）
const REQUEST_TIMEOUT = 40000;

// 缓存配置
const CACHE_KEYS = {
  RECOMMENDED_BOOKS: 'bookstore_recommended_books',
  POPULAR_BOOKS: 'bookstore_popular_books',
  CACHE_TIMESTAMP: 'bookstore_cache_timestamp',
  USER_TOKEN: 'token', // 用于判断用户登录状态
};

// 缓存有效期（毫秒）- 设置为1小时
const CACHE_DURATION = 60 * 60 * 1000;

// 在页面开始加载时就立即执行，确保最早显示加载动画
window.onload = function () {
  console.log('页面已完全加载，执行初始化...');
  initHomePage();
};

// 接收HTML解析事件，在页面结构可用但资源可能尚未加载完成时执行
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM已加载，立即显示加载动画...');
  showInitialLoadingState();

  // 在开发环境添加缓存重置按钮
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const clearCacheBtn = document.createElement('button');
    clearCacheBtn.textContent = '清除缓存数据';
    clearCacheBtn.style.position = 'fixed';
    clearCacheBtn.style.bottom = '10px';
    clearCacheBtn.style.right = '10px';
    clearCacheBtn.style.zIndex = '1000';
    clearCacheBtn.style.padding = '5px 10px';
    clearCacheBtn.style.backgroundColor = '#f44336';
    clearCacheBtn.style.color = 'white';
    clearCacheBtn.style.border = 'none';
    clearCacheBtn.style.borderRadius = '4px';
    clearCacheBtn.style.cursor = 'pointer';
    clearCacheBtn.style.fontSize = '12px';

    clearCacheBtn.addEventListener('click', () => {
      localStorage.removeItem(CACHE_KEYS.RECOMMENDED_BOOKS);
      localStorage.removeItem(CACHE_KEYS.POPULAR_BOOKS);
      localStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP);
      localStorage.removeItem('cachedToken');
      alert('缓存已清除，页面将刷新');
      window.location.reload();
    });

    document.body.appendChild(clearCacheBtn);
  }
});

// 显示初始加载状态
function showInitialLoadingState() {
  // 预先显示加载状态
  const recommendedContainer = document.querySelector('#recommended-books');
  const popularContainer = document.querySelector('#popular-books');

  if (recommendedContainer) {
    if (recommendedContainer.children.length > 0) {
      // 如果容器内已有内容，先清空
      recommendedContainer.innerHTML = '';
    }
    showLoadingState(recommendedContainer, 'AI正在为您分析推荐书籍...');
  } else {
    console.error('未找到推荐书籍容器');
  }

  if (popularContainer) {
    if (popularContainer.children.length > 0) {
      // 如果容器内已有内容，先清空
      popularContainer.innerHTML = '';
    }
    showLoadingState(popularContainer, '正在获取热门书籍数据...');
  } else {
    console.error('未找到热门书籍容器');
  }
}

// 初始化首页
function initHomePage() {
  console.log('执行首页初始化...');

  // 显示当前缓存和登录状态（调试用）
  const currentToken = localStorage.getItem(CACHE_KEYS.USER_TOKEN) || '';
  const cachedToken = localStorage.getItem('cachedToken') || '';
  const recommendedCacheTime = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}')[
    CACHE_KEYS.RECOMMENDED_BOOKS
  ];
  const popularCacheTime = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}')[
    CACHE_KEYS.POPULAR_BOOKS
  ];

  console.log('----缓存状态----');
  console.log('当前用户Token:', currentToken ? '已登录' : '未登录');
  console.log('缓存的Token:', cachedToken ? '已登录' : '未登录');
  console.log(
    '推荐书籍缓存时间:',
    recommendedCacheTime ? new Date(recommendedCacheTime).toLocaleString() : '无缓存'
  );
  console.log(
    '热门书籍缓存时间:',
    popularCacheTime ? new Date(popularCacheTime).toLocaleString() : '无缓存'
  );
  console.log('----------------');

  // 短暂延迟以确保DOM渲染完成
  setTimeout(() => {
    // 加载推荐书籍
    loadRecommendedBooks();

    // 加载热门书籍
    loadPopularBooks();
  }, 300);
}

/**
 * 缓存数据到本地存储
 * @param {string} key - 缓存键名
 * @param {any} data - 要缓存的数据
 */
function cacheData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // 更新缓存时间戳
    const timestamps = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}');
    timestamps[key] = Date.now();
    localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, JSON.stringify(timestamps));
    console.log(`数据已缓存至: ${key}`);
  } catch (error) {
    console.error('缓存数据失败:', error);
  }
}

/**
 * 从本地存储获取缓存数据
 * @param {string} key - 缓存键名
 * @returns {any|null} - 缓存的数据，如果无缓存或已过期则返回null
 */
function getCachedData(key) {
  try {
    // 获取缓存时间戳
    const timestamps = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}');
    const timestamp = timestamps[key];

    // 验证缓存是否有效（时间戳检查）
    if (!timestamp || Date.now() - timestamp > CACHE_DURATION) {
      console.log(`缓存过期或不存在: ${key}`);
      return null;
    }

    // 获取当前用户的登录状态 - 用户token可能为null或空字符串（表示未登录）
    const currentToken = localStorage.getItem(CACHE_KEYS.USER_TOKEN) || '';
    // 获取缓存时的登录状态
    const cachedToken = localStorage.getItem('cachedToken') || '';

    // 只有在登录状态发生实质变化时（从登录变为未登录，或从未登录变为登录，或切换了不同用户）才使缓存失效
    // 这里通过比较"有无token"来判断登录状态变化，避免未登录状态下的不必要缓存失效
    const wasLoggedIn = cachedToken !== '';
    const isLoggedIn = currentToken !== '';

    if (wasLoggedIn !== isLoggedIn || (wasLoggedIn && isLoggedIn && cachedToken !== currentToken)) {
      console.log('用户登录状态已变化，缓存无效');
      // 更新保存的token状态
      localStorage.setItem('cachedToken', currentToken);
      return null;
    }

    // 获取缓存数据
    const cachedData = localStorage.getItem(key);
    if (!cachedData) {
      return null;
    }

    const data = JSON.parse(cachedData);
    console.log(`从缓存加载数据: ${key}`, data);
    return data;
  } catch (error) {
    console.error('获取缓存数据失败:', error);
    return null;
  }
}

/**
 * 加载AI推荐的书籍
 */
async function loadRecommendedBooks() {
  try {
    console.log('开始加载AI推荐书籍...');
    const recommendedContainer = document.querySelector('#recommended-books');
    if (!recommendedContainer) {
      console.error('未找到推荐书籍容器元素');
      return;
    }

    // 检查是否有用户token
    const token = localStorage.getItem(CACHE_KEYS.USER_TOKEN);

    // 尝试从缓存加载数据
    const cachedBooks = getCachedData(CACHE_KEYS.RECOMMENDED_BOOKS);
    if (cachedBooks && cachedBooks.length > 0) {
      console.log('使用缓存的推荐书籍数据');
      // 清空加载状态
      recommendedContainer.innerHTML = '';

      // 渲染缓存的书籍
      cachedBooks.forEach((book) => {
        recommendedContainer.appendChild(createBookCard(book, true));
      });
      return;
    }

    // 如果没有缓存或缓存失效，从API获取
    console.log('缓存无效，从API获取推荐书籍数据');

    // 注意：不再在这里显示加载状态，因为已在初始化时显示

    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 获取AI推荐书籍，如果用户已登录则获取个性化推荐
    const endpoint = token ? '/api/ai/personal-recommendations' : '/api/ai/recommended';
    console.log(`请求AI推荐接口: ${API_BASE_URL}${endpoint}`);

    // 开始计时
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}${endpoint}?limit=4`, {
      headers,
      credentials: 'same-origin',
      signal: controller.signal,
    });

    // 清除超时
    clearTimeout(timeoutId);

    // 计算响应时间
    const responseTime = Date.now() - startTime;
    console.log(`AI推荐接口响应时间: ${responseTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API响应错误:', response.status, errorText);
      throw new Error(`获取推荐书籍失败: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('API原始响应:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('解析JSON失败:', parseError);
      throw new Error('解析响应数据失败');
    }

    console.log('解析后的推荐书籍数据:', data);

    // 清空加载状态
    recommendedContainer.innerHTML = '';

    // 处理不同的API响应结构
    let books = [];
    if (data.success && data.data && data.data.length > 0) {
      books = data.data;
    } else if (data.books && data.books.length > 0) {
      books = data.books;
    } else if (Array.isArray(data) && data.length > 0) {
      books = data;
    }

    // 标准化处理每本书的数据格式
    const standardizedBooks = books.map((book) => {
      return {
        id: book.id || book._id || book.title || '',
        title: book.title || book.name || '未知书名',
        author: book.author || '未知作者',
        tags: Array.isArray(book.tags)
          ? book.tags
          : Array.isArray(book.categories)
            ? book.categories
            : typeof book.tags === 'string'
              ? book.tags.split(',').map((tag) => tag.trim())
              : typeof book.categories === 'string'
                ? book.categories.split(',').map((tag) => tag.trim())
                : [],
        coverUrl: book.coverUrl || book.cover || '',
        introduction: book.introduction || book.description || '',
        popularity: book.popularity || book.heat || 0,
        rating: book.rating || (Math.floor(Math.random() * 10) + 38) / 10,
      };
    });

    // 渲染书籍
    if (standardizedBooks.length > 0) {
      console.log(`渲染${standardizedBooks.length}本推荐书籍:`, standardizedBooks);

      // 缓存获取到的书籍数据
      cacheData(CACHE_KEYS.RECOMMENDED_BOOKS, standardizedBooks);
      // 保存当前的用户登录状态
      const currentToken = localStorage.getItem(CACHE_KEYS.USER_TOKEN) || '';
      localStorage.setItem('cachedToken', currentToken);

      standardizedBooks.forEach((book) => {
        recommendedContainer.appendChild(createBookCard(book, true));
      });
    } else {
      console.warn('没有获取到推荐书籍数据');
      showError(recommendedContainer, '暂无推荐书籍');
    }
  } catch (error) {
    console.error('加载推荐书籍错误:', error);
    const recommendedContainer = document.querySelector('#recommended-books');
    if (recommendedContainer) {
      showError(recommendedContainer, '加载推荐书籍失败');
    }
  }
}

/**
 * 加载热门书籍
 */
async function loadPopularBooks() {
  try {
    console.log('开始加载热门书籍...');
    const popularContainer = document.querySelector('#popular-books');
    if (!popularContainer) {
      console.error('未找到热门书籍容器元素');
      return;
    }

    // 尝试从缓存加载数据
    const cachedBooks = getCachedData(CACHE_KEYS.POPULAR_BOOKS);
    if (cachedBooks && cachedBooks.length > 0) {
      console.log('使用缓存的热门书籍数据');
      // 清空加载状态
      popularContainer.innerHTML = '';

      // 渲染缓存的书籍
      cachedBooks.forEach((book) => {
        popularContainer.appendChild(createBookCard(book));
      });
      return;
    }

    // 如果没有缓存或缓存失效，从API获取
    console.log('缓存无效，从API获取热门书籍数据');

    // 注意：不再在这里显示加载状态，因为已在初始化时显示

    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // 获取热门书籍
    console.log(`请求热门书籍接口: ${API_BASE_URL}/api/ai/popular`);

    // 开始计时
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/api/ai/popular?limit=4`, {
      credentials: 'same-origin',
      signal: controller.signal,
    });

    // 清除超时
    clearTimeout(timeoutId);

    // 计算响应时间
    const responseTime = Date.now() - startTime;
    console.log(`热门书籍接口响应时间: ${responseTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API响应错误:', response.status, errorText);
      throw new Error(`获取热门书籍失败: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('API原始响应:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('解析JSON失败:', parseError);
      throw new Error('解析响应数据失败');
    }

    console.log('解析后的热门书籍数据:', data);

    // 清空加载状态
    popularContainer.innerHTML = '';

    // 处理不同的API响应结构
    let books = [];
    if (data.success && data.data && data.data.length > 0) {
      books = data.data;
    } else if (data.books && data.books.length > 0) {
      books = data.books;
    } else if (Array.isArray(data) && data.length > 0) {
      books = data;
    }

    // 标准化处理每本书的数据格式
    const standardizedBooks = books.map((book) => {
      return {
        id: book.id || book._id || book.title || '',
        title: book.title || book.name || '未知书名',
        author: book.author || '未知作者',
        tags: Array.isArray(book.tags)
          ? book.tags
          : Array.isArray(book.categories)
            ? book.categories
            : typeof book.tags === 'string'
              ? book.tags.split(',').map((tag) => tag.trim())
              : typeof book.categories === 'string'
                ? book.categories.split(',').map((tag) => tag.trim())
                : [],
        coverUrl: book.coverUrl || book.cover || '',
        introduction: book.introduction || book.description || '',
        popularity: book.popularity || book.heat || 0,
        rating: book.rating || (Math.floor(Math.random() * 10) + 38) / 10,
      };
    });

    // 渲染书籍
    if (standardizedBooks.length > 0) {
      console.log(`渲染${standardizedBooks.length}本热门书籍:`, standardizedBooks);

      // 缓存获取到的书籍数据
      cacheData(CACHE_KEYS.POPULAR_BOOKS, standardizedBooks);
      // 保存当前的用户登录状态
      const currentToken = localStorage.getItem(CACHE_KEYS.USER_TOKEN) || '';
      localStorage.setItem('cachedToken', currentToken);

      standardizedBooks.forEach((book) => {
        popularContainer.appendChild(createBookCard(book));
      });
    } else {
      console.warn('没有获取到热门书籍数据');
      showError(popularContainer, '暂无热门书籍');
    }
  } catch (error) {
    console.error('加载热门书籍错误:', error);
    const popularContainer = document.querySelector('#popular-books');
    if (popularContainer) {
      if (error.name === 'AbortError') {
        showError(popularContainer, 'AI热门数据加载超时，请稍后再试');
      } else {
        showError(popularContainer, '加载热门书籍失败，请稍后再试');
      }
    }
  }
}

/**
 * 创建书籍卡片
 * @param {Object} book - 书籍信息
 * @param {boolean} isAiRecommended - 是否为AI推荐书籍
 * @returns {HTMLElement} - 书籍卡片元素
 */
function createBookCard(book, isAiRecommended = false) {
  // 数据兼容处理 - 统一处理字段名称差异
  const bookData = {
    id: book.id || book._id || book.title || '',
    title: book.title || book.name || '未知书名',
    author: book.author || '未知作者',
    tags: book.tags || book.categories || [],
    coverUrl: book.coverUrl || book.cover || '',
    introduction: book.introduction || book.description || '暂无简介',
    popularity: book.popularity || book.heat || 0,
    rating: book.rating || (Math.floor(Math.random() * 10) + 38) / 10, // 如果没有评分，生成3.8-4.8之间的随机评分
  };

  // 确保标签始终是数组格式
  if (!Array.isArray(bookData.tags)) {
    if (typeof bookData.tags === 'string') {
      bookData.tags = bookData.tags.split(',').map((tag) => tag.trim());
    } else {
      bookData.tags = [];
    }
  }

  // 生成评分星星
  const fullStars = Math.floor(bookData.rating);
  const hasHalfStar = bookData.rating - fullStars >= 0.5;
  let starsHtml = '';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      starsHtml += '<i class="fas fa-star"></i>'; // 实心星星
    } else if (i === fullStars && hasHalfStar) {
      starsHtml += '<i class="fas fa-star-half-alt"></i>'; // 半星
    } else {
      starsHtml += '<i class="far fa-star"></i>'; // 空心星星
    }
  }

  // 准备简介内容，处理过长的情况
  const shortIntro = bookData.introduction.length > 120 
    ? bookData.introduction.substring(0, 120) + '...' 
    : bookData.introduction;

  // 按照新的设计要求创建卡片结构
  const cardHtml = `
    <div class="book-card">
      <div class="book-card-content">
        <!-- 书籍封面区域 -->
        <div class="book-cover-container">
          ${createBookCoverElement(bookData)}
        </div>
        
        <!-- 书籍信息区域 -->
        <div class="book-info-container">
          <h3 class="book-title">${bookData.title}</h3>
          <p class="book-author">${bookData.author}</p>
          
          <!-- 评分区域 -->
          <div class="book-rating-container">
            <div class="rating-stars">${starsHtml}</div>
            <span class="rating-score">${bookData.rating.toFixed(1)}</span>
          </div>

          <!-- 简介区域 -->
          <div class="tooltip">
            <div class="book-introduction">${shortIntro}</div>
            <div class="tooltip-text">${bookData.introduction}</div>
          </div>
        </div>
        
        <!-- 操作按钮区域 -->
        <div class="book-actions">
          <a href="/src/pages/book.html?id=${encodeURIComponent(bookData.id || bookData.title)}" class="btn btn-read">阅读</a>
          <button class="btn btn-add-shelf" onclick="addToBookshelf('${encodeURIComponent(bookData.id || bookData.title)}')">加入书架</button>
        </div>
      </div>
    </div>
  `;

  // 使用临时容器创建DOM元素
  const temp = document.createElement('div');
  temp.innerHTML = cardHtml.trim();

  return temp.firstChild;
}

/**
 * 创建书籍封面元素
 * @param {Object} bookData - 书籍数据
 * @returns {string} - 书籍封面HTML
 */
function createBookCoverElement(bookData) {
  // 如果有封面URL，显示封面图片
  if (bookData.coverUrl && bookData.coverUrl.trim() !== '') {
    return `<img src="${bookData.coverUrl}" alt="${bookData.title}" class="book-cover-image">`;
  }
  
  // 获取书籍分类，用于确定图标类型
  const categories = bookData.tags || [];
  const mainCategory = getMainCategory(categories);
  
  // 返回与分类相关的图标
  return `
    <div class="book-cover-placeholder">
      ${getIconByCategory(mainCategory)}
      <span class="book-placeholder-text">${bookData.title.substring(0, 2)}</span>
    </div>
  `;
}

/**
 * 获取主分类
 * @param {Array|string} categories - 分类数组或字符串
 * @returns {string} - 主分类名称
 */
function getMainCategory(categories) {
  if (!categories) return '默认';

  if (Array.isArray(categories) && categories.length > 0) {
    return categories[0];
  } else if (typeof categories === 'string') {
    try {
      const parsedCategories = JSON.parse(categories);
      if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
        return parsedCategories[0];
      }
    } catch (e) {
      return categories;
    }
  }

  return '默认';
}

/**
 * 根据分类获取图标
 * @param {string} category - 分类名称
 * @returns {string} - SVG图标HTML
 */
function getIconByCategory(category) {
  // 映射分类到图标
  const iconMap = {
    人工智能:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><circle cx="12" cy="12" r="5"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.93 4.93l2.12 2.12"/><path d="M16.95 16.95l2.12 2.12"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.93 19.07l2.12-2.12"/><path d="M16.95 7.05l2.12-2.12"/></svg>',
    计算机科学:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6"/><path d="M9 12h6"/><path d="M9 15h6"/></svg>',
    历史: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    人类学:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><path d="M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/></svg>',
    未来学:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    心理学:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><path d="M12 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/><path d="M12 16v4"/><path d="M8 20h8"/></svg>',
    哲学: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><path d="M12 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/><path d="M12 16v4"/><path d="M8 20h8"/></svg>',
    经济学:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><path d="M3 3v18h18"/><path d="M19 9l-5-5-4 4-4-4"/></svg>',
    文学:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    默认: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="50" height="50"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  };

  return iconMap[category] || iconMap['默认'];
}

/**
 * 根据分类获取背景色
 * @param {Array|string} categories - 分类数组或字符串
 * @returns {string} - 背景色十六进制代码
 */
function getBgColorByCategory(categories) {
  const mainCategory = getMainCategory(categories);

  const colorMap = {
    人工智能: '#3B82F6', // 蓝色
    计算机科学: '#3B82F6', // 蓝色
    科幻: '#8B5CF6', // 紫色
    未来学: '#8B5CF6', // 紫色
    历史: '#F59E0B', // 琥珀色
    人类学: '#F59E0B', // 琥珀色
    心理学: '#22C55E', // 绿色
    哲学: '#22C55E', // 绿色
    文学: '#EF4444', // 红色
    经济学: '#06B6D4', // 青色
    默认: '#3B82F6', // 默认蓝色
  };

  return colorMap[mainCategory] || colorMap['默认'];
}

/**
 * 添加书籍到书架（占位函数）
 * @param {string} bookId - 书籍ID或标题
 */
function addToBookshelf(bookId) {
  console.log('添加书籍到书架:', decodeURIComponent(bookId));
  // 这里可以添加实际的添加到书架逻辑
  alert('已添加《' + decodeURIComponent(bookId) + '》到书架');
}

/**
 * 显示加载状态
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 加载消息
 */
function showLoadingState(container, message = '正在加载...') {
  container.innerHTML = '';

  // 添加加载消息
  const loadingMessage = document.createElement('div');
  loadingMessage.className = 'loading-message';
  loadingMessage.innerHTML = `
    <div class="loading-indicator${message.includes('AI') ? ' ai' : ''}">
      <svg class="loading-spinner" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3"></circle>
      </svg>
      <span>${message}</span>
    </div>
  `;
  container.appendChild(loadingMessage);

  // 添加骨架屏
  const gridCols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1;

  for (let i = 0; i < 4; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'book-card-skeleton';

    skeleton.innerHTML = `
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-author"></div>
      <div class="skeleton-introduction"></div>
      <div class="skeleton-tags"></div>
    `;
    container.appendChild(skeleton);
  }

  // 添加一些随机性使骨架屏看起来更自然
  const skeletons = container.querySelectorAll('.book-card-skeleton');
  skeletons.forEach((skeleton) => {
    // 给每个骨架屏添加随机延迟动画
    const randomDelay = Math.random() * 0.5;
    skeleton.style.animationDelay = `${randomDelay}s`;
  });
}

/**
 * 显示错误信息
 * @param {HTMLElement} container - 容器元素
 * @param {String} message - 错误信息
 */
function showError(container, message) {
  container.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
    </div>
  `;
}
