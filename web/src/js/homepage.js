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
  USER_TOKEN: 'token' // 用于判断用户登录状态
};

// 缓存有效期（毫秒）- 设置为1小时
const CACHE_DURATION = 60 * 60 * 1000;

// 在页面开始加载时就立即执行，确保最早显示加载动画
window.onload = function() {
  console.log('页面已完全加载，执行初始化...');
  initHomePage();
};

// 接收HTML解析事件，在页面结构可用但资源可能尚未加载完成时执行
document.addEventListener('DOMContentLoaded', function() {
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
  const recommendedCacheTime = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}')[CACHE_KEYS.RECOMMENDED_BOOKS];
  const popularCacheTime = JSON.parse(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP) || '{}')[CACHE_KEYS.POPULAR_BOOKS];
  
  console.log('----缓存状态----');
  console.log('当前用户Token:', currentToken ? '已登录' : '未登录');
  console.log('缓存的Token:', cachedToken ? '已登录' : '未登录');
  console.log('推荐书籍缓存时间:', recommendedCacheTime ? new Date(recommendedCacheTime).toLocaleString() : '无缓存');
  console.log('热门书籍缓存时间:', popularCacheTime ? new Date(popularCacheTime).toLocaleString() : '无缓存');
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
    
    if ((wasLoggedIn !== isLoggedIn) || (wasLoggedIn && isLoggedIn && cachedToken !== currentToken)) {
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
      cachedBooks.forEach(book => {
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
    
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    // 获取AI推荐书籍，如果用户已登录则获取个性化推荐
    const endpoint = token ? '/api/ai/personal-recommendations' : '/api/ai/recommended';
    console.log(`请求AI推荐接口: ${API_BASE_URL}${endpoint}`);
    
    // 开始计时
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}?limit=4`, { 
      headers,
      credentials: 'same-origin',
      signal: controller.signal
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
    
    // 渲染书籍
    if (books.length > 0) {
      console.log(`渲染${books.length}本推荐书籍:`, books);
      
      // 缓存获取到的书籍数据
      cacheData(CACHE_KEYS.RECOMMENDED_BOOKS, books);
      // 保存当前的用户登录状态
      const currentToken = localStorage.getItem(CACHE_KEYS.USER_TOKEN) || '';
      localStorage.setItem('cachedToken', currentToken);
      
      books.forEach(book => {
        recommendedContainer.appendChild(createBookCard(book, true));
      });
    } else {
      console.warn('没有获取到推荐书籍数据');
      showError(recommendedContainer, '暂无推荐书籍');
    }
  } catch (error) {
    console.error('加载推荐书籍错误:', error);
    const container = document.querySelector('#recommended-books');
    if (container) {
      if (error.name === 'AbortError') {
        showError(container, 'AI推荐超时，请稍后再试');
      } else {
        showError(container, '加载推荐书籍失败，请稍后再试');
      }
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
      cachedBooks.forEach(book => {
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
      signal: controller.signal
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
    
    // 渲染书籍
    if (books.length > 0) {
      console.log(`渲染${books.length}本热门书籍:`, books);
      
      // 缓存获取到的书籍数据
      cacheData(CACHE_KEYS.POPULAR_BOOKS, books);
      // 保存当前的用户登录状态
      const currentToken = localStorage.getItem(CACHE_KEYS.USER_TOKEN) || '';
      localStorage.setItem('cachedToken', currentToken);
      
      books.forEach(book => {
        popularContainer.appendChild(createBookCard(book));
      });
    } else {
      console.warn('没有获取到热门书籍数据');
      showError(popularContainer, '暂无热门书籍');
    }
  } catch (error) {
    console.error('加载热门书籍错误:', error);
    const container = document.querySelector('#popular-books');
    if (container) {
      if (error.name === 'AbortError') {
        showError(container, 'AI热门数据加载超时，请稍后再试');
      } else {
        showError(container, '加载热门书籍失败，请稍后再试');
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
  console.log('创建书籍卡片:', book);
  
  // 数据兼容处理
  const bookData = {
    title: book.title || book.name || '未知书名',
    author: book.author || '未知作者',
    tags: book.tags || book.categories || [],
    coverUrl: book.coverUrl || book.cover || '',
    introduction: book.introduction || book.description || '',
    popularity: book.popularity || book.heat || 0
  };
  
  // 创建主卡片容器
  const card = document.createElement('div');
  card.className = 'book-card';
  
  // 处理标签
  let tagsHtml = '';
  if (bookData.tags && bookData.tags.length > 0) {
    tagsHtml = bookData.tags.slice(0, 3).map(tag => 
      `<span class="book-tag">${tag}</span>`
    ).join('');
  }
  
  // 热度标签
  let popularityBadge = '';
  if (bookData.popularity && bookData.popularity > 80) {
    popularityBadge = `<span class="popularity-badge">热度 ${bookData.popularity}</span>`;
  }
  
  // AI推荐标签
  let aiBadge = '';
  if (isAiRecommended) {
    aiBadge = `<span class="ai-badge"><i class="fas fa-robot"></i> AI推荐</span>`;
  }
  
  // 处理封面图片
  let coverUrl = '/src/images/default-book-cover.svg'; 
  
  if (bookData.coverUrl && bookData.coverUrl.trim() !== '') {
    // 检查是否是完整URL
    if (bookData.coverUrl.startsWith('http://') || bookData.coverUrl.startsWith('https://')) {
      coverUrl = bookData.coverUrl;
    } else {
      // 相对路径补全
      coverUrl = bookData.coverUrl.startsWith('/') ? bookData.coverUrl : `/${bookData.coverUrl}`;
    }
  }
  
  // 填充卡片内容
  card.innerHTML = `
    <div class="book-card-image-container">
      <img src="${coverUrl}" alt="${bookData.title}" class="book-card-image" onerror="this.onerror=null; this.src='/src/images/default-book-cover.svg';">
      ${popularityBadge}
      ${aiBadge}
    </div>
    <div class="book-info">
      <h3 class="book-title">${bookData.title}</h3>
      <p class="book-author">${bookData.author}</p>
      <div class="book-tags">
        ${tagsHtml}
      </div>
    </div>
  `;
  
  // 添加点击事件
  card.addEventListener('click', (e) => {
    // 跳转到书籍详情页
    window.location.href = `/src/pages/search.html?query=${encodeURIComponent(bookData.title)}`;
  });
  
  // 添加鼠标悬停样式
  card.style.cursor = 'pointer';
  
  return card;
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
  const gridCols = window.innerWidth >= 1024 ? 4 : (window.innerWidth >= 640 ? 2 : 1);
  
  for (let i = 0; i < 4; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'book-card-skeleton';
    
    // 添加AI标签位置
    const hasAiBadge = message.includes('AI') && i < 2;
    const badgeHtml = hasAiBadge ? 
      `<div style="position: absolute; top: 0.5rem; left: 0.5rem; background-color: rgba(49, 130, 206, 0.2); width: 70px; height: 26px; border-radius: 0.25rem;"></div>` : '';
    
    // 添加热度标签位置
    const hasPopularBadge = !message.includes('AI') && i === 0;
    const popularBadgeHtml = hasPopularBadge ? 
      `<div style="position: absolute; top: 0.5rem; right: 0.5rem; background-color: rgba(239, 68, 68, 0.2); width: 60px; height: 26px; border-radius: 0.25rem;"></div>` : '';
    
    skeleton.innerHTML = `
      <div class="skeleton-image">
        ${badgeHtml}
        ${popularBadgeHtml}
      </div>
      <div class="skeleton-title"></div>
      <div class="skeleton-author"></div>
      <div class="skeleton-tags"></div>
    `;
    container.appendChild(skeleton);
  }
  
  // 添加一些随机性使骨架屏看起来更自然
  const skeletons = container.querySelectorAll('.book-card-skeleton');
  skeletons.forEach(skeleton => {
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