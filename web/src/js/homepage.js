/**
 * 首页功能脚本
 * 负责加载AI推荐书籍和热门书籍
 */

// 导入API模块
import { aiApi } from './api.js';
import config from './config.js';

// 最长请求超时时间（毫秒）
const REQUEST_TIMEOUT = 40000;

// 缓存配置
const CACHE_KEYS = {
  RECOMMENDED_BOOKS: 'bookstore_recommended_books',
  POPULAR_BOOKS: 'bookstore_popular_books',
  CACHE_TIMESTAMP: 'bookstore_cache_timestamp',
  USER_TOKEN: 'bookstore_auth', // 与auth.js中的AUTH_KEY保持一致
  USER_BOOKSHELF: 'bookstore_user_bookshelf', // 用户书架缓存
};

// 缓存有效期（毫秒）- 设置为1小时
const CACHE_DURATION = 60 * 60 * 1000;

// 在页面开始加载时就立即执行，确保最早显示加载动画
window.onload = function () {
  console.log('页面已完全加载，执行初始化...');
  initHomePage();
  
  // 检查是否需要预先加载图片代理服务
  loadImageProxyIfNeeded();
  
  // 延迟一点时间后检查和修复图片加载问题
  setTimeout(checkAndFixCoverImages, 1000);
  
  // 加载用户书架数据
  loadUserBookshelf();
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
  const currentToken = getUserToken();
  const cachedToken = localStorage.getItem('cachedToken') || '';
  const recommendedCacheTime = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}')[
    CACHE_KEYS.RECOMMENDED_BOOKS
  ];
  const popularCacheTime = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}')[
    CACHE_KEYS.POPULAR_BOOKS
  ];

  console.log('----缓存状态----');
  console.log('当前用户Token:', currentToken ? '已登录' : '未登录', currentToken ? `(${currentToken.substring(0, 10)}...)` : '');
  console.log('缓存的Token:', cachedToken ? '已登录' : '未登录', cachedToken ? `(${cachedToken.substring(0, 10)}...)` : '');
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
    const currentToken = getUserToken();
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
    const token = getUserToken();

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

    // 开始计时
    const startTime = Date.now();

    // 使用API模块发送请求，避免直接使用fetch
    try {
      // 根据用户是否登录选择调用不同的API
      let data;
      if (token) {
        console.log('用户已登录，获取个性化推荐');
        data = await aiApi.getRecommendations({ limit: 4, personalized: true });
      } else {
        console.log('用户未登录，获取通用推荐');
        data = await aiApi.getRecommendations({ limit: 4 });
      }

      // 计算响应时间
      const responseTime = Date.now() - startTime;
      console.log(`AI推荐接口响应时间: ${responseTime}ms`);
      console.log('获取到的推荐书籍数据:', data);

      // 清空加载状态
      recommendedContainer.innerHTML = '';

      // 处理不同的API响应结构
      let books = [];
      if (data && data.success && data.data && data.data.length > 0) {
        books = data.data;
      } else if (data && data.books && data.books.length > 0) {
        books = data.books;
      } else if (Array.isArray(data) && data.length > 0) {
        books = data;
      }

      // 标准化处理每本书的数据格式
      const standardizedBooks = books.map(book => {
        // 处理封面URL
        let coverUrl = '';
        if (book.coverUrl) {
          coverUrl = book.coverUrl;
        } else if (book.cover) {
          coverUrl = book.cover;
        } else if (book.image) {
          coverUrl = book.image;
        } else if (book.imageUrl) {
          coverUrl = book.imageUrl;
        }
        
        // 处理封面URL中的特殊情况
        if (coverUrl) {
          // 记录原始封面URL，便于调试
          console.log('原始封面URL:', coverUrl);
          
          // 处理相对路径
          if (coverUrl.startsWith('/') && !coverUrl.startsWith('//')) {
            coverUrl = coverUrl; // 保持相对路径不变
          }
          
          // 处理不完整的URL（如//example.com/image.jpg）
          if (coverUrl.startsWith('//')) {
            coverUrl = 'https:' + coverUrl;
          }
          
          // 处理没有协议的URL（如www.example.com/image.jpg）
          if (!coverUrl.startsWith('http') && !coverUrl.startsWith('/') && coverUrl.includes('.')) {
            coverUrl = 'https://' + coverUrl;
          }
          
          console.log('处理后的封面URL:', coverUrl);
        }
        
        return {
          id: book.id || book._id || book.title || '',
          title: book.title || book.name || '未知书名',
          author: book.author || '未知作者',
          tags: Array.isArray(book.tags) ? book.tags : 
                Array.isArray(book.categories) ? book.categories : 
                typeof book.tags === 'string' ? book.tags.split(',').map(tag => tag.trim()) :
                typeof book.categories === 'string' ? book.categories.split(',').map(tag => tag.trim()) : [],
          coverUrl: coverUrl,
          introduction: book.introduction || book.description || '暂无简介',
          popularity: book.popularity || book.heat || 0,
          rating: book.rating || (Math.floor(Math.random() * 10) + 38) / 10
        };
      });

      // 渲染书籍
      if (standardizedBooks.length > 0) {
        console.log(`渲染${standardizedBooks.length}本推荐书籍:`, standardizedBooks);

        // 缓存获取到的书籍数据
        cacheData(CACHE_KEYS.RECOMMENDED_BOOKS, standardizedBooks);
        // 保存当前的用户登录状态
        const currentToken = getUserToken();
        localStorage.setItem('cachedToken', currentToken);

        standardizedBooks.forEach((book) => {
          recommendedContainer.appendChild(createBookCard(book, true));
        });
      } else {
        console.warn('没有获取到推荐书籍数据');
        showError(recommendedContainer, '暂无推荐书籍');
      }
    } catch (apiError) {
      console.error('API调用失败:', apiError);
      throw apiError; // 继续抛出以便被外层catch捕获
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

    // 开始计时
    const startTime = Date.now();

    // 使用API模块发送请求，避免直接使用fetch
    try {
      const data = await aiApi.getPopularBooks({ limit: 4 });
      
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      console.log(`热门书籍接口响应时间: ${responseTime}ms`);
      console.log('获取到的热门书籍数据:', data);

      // 清空加载状态
      popularContainer.innerHTML = '';

      // 处理不同的API响应结构
      let books = [];
      if (data && data.success && data.data && data.data.length > 0) {
        books = data.data;
      } else if (data && data.books && data.books.length > 0) {
        books = data.books;
      } else if (Array.isArray(data) && data.length > 0) {
        books = data;
      }

      // 标准化处理每本书的数据格式
      const standardizedBooks = books.map(book => {
        // 处理封面URL
        let coverUrl = '';
        if (book.coverUrl) {
          coverUrl = book.coverUrl;
        } else if (book.cover) {
          coverUrl = book.cover;
        } else if (book.image) {
          coverUrl = book.image;
        } else if (book.imageUrl) {
          coverUrl = book.imageUrl;
        }
        
        // 处理封面URL中的特殊情况
        if (coverUrl) {
          // 记录原始封面URL，便于调试
          console.log('原始封面URL:', coverUrl);
          
          // 处理相对路径
          if (coverUrl.startsWith('/') && !coverUrl.startsWith('//')) {
            coverUrl = coverUrl; // 保持相对路径不变
          }
          
          // 处理不完整的URL（如//example.com/image.jpg）
          if (coverUrl.startsWith('//')) {
            coverUrl = 'https:' + coverUrl;
          }
          
          // 处理没有协议的URL（如www.example.com/image.jpg）
          if (!coverUrl.startsWith('http') && !coverUrl.startsWith('/') && coverUrl.includes('.')) {
            coverUrl = 'https://' + coverUrl;
          }
          
          console.log('处理后的封面URL:', coverUrl);
        }
        
        return {
          id: book.id || book._id || book.title || '',
          title: book.title || book.name || '未知书名',
          author: book.author || '未知作者',
          tags: Array.isArray(book.tags) ? book.tags : 
                Array.isArray(book.categories) ? book.categories : 
                typeof book.tags === 'string' ? book.tags.split(',').map(tag => tag.trim()) :
                typeof book.categories === 'string' ? book.categories.split(',').map(tag => tag.trim()) : [],
          coverUrl: coverUrl,
          introduction: book.introduction || book.description || '暂无简介',
          popularity: book.popularity || book.heat || 0,
          rating: book.rating || (Math.floor(Math.random() * 10) + 38) / 10
        };
      });

      // 渲染书籍
      if (standardizedBooks.length > 0) {
        console.log(`渲染${standardizedBooks.length}本热门书籍:`, standardizedBooks);

        // 缓存获取到的书籍数据
        cacheData(CACHE_KEYS.POPULAR_BOOKS, standardizedBooks);
        // 保存当前的用户登录状态
        const currentToken = getUserToken();
        localStorage.setItem('cachedToken', currentToken);

        standardizedBooks.forEach((book) => {
          popularContainer.appendChild(createBookCard(book));
        });
      } else {
        console.warn('没有获取到热门书籍数据');
        showError(popularContainer, '暂无热门书籍');
      }
    } catch (apiError) {
      console.error('API调用失败:', apiError);
      throw apiError; // 继续抛出以便被外层catch捕获
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
    
  // 检查书籍是否已在书架中
  const isInBookshelf = checkBookInBookshelf(bookData.id) || checkBookInBookshelf(bookData.title);
  
  // 准备加入书架按钮的状态
  const shelfBtnClass = isInBookshelf ? 'btn btn-add-shelf added' : 'btn btn-add-shelf';
  const shelfBtnText = isInBookshelf ? '已加入书架' : '加入书架';
  const shelfBtnDisabled = isInBookshelf ? 'disabled' : '';

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
          <button class="${shelfBtnClass}" onclick="addToBookshelf('${encodeURIComponent(bookData.id || bookData.title)}')" ${shelfBtnDisabled}>${shelfBtnText}</button>
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
 * 检查书籍是否在书架中
 * @param {string} bookId - 书籍ID或书名
 * @returns {boolean} - 是否在书架中
 */
function checkBookInBookshelf(bookId) {
  try {
    const bookshelfData = localStorage.getItem(CACHE_KEYS.USER_BOOKSHELF);
    if (!bookshelfData) return false;
    
    const bookshelfMap = JSON.parse(bookshelfData);
    return !!bookshelfMap[bookId];
  } catch (error) {
    console.error('检查书籍是否在书架中出错:', error);
    return false;
  }
}

/**
 * 创建书籍封面元素
 * @param {Object} bookData - 书籍数据
 * @returns {string} - 书籍封面HTML
 */
function createBookCoverElement(bookData) {
  // 增强日志，便于调试封面问题
  console.log('处理书籍封面:', bookData.title, '封面URL:', bookData.coverUrl);
  
  // 检查封面URL是否有效，处理更多可能的格式
  if (bookData.coverUrl && typeof bookData.coverUrl === 'string' && bookData.coverUrl.trim() !== '') {
    let coverUrl = bookData.coverUrl.trim();
    
    // 处理相对路径
    if (coverUrl.startsWith('/') && !coverUrl.startsWith('//')) {
      coverUrl = coverUrl; // 保持相对路径不变
    }
    
    // 如果是不完整的URL（如//example.com/image.jpg），添加https:
    if (coverUrl.startsWith('//')) {
      coverUrl = 'https:' + coverUrl;
    }
    
    // 检测是否为豆瓣或其他可能有防盗链的图片
    const isDoubanImage = coverUrl.includes('douban') || coverUrl.includes('doubanio');
    
    // 确保URL是安全的
    try {
      new URL(coverUrl); // 尝试创建URL对象，如果无效会抛出错误
      console.log('有效的封面URL:', coverUrl);
      
      // 根据是否为豆瓣图片选择不同的处理方式
      if (isDoubanImage) {
        console.log('检测到豆瓣图片，添加代理处理标记');
        
        // 直接返回图片元素，但添加data-use-proxy属性
        return `<img src="${coverUrl}" alt="${bookData.title}" class="book-cover-image" 
                data-original-src="${coverUrl}" 
                data-use-proxy="true"
                onerror="this.onerror=null; handleImageError(this);">`;
      } else {
        // 非豆瓣图片，正常加载
        return `<img src="${coverUrl}" alt="${bookData.title}" class="book-cover-image" 
                onerror="this.onerror=null; handleImageError(this);">`;
      }
    } catch (e) {
      console.warn('无效的封面URL:', coverUrl, e);
      // 如果URL无效，使用占位符
      return createCoverPlaceholder(bookData);
    }
  }
  
  // 使用封面占位符
  return createCoverPlaceholder(bookData);
}

/**
 * 创建封面占位符
 * @param {Object} bookData - 书籍数据
 * @returns {string} - 占位符HTML
 */
function createCoverPlaceholder(bookData) {
  // 获取书籍分类，用于确定图标类型
  const categories = bookData.tags || [];
  const mainCategory = getMainCategory(categories);
  console.log('使用占位图标，分类:', mainCategory);
  
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
 * 添加书籍到书架
 * @param {string} bookId - 书籍ID或标题
 */
function addToBookshelf(bookId) {
  console.log('添加书籍到书架:', decodeURIComponent(bookId));
  
  // 防止重复点击，使用一个标记来跟踪是否已经在处理中
  if (window.isAddingToBookshelf) {
    console.log('已有添加请求正在处理中，忽略重复点击');
    return;
  }
  
  window.isAddingToBookshelf = true;
  
  try {
    // 检查用户是否登录
    const authData = localStorage.getItem('bookstore_auth');
    if (!authData) {
      console.log('用户未登录，显示登录提示');
      if (window.showErrorMessage) {
        window.showErrorMessage('请先登录后再将书籍加入书架');
      } else {
        alert('请先登录后再将书籍加入书架');
      }
      window.isAddingToBookshelf = false;
      return;
    }
    
    // 解码书籍ID（如果需要）
    let decodedBookId = bookId;
    if (bookId.includes('%')) {
      decodedBookId = decodeURIComponent(bookId);
    }
    
    // 获取token
    const token = JSON.parse(authData).token;
    if (!token) {
      console.error('未找到有效的认证令牌');
      if (window.showErrorMessage) {
        window.showErrorMessage('认证信息无效，请重新登录');
      } else {
        alert('认证信息无效，请重新登录');
      }
      window.isAddingToBookshelf = false;
      return;
    }
    
    // 获取API基础URL（从config中获取或使用默认值）
    let apiBaseUrl = '';
    if (window.config && window.config.api && window.config.api.baseUrl) {
      apiBaseUrl = window.config.api.baseUrl;
    } else {
      // 使用相对路径，让代理正常工作
      apiBaseUrl = '/api';
    }
    
    // 显示加载状态 - 只获取当前点击的按钮，通过event对象
    const btn = document.querySelector(`.btn-add-shelf[onclick*="${bookId}"]:not(.added)`);
    if (!btn) {
      console.log('未找到对应按钮或按钮已标记为added');
      window.isAddingToBookshelf = false;
      return;
    }
    
    const originalText = btn.textContent;
    btn.textContent = '添加中...';
    btn.disabled = true;
    
    // 发送请求到API - 按照后端错误信息修改请求参数
    fetch(`${apiBaseUrl}/books/${decodedBookId}/bookshelf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        readingStatus: '未开始',
        currentPage: 0,
        author: '未知作者'  // 确保提供作者信息，以防书籍不存在需要创建
      })
    })
    .then(response => {
      // 将响应转换为JSON
      return response.json().then(data => {
        // 返回一个包含状态和数据的对象
        return {
          ok: response.ok,
          status: response.status,
          data: data
        };
      });
    })
    .then(result => {
      // 处理不同的响应状态
      if (result.ok) {
        // 成功添加到书架
        console.log('添加书籍成功:', result.data);
        btn.textContent = '已加入书架';
        btn.classList.add('added');
        btn.disabled = true;
        
        // 更新所有相同书籍的按钮状态
        document.querySelectorAll(`.btn-add-shelf[onclick*="${bookId}"]`).forEach(otherBtn => {
          if (otherBtn !== btn) {
            otherBtn.textContent = '已加入书架';
            otherBtn.classList.add('added');
            otherBtn.disabled = true;
          }
        });
        
        // 更新本地书架缓存
        updateLocalBookshelfCache(decodedBookId);
        
        // 显示成功消息
        if (window.showSuccessMessage) {
          window.showSuccessMessage('成功添加到书架');
        } else {
          alert('成功添加《' + decodedBookId + '》到书架');
        }
      } else if (result.status === 400 && result.data.message === "该书籍已在您的书架中") {
        // 书籍已在书架中，也视为"成功"状态
        console.log('书籍已在书架中:', result.data);
        btn.textContent = '已加入书架';
        btn.classList.add('added');
        btn.disabled = true;
        
        // 更新所有相同书籍的按钮状态
        document.querySelectorAll(`.btn-add-shelf[onclick*="${bookId}"]`).forEach(otherBtn => {
          if (otherBtn !== btn) {
            otherBtn.textContent = '已加入书架';
            otherBtn.classList.add('added');
            otherBtn.disabled = true;
          }
        });
        
        // 更新本地书架缓存
        updateLocalBookshelfCache(decodedBookId);
        
        // 显示信息
        if (window.showInfoMessage) {
          window.showInfoMessage(result.data.message);
        } else if (window.showSuccessMessage) {
          window.showSuccessMessage(result.data.message);
        } else {
          alert(result.data.message);
        }
      } else {
        // 其他错误
        console.error('添加书籍失败:', result);
        btn.textContent = originalText;
        btn.disabled = false;
        
        const errorMessage = result.data && result.data.message 
          ? result.data.message 
          : '添加书籍失败，请稍后重试';
        
        if (window.showErrorMessage) {
          window.showErrorMessage(errorMessage);
        } else {
          alert(errorMessage);
        }
      }
    })
    .catch(error => {
      console.error('添加书籍请求失败:', error);
      btn.textContent = originalText;
      btn.disabled = false;
      
      if (window.showErrorMessage) {
        window.showErrorMessage(error.message || '添加书籍失败，请稍后重试');
      } else {
        alert(error.message || '添加书籍失败，请稍后重试');
      }
    })
    .finally(() => {
      // 请求完成后，重置标记
      window.isAddingToBookshelf = false;
    });
  } catch (error) {
    console.error('添加书籍到书架出错:', error);
    if (window.showErrorMessage) {
      window.showErrorMessage('添加书籍到书架时发生错误，请稍后再试');
    } else {
      alert('添加书籍到书架时发生错误，请稍后再试');
    }
    // 确保发生错误时也重置标记
    window.isAddingToBookshelf = false;
  }
}

// 将addToBookshelf函数暴露到全局作用域
window.addToBookshelf = addToBookshelf;

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

/**
 * 检查并修复书籍封面图片加载问题
 */
function checkAndFixCoverImages() {
  console.log('检查所有书籍封面图片...');
  const coverImages = document.querySelectorAll('.book-cover-image');
  
  coverImages.forEach((img, index) => {
    // 检查图片是否已经加载或加载失败
    if (img.complete) {
      if (img.naturalHeight === 0) {
        console.warn(`封面图片 #${index} 加载失败:`, img.src);
        handleImageError(img);
      } else {
        console.log(`封面图片 #${index} 加载成功:`, img.src);
      }
    } else {
      // 图片尚未加载完毕，添加事件监听器
      img.addEventListener('load', () => {
        console.log(`封面图片 #${index} 延迟加载成功:`, img.src);
      });
      
      img.addEventListener('error', () => {
        console.warn(`封面图片 #${index} 加载失败:`, img.src);
        handleImageError(img);
      });
    }
  });
}

/**
 * 处理图片加载错误
 * @param {HTMLImageElement} img - 图片元素
 */
function handleImageError(img) {
  console.warn('图片加载失败，尝试使用备用方法:', img.src);
  
  // 获取原始URL
  const originalUrl = img.dataset.originalSrc || img.src;
  
  // 检查是否为豆瓣图片
  const isDoubanImage = originalUrl.includes('douban') || originalUrl.includes('doubanio');
  
  // 检查ImageProxy模块是否可用
  if (window.ImageProxy && (isDoubanImage || img.dataset.useProxy === 'true')) {
    // 如果是豆瓣图片且未尝试过代理，使用代理服务
    if (!img.dataset.triedProxy || img.dataset.triedProxy !== 'all') {
      console.log('尝试使用图片代理服务加载豆瓣图片');
      // 标记已尝试过代理
      img.dataset.triedProxy = 'all';
      img.dataset.useProxy = 'true';
      // 使用图片代理服务
      window.ImageProxy.handleImageWithProxy(img, originalUrl);
      return; // 尝试使用代理加载，不立即显示占位符
    }
  }
  
  // 如果图片代理服务不可用或代理失败，使用默认占位符
  const title = img.alt || '未知书名';
  const placeholder = document.createElement('div');
  placeholder.className = 'book-cover-placeholder';
  placeholder.innerHTML = `
    ${getIconByCategory('默认')}
    <span class="book-placeholder-text">${title.substring(0, 2)}</span>
  `;
  
  // 替换图片元素
  if (img.parentNode) {
    img.parentNode.replaceChild(placeholder, img);
  }
}

/**
 * 如果需要，加载图片代理服务模块
 */
function loadImageProxyIfNeeded() {
  if (window.ImageProxy) {
    console.log('图片代理服务模块已加载');
    processDoubanImages();
    return;
  }

  // 动态加载图片代理模块
  const script = document.createElement('script');
  script.src = '/src/js/imageProxy.js';
  script.onload = function() {
    console.log('图片代理服务模块加载成功');
    // 处理豆瓣图片
    processDoubanImages();
  };
  script.onerror = function() {
    console.error('加载图片代理服务模块失败');
  };
  document.head.appendChild(script);
}

/**
 * 处理页面中所有的豆瓣图片
 */
function processDoubanImages() {
  if (!window.ImageProxy) return;
  
  // 查找所有标记为需要使用代理的图片
  const proxyImages = document.querySelectorAll('img[data-use-proxy="true"]');
  console.log(`找到${proxyImages.length}张需要代理处理的图片`);
  
  proxyImages.forEach(img => {
    const originalUrl = img.dataset.originalSrc;
    if (originalUrl) {
      console.log('使用代理处理图片:', originalUrl);
      // 使用第一个代理服务尝试加载
      window.ImageProxy.handleImageWithProxy(img, originalUrl);
    }
  });
}

/**
 * 从localStorage中获取用户token
 * @returns {string} 用户token或空字符串
 */
function getUserToken() {
  const authData = localStorage.getItem(CACHE_KEYS.USER_TOKEN);
  console.log('获取用户认证数据:', authData);
  
  if (!authData) {
    console.log('未找到用户认证数据');
    return '';
  }
  
  try {
    const authObj = JSON.parse(authData);
    console.log('解析用户认证对象:', authObj);
    
    const token = authObj.token || '';
    console.log('提取token:', token ? '已获取' : '未获取');
    
    return token;
  } catch (error) {
    console.error('解析用户认证数据失败:', error);
    return '';
  }
}

/**
 * 获取用户书架中的所有书籍
 */
async function loadUserBookshelf() {
  try {
    // 检查用户是否登录
    const token = getUserToken();
    if (!token) {
      console.log('用户未登录，无法获取书架数据');
      return;
    }
    
    // 获取API基础URL
    let apiBaseUrl = '';
    if (window.config && window.config.api && window.config.api.baseUrl) {
      apiBaseUrl = window.config.api.baseUrl;
    } else {
      apiBaseUrl = '/api';
    }
    
    console.log('正在获取用户书架数据...');
    
    // 发送请求获取用户书架
    const response = await fetch(`${apiBaseUrl}/users/me/bookshelf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`获取书架数据失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.bookshelf && Array.isArray(data.bookshelf)) {
      console.log(`获取到${data.bookshelf.length}本书架书籍`, data.bookshelf);
      
      // 创建书籍ID集合，便于快速查找
      const bookshelfMap = {};
      data.bookshelf.forEach(item => {
        if (item.book) {
          // 使用书籍ID和书名作为键，确保可以通过两种方式查找
          bookshelfMap[item.book.id] = true;
          bookshelfMap[item.book.title] = true;
        }
      });
      
      // 将书架数据存入缓存
      localStorage.setItem(CACHE_KEYS.USER_BOOKSHELF, JSON.stringify(bookshelfMap));
      
      // 更新页面上所有书籍的状态
      updateAllBookCardsStatus();
    }
  } catch (error) {
    console.error('加载用户书架失败:', error);
  }
}

/**
 * 更新所有书籍卡片的状态
 */
function updateAllBookCardsStatus() {
  // 获取书架数据
  const bookshelfData = localStorage.getItem(CACHE_KEYS.USER_BOOKSHELF);
  if (!bookshelfData) return;
  
  const bookshelfMap = JSON.parse(bookshelfData);
  
  // 查找所有加入书架按钮
  const addButtons = document.querySelectorAll('.btn-add-shelf');
  
  addButtons.forEach(btn => {
    // 从onclick属性中提取书籍ID
    const onclickAttr = btn.getAttribute('onclick') || '';
    const matches = onclickAttr.match(/addToBookshelf\(['"]([^'"]+)['"]\)/);
    
    if (matches && matches[1]) {
      const bookId = decodeURIComponent(matches[1]);
      
      // 检查书籍是否在书架中
      if (bookshelfMap[bookId]) {
        btn.textContent = '已加入书架';
        btn.classList.add('added');
        btn.disabled = true;
      }
    }
  });
  
  console.log('已更新所有书籍卡片状态');
}

/**
 * 更新本地书架缓存
 * @param {string} bookId - 书籍ID或书名
 */
function updateLocalBookshelfCache(bookId) {
  try {
    // 获取当前书架缓存
    const bookshelfData = localStorage.getItem(CACHE_KEYS.USER_BOOKSHELF);
    let bookshelfMap = bookshelfData ? JSON.parse(bookshelfData) : {};
    
    // 将书籍添加到缓存
    bookshelfMap[bookId] = true;
    
    // 保存更新后的缓存
    localStorage.setItem(CACHE_KEYS.USER_BOOKSHELF, JSON.stringify(bookshelfMap));
    
    console.log('本地书架缓存已更新');
  } catch (error) {
    console.error('更新本地书架缓存失败:', error);
  }
}

