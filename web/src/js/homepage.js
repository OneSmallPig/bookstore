/**
 * 首页功能脚本
 * 负责加载AI推荐书籍和热门书籍
 */

// API基础URL配置 - 使用相对路径，通过Vite代理访问后端
const API_BASE_URL = '';

// 最长请求超时时间（毫秒）
const REQUEST_TIMEOUT = 40000;

document.addEventListener('DOMContentLoaded', function() {
  console.log('初始化首页数据加载...');
  
  // 加载推荐书籍
  loadRecommendedBooks();
  
  // 加载热门书籍
  loadPopularBooks();
});

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
    
    // 显示AI正在工作的加载状态
    showLoadingState(recommendedContainer, '正在加载AI推荐书籍...');
    
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    // 检查是否有用户token
    const token = localStorage.getItem('token');
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
    
    // 渲染书籍
    if (data.success && data.data && data.data.length > 0) {
      console.log(`渲染${data.data.length}本推荐书籍`);
      data.data.forEach(book => {
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
    
    // 显示AI正在工作的加载状态
    showLoadingState(popularContainer, '正在获取热门书籍数据...');
    
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
    
    // 渲染书籍
    if (data.success && data.data && data.data.length > 0) {
      console.log(`渲染${data.data.length}本热门书籍`);
      data.data.forEach(book => {
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
  const card = document.createElement('div');
  card.className = 'book-card';
  
  // 构建标签HTML
  let tagsHtml = '';
  if (book.tags && book.tags.length > 0) {
    tagsHtml = book.tags.slice(0, 3).map(tag => 
      `<span class="book-tag">${tag}</span>`
    ).join('');
  }
  
  // 构建热度标签（如果有）
  let popularityBadge = '';
  if (book.popularity && book.popularity > 80) {
    popularityBadge = `<span class="popularity-badge">热度 ${book.popularity}</span>`;
  }
  
  // AI推荐标签
  let aiBadge = '';
  if (isAiRecommended) {
    aiBadge = `<span class="ai-badge"><i class="fas fa-robot"></i> AI推荐</span>`;
  }
  
  // 设置默认封面图片
  let coverUrl = '/src/images/default-book-cover.svg'; 
  
  if (book.coverUrl && book.coverUrl.trim() !== '') {
    // 检查是否是完整URL
    if (book.coverUrl.startsWith('http://') || book.coverUrl.startsWith('https://')) {
      coverUrl = book.coverUrl;
    } else {
      // 相对路径补全
      coverUrl = book.coverUrl.startsWith('/') ? book.coverUrl : `/${book.coverUrl}`;
    }
  }
  
  console.log(`书籍 ${book.title} 使用封面: ${coverUrl}`);
  
  // 构建卡片内容
  card.innerHTML = `
    <a href="#" class="block book-card-link" data-book-title="${book.title}">
      <div class="book-card-image-container">
        <img src="${coverUrl}" alt="${book.title}" class="book-card-image" onerror="this.onerror=null; this.src='/src/images/default-book-cover.svg';">
        ${popularityBadge}
        ${aiBadge}
      </div>
      <div class="book-info">
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">${book.author || '未知作者'}</p>
        <div class="book-tags">
          ${tagsHtml}
        </div>
      </div>
    </a>
  `;
  
  // 添加点击事件处理
  const bookLink = card.querySelector('.book-card-link');
  bookLink.addEventListener('click', (e) => {
    e.preventDefault();
    // 跳转到书籍详情页或搜索结果页
    window.location.href = `/src/pages/search.html?query=${encodeURIComponent(book.title)}`;
  });
  
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
  for (let i = 0; i < 4; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'book-card-skeleton';
    skeleton.innerHTML = `
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-author"></div>
      <div class="skeleton-tags"></div>
    `;
    container.appendChild(skeleton);
  }
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