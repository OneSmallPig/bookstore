// 导入样式
import '../css/styles.css';

/**
 * 日志控制模块
 * 控制应用程序的日志输出级别，减少不必要的控制台输出
 * - APP_VERBOSE_LOGGING: 设置为true时显示详细日志，false时只显示关键日志
 * - APP_INIT_LOGS: 设置为false可以完全禁用初始化日志输出
 */
window.APP_VERBOSE_LOGGING = false; // 详细日志开关
window.APP_INIT_LOGS = true; // 初始化日志开关

// 封装日志函数，根据日志级别输出
const appLog = {
  // 初始化日志，只在APP_INIT_LOGS为true时输出
  init: (message) => {
    if (window.APP_INIT_LOGS) {
      console.log(message);
    }
  },
  // 详细日志，只在APP_VERBOSE_LOGGING为true时输出
  verbose: (message) => {
    if (window.APP_VERBOSE_LOGGING) {
      console.log(message);
    }
  },
  // 错误日志，始终输出
  error: (message, error) => {
    console.error(message, error);
  },
  // 警告日志，始终输出
  warn: (message) => {
    console.warn(message);
  }
};

appLog.init('main.js 文件已加载');

// 导入API服务
import {
  userApi,
  bookApi,
  bookshelfApi,
  communityApi,
  aiApi
} from './api.js';
import { initAuthListeners, isLoggedIn, requireAuth } from './auth.js';
import { showToast } from './utils.js';
// 导入书籍卡片组件
import BookCard from './components/BookCard.js';
// 导入配置
import config from './config.js';

appLog.init('API服务已导入');

// 导入Alpine.js
import Alpine from 'alpinejs';

// 设置Alpine全局变量
window.Alpine = Alpine;

// 初始化Alpine
Alpine.start();

// 生成星级评分HTML
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  let starsHtml = '';
  
  // 添加实心星星
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="fas fa-star"></i>';
  }
  
  // 添加半星（如果有）
  if (halfStar) {
    starsHtml += '<i class="fas fa-star-half-alt"></i>';
  }
  
  // 添加空心星星
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="far fa-star"></i>';
  }
  
  return starsHtml;
}

// 生成搜索频率指示器HTML
function generateSearchFrequencyIndicator(searchFreq) {
  if (!searchFreq && searchFreq !== 0) return '';
  
  // 搜索频率按照0-100的数值来处理
  const frequency = Math.min(100, Math.max(0, searchFreq));
  
  // 计算有多少个"火焰"图标显示（最多5个）
  const fullFireIcons = Math.floor(frequency / 20); // 每20点一个图标
  
  let fireHtml = '<div class="search-frequency-indicator">';
  
  // 添加火焰图标
  for (let i = 0; i < 5; i++) {
    if (i < fullFireIcons) {
      fireHtml += '<i class="fas fa-fire"></i>'; // 热门图标
    } else {
      fireHtml += '<i class="far fa-circle"></i>'; // 未达热门的占位图标
    }
  }
  
  // 添加文字提示
  let heatText = '';
  if (frequency >= 80) {
    heatText = '非常热门';
  } else if (frequency >= 60) {
    heatText = '热门搜索';
  } else if (frequency >= 40) {
    heatText = '较多搜索';
  } else if (frequency >= 20) {
    heatText = '一般搜索';
  } else {
    heatText = '少量搜索';
  }
  
  fireHtml += `<span class="frequency-text">${heatText}</span></div>`;
  
  return fireHtml;
}

// 导航栏活跃链接处理
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded 事件触发');
  
  // 初始化认证监听器
  initAuthListeners();
  console.log('认证监听器已初始化');
  
  // 加载ImageProxy模块，确保图片代理可用
  loadImageProxyModule();
  
  // 获取当前页面路径
  const currentPath = window.location.pathname;
  console.log('当前页面路径:', currentPath);
  
  // 获取所有导航链接
  const navLinks = document.querySelectorAll('.navbar-link');
  console.log('找到的导航链接数量:', navLinks.length);
  
  // 遍历链接并设置活跃状态
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath || 
        (linkPath !== '/' && currentPath.includes(linkPath))) {
      link.classList.add('active');
    } else if (currentPath !== '/' && linkPath === '/') {
      link.classList.remove('active');
    }
  });
  
  // 移动端菜单切换
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.navbar-menu');
  
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
  }
  
  // 初始化首页功能
  initHomePage();
  
  // 初始化搜索页面
  initSearchPage();
  
  // 初始化书架页面
  initBookshelfPage();
  
  // 初始化书籍详情页面
  initBookDetailPage();
  
  // 初始化个人资料页面
  initProfilePage();
  
  // 初始化社区页面
  initCommunityPage();
  
  // 添加全局点击事件，确保点击页面其他地方时关闭所有菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container') && !e.target.closest('.card-menu-btn')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
        menu.style.display = 'none';
      });
    }
  });
});

// 智能搜索功能
function initSearchPage() {
  appLog.init('初始化搜索页面');
  
  // 如果当前不在搜索页面，则返回
  if (!window.location.pathname.includes('/search')) {
    return;
  }
  
  // 加载ImageProxy模块，确保图片代理服务可用
  loadImageProxyModule();
  
  // 测试API连接
  testApiConnection();
  
  // 如果用户已登录，优先加载用户书架数据
  if (isLoggedIn()) {
    console.log('用户已登录，优先加载书架数据');
    // 强制刷新书架数据，确保拥有最新数据
    loadUserBookshelfData(true).then(() => {
      console.log('搜索页面：已成功加载初始书架数据，共', window.currentBookshelfData?.length || 0, '本书');
      
      // 书架数据加载完成后初始化其余功能
      initSearchPageFeatures();
      
      // 再次确认书架数据结构
      if (window.currentBookshelfData && window.currentBookshelfData.length > 0) {
        const sampleItem = window.currentBookshelfData[0];
        console.log('智能搜索页面 - 书架数据结构检查:', {
          item: sampleItem,
          hasBook: !!sampleItem.book,
          hasBookUpperCase: !!sampleItem.Book,
          bookPath: sampleItem.book ? 'item.book' : (sampleItem.Book ? 'item.Book' : 'item')
        });
      }
    }).catch(err => {
      console.error('加载书架数据失败:', err);
      // 即使加载失败，也要初始化搜索页面功能
      initSearchPageFeatures();
    });
  } else {
    // 未登录用户直接初始化搜索页面功能
    initSearchPageFeatures();
  }
}

// 初始化搜索页面的功能
function initSearchPageFeatures() {
  // 初始化搜索表单
  const searchForm = document.querySelector('.search-form');
  
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const searchInput = document.querySelector('.search-input');
      const query = searchInput ? searchInput.value.trim() : '';
      
      if (!query) {
        showToast('请输入搜索内容', 'warning');
        return;
      }
      
      // 显示加载状态
      const searchResults = document.querySelector('.search-results');
      if (searchResults) {
        // 隐藏初始结果（如果存在）
        const initialResults = document.querySelector('.initial-results');
        if (initialResults) {
          initialResults.style.display = 'none';
        }
        
        // 开始AI搜索流程
        performAISearch(query, searchResults);
      }
    });
  }
  
  // 加载热门搜索
  loadPopularSearches();
  
  // 初始化搜索历史
  initSearchHistory();
  
  // 初始化搜索示例
  initSearchExamples();

  // 刷新书架状态(如果已经加载了书架数据)
  if (isLoggedIn() && window.currentBookshelfData) {
    setTimeout(() => {
      refreshBookshelfStatus();
      console.log('搜索页面初始化完成：已刷新书籍书架状态');
    }, 300);
  }
}

// 加载ImageProxy模块
function loadImageProxyModule() {
  if (window.ImageProxy) {
    if (window.APP_VERBOSE_LOGGING) {
      console.log('ImageProxy模块已加载');
    }
    return;
  }
  
  if (window.APP_VERBOSE_LOGGING) {
    console.log('加载ImageProxy模块...');
  }
  
  // 创建script元素
  const script = document.createElement('script');
  script.src = '../js/imageProxy.js';
  script.async = true;
  script.onload = function() {
    if (window.APP_VERBOSE_LOGGING) {
      console.log('ImageProxy模块加载成功');
    }
  };
  script.onerror = function() {
    console.error('ImageProxy模块加载失败');
  };
  
  // 添加到文档中
  document.head.appendChild(script);
}

// 创建书籍封面元素
function createBookCoverElement(bookData) {
  try {
    const coverUrl = bookData.coverUrl || bookData.cover;
    
    // 如果有封面URL，创建图片元素，确保只加载一次默认图片
    if (coverUrl && typeof coverUrl === 'string') {
      // 检查是否为豆瓣图片
      const isDoubanImage = coverUrl.includes('douban') || coverUrl.includes('doubanio');
      
      // 对于豆瓣图片，直接使用代理URL
      let imgSrc = coverUrl;
      if (isDoubanImage) {
        // 使用images.weserv.nl代理，这是第三个代理服务
        imgSrc = `https://images.weserv.nl/?url=${encodeURIComponent(coverUrl)}`;
      }
      
      // 返回带有适当属性的图片元素
      return `<img src="${imgSrc}" alt="${bookData.title}" class="book-cover w-full h-full object-cover" 
        onerror="window.handleBookCoverError(this)"
        data-original-src="${coverUrl}"
        data-douban-image="${isDoubanImage ? 'true' : 'false'}"
        data-needs-proxy="${isDoubanImage ? 'true' : 'false'}">`;
    }
    
    // 否则直接使用默认封面，不需要error处理
    return `<img src="../images/default-cover.jpg" alt="${bookData.title}" class="book-cover w-full h-full object-cover" data-default-loaded="true">`;
  } catch (error) {
    // 出错时使用默认封面，减少日志输出
    return `<img src="../images/default-cover.jpg" alt="${bookData.title}" class="book-cover w-full h-full object-cover" data-default-loaded="true">`;
  }
}

// 处理书籍封面加载错误
function handleBookCoverError(img) {
  // 检查是否已经加载过默认图片
  if (img.dataset.defaultLoaded === 'true') {
    img.onerror = null; // 防止无限循环
    return;
  }
  
  // 标记已经尝试加载默认图片
  img.dataset.defaultLoaded = 'true';
  
  // 只在详细日志模式或调试模式下输出日志
  if (window.APP_VERBOSE_LOGGING) {
    console.warn('书籍封面加载失败:', img.src);
  }
  
  // 获取原始URL，确保我们有一个可靠的URL来尝试
  const originalUrl = img.dataset.originalSrc || img.src;
  
  // 如果URL已经是默认图片，不再尝试加载
  if (originalUrl.includes('default-book-cover') || 
      originalUrl.includes('/images/default') || 
      !originalUrl) {
    // 已经是默认图片或无效URL，直接使用默认图片
    img.src = '../images/default-cover.jpg';
    img.onerror = null; // 防止无限循环
    return;
  }
  
  // 检查是否为豆瓣图片
  const isDoubanImage = originalUrl.includes('douban') || originalUrl.includes('doubanio');
  
  // 如果ImageProxy模块不可用，则直接使用默认图片
  if (!window.ImageProxy) {
    img.src = '../images/default-cover.jpg';
    img.onerror = null; // 防止无限循环
    return;
  }
  
  // 检查是否已经尝试过所有可用的代理服务
  if (img.dataset.triedAllProxies === 'true') {
    img.src = '../images/default-cover.jpg';
    img.onerror = null; // 防止无限循环
    return;
  }
  
  // 检查ImageProxy模块是否可用
  if (window.ImageProxy && (isDoubanImage || img.dataset.useProxy === 'true')) {
    // 豆瓣图片或指定需要代理的图片，使用代理服务
    
    // 标记正在使用代理
    img.dataset.useProxy = 'true';
    
    try {
      // 使用图片代理服务
      window.ImageProxy.handleImageWithProxy(img, originalUrl);
      return; // 尝试使用代理加载，不立即显示默认图片
    } catch (error) {
      if (window.APP_VERBOSE_LOGGING) {
        console.error('代理加载图片失败:', error);
      }
      // 发生错误时继续执行后续代码
    }
  }
  
  // 如果以上方法都失败，使用默认图片
  img.src = '../images/default-cover.jpg';
  img.onerror = null; // 防止无限循环
  img.dataset.triedAllProxies = 'true'; // 标记已尝试所有方法
}

// 将函数添加到全局作用域
window.handleBookCoverError = handleBookCoverError;

// 测试API连接
async function testApiConnection() {
  try {
    if (window.APP_VERBOSE_LOGGING) {
      console.log('测试API连接...');
      const url = `${config.api.baseUrl}/ai/test?time=${Date.now()}`;
      console.log('测试URL:', url);
    }
    
    const url = `${config.api.baseUrl}/ai/test?time=${Date.now()}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (window.APP_VERBOSE_LOGGING) {
      console.log('API测试结果:', data);
    }
    return data;
  } catch (error) {
    console.error('API测试失败:', error);
    return null;
  }
}

// 加载热门搜索
async function loadPopularSearches() {
  try {
    const initialResultsContainer = document.querySelector('.initial-results .grid');
    if (!initialResultsContainer) return;
    
    appLog.init('开始加载热门搜索数据...');
    
    // 显示加载状态 - 使用统一的加载动画
    showLoadingState(initialResultsContainer, 'AI正在为您推荐热门搜索...');
    
    // 检查缓存
    const cachedData = checkPopularSearchesCache();
    if (cachedData) {
      appLog.verbose('从缓存中获取热门搜索数据');
      renderBooks(cachedData, initialResultsContainer);
      return;
    }
    
    // 尝试从API获取数据
    try {
      appLog.verbose('尝试从API获取热门搜索数据');
      const response = await aiApi.getPopularSearches({ limit: 3 });
      
      if (response && response.data && response.data.length > 0) {
        // 缓存结果
        savePopularSearchesToCache(response.data);
        
        // 渲染结果
        renderBooks(response.data, initialResultsContainer);
        return;
      }
    } catch (apiError) {
      appLog.error('API获取热门搜索失败:', apiError);
    }
    
    // 如果API调用失败，使用本地默认数据
    appLog.verbose('使用默认热门搜索数据');
    const mockData = getDefaultPopularSearches();
    renderBooks(mockData, initialResultsContainer);
    
  } catch (error) {
    appLog.error('加载热门搜索失败:', error);
    const initialResultsContainer = document.querySelector('.initial-results .grid');
    if (initialResultsContainer) {
      initialResultsContainer.innerHTML = '<div class="col-span-3 text-center py-8 text-red-500">加载热门搜索失败，请稍后再试</div>';
    }
  }
}

// 获取默认热门搜索数据
function getDefaultPopularSearches() {
  return [
    {
      id: 'default-book-1',
      title: '深度学习',
      author: '伊恩·古德费洛',
      description: '全球知名人工智能专家联合创作，系统介绍深度学习基础理论和前沿进展。',
      cover: 'https://img3.doubanio.com/view/subject/s/public/s29724111.jpg',
      rating: 4.9,
      categories: ['计算机科学', '人工智能', '机器学习'],
      popularity: 98
    },
    {
      id: 'default-book-2',
      title: '人类简史',
      author: '尤瓦尔·赫拉利',
      description: '从认知革命、农业革命、科学革命到人工智能，重新审视人类发展历程。',
      cover: 'https://img2.doubanio.com/view/subject/s/public/s27814883.jpg',
      rating: 4.7,
      categories: ['历史', '人类学', '哲学'],
      popularity: 96
    },
    {
      id: 'default-book-3',
      title: '未来简史',
      author: '尤瓦尔·赫拉利',
      description: '《人类简史》作者新作，对人类未来的大胆预测与思考，探索科技与人类意识的边界。',
      cover: 'https://img9.doubanio.com/view/subject/s/public/s29287103.jpg',
      rating: 4.6,
      categories: ['未来学', '科技', '哲学'],
      popularity: 92
    }
  ];
}

// 检查热门搜索缓存
function checkPopularSearchesCache() {
  try {
    // 获取缓存数据
    const cachedData = localStorage.getItem(config.cache.keys.POPULAR_SEARCHES);
    if (!cachedData) return null;
    
    const { timestamp, userId, data } = JSON.parse(cachedData);
    
    // 检查缓存是否过期（默认1小时）
    const now = Date.now();
    if (now - timestamp > config.cache.duration) {
      console.log('热门搜索缓存已过期');
      return null;
    }
    
    // 检查用户ID是否匹配（如果已登录）
    const token = getToken();
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = decoded.userId || decoded.id;
        
        if (userId && currentUserId && userId !== currentUserId) {
          console.log('用户已更换，热门搜索缓存无效');
          return null;
        }
      } catch (e) {
        console.error('解析token失败:', e);
      }
    }
    
    return data;
  } catch (error) {
    console.error('检查热门搜索缓存失败:', error);
    return null;
  }
}

// 加载初始AI推荐书籍
async function loadInitialAIRecommendations() {
  try {
    console.log('正在加载初始AI推荐书籍...');
    
    const initialResultsContainer = document.querySelector('.initial-results .grid');
    if (!initialResultsContainer) {
      console.error('找不到初始结果容器');
      return;
    }
    
    // 检查用户是否登录
    const isUserLoggedIn = isLoggedIn();
    console.log('用户登录状态:', isUserLoggedIn ? '已登录' : '未登录');
    
    try {
      // 为未登录用户只请求3本热门书籍，已登录用户请求6本个性化推荐
      if (!isUserLoggedIn) {
        console.log('未登录用户，请求热门书籍...');
        const response = await aiApi.getPopularBooks({ limit: 3 });
        
        if (response && response.data && response.data.length > 0) {
          console.log('成功获取热门书籍:', response.data);
          // 渲染结果
          renderBooks(response.data, initialResultsContainer);
          return;
        }
      } else {
        // 已登录用户，请求个性化推荐
        console.log('已登录用户，请求AI个性化推荐书籍...');
        const response = await aiApi.getRecommendations({ limit: 6 });
        
        if (response && response.data && response.data.length > 0) {
          console.log('成功获取AI推荐书籍:', response.data);
          // 渲染结果
          renderBooks(response.data, initialResultsContainer);
          return;
        } else {
          console.warn('API返回的推荐书籍数据为空');
        }
      }
    } catch (apiError) {
      console.error('获取AI推荐书籍失败:', apiError);
    }
    
    // 如果API调用失败，尝试使用热门搜索数据
    console.log('尝试加载热门搜索数据作为备用...');
    loadPopularSearches();
    
  } catch (error) {
    console.error('加载初始AI推荐书籍失败:', error);
    // 出错时也尝试加载热门搜索
    loadPopularSearches();
  }
}

// 初始化搜索示例按钮
function initSearchExamples() {
  const searchExamples = document.querySelectorAll('.search-example');
  
  searchExamples.forEach(example => {
    example.addEventListener('click', () => {
      const query = example.textContent.trim();
      // 将示例内容填入搜索框
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.value = query;
        
        // 自动执行搜索
        const searchResults = document.querySelector('.search-results');
        const initialResults = document.querySelector('.initial-results');
        
        if (searchResults) {
          if (initialResults) {
            initialResults.style.display = 'none';
          }
          
          performAISearch(query, searchResults);
        }
      }
    });
  });
}

// 保存热门搜索到缓存
function savePopularSearchesToCache(data) {
  try {
    // 当前用户ID（如果已登录）
    const currentUser = getToken() ? JSON.parse(localStorage.getItem(config.cache.keys.AUTH_TOKEN)).userId : null;
    
    // 缓存数据
    const cacheData = {
      timestamp: Date.now(),
      userId: currentUser,
      data: data
    };
    
    // 保存到localStorage
    localStorage.setItem(config.cache.keys.POPULAR_SEARCHES, JSON.stringify(cacheData));
    
    console.log('热门搜索数据已缓存');
  } catch (error) {
    console.error('保存热门搜索缓存失败:', error);
  }
}

// 渲染书籍列表
function renderBooks(books, container) {
  console.log('渲染书籍列表:', books);
  
  if (!books || books.length === 0) {
    container.innerHTML = '<div class="col-span-3 text-center py-8 text-gray-500">暂无热门搜索数据</div>';
    return;
  }
  
  // 确保ImageProxy模块已加载，用于处理豆瓣图片
  loadImageProxyModule();
  
  // 清空容器
  container.innerHTML = '';
  
  // 尝试获取用户书架数据，用于判断书籍是否已在书架中
  let userBookshelfData = [];
  try {
    // 如果已登录，从本地变量获取书架数据
    if (isLoggedIn() && window.currentBookshelfData) {
      userBookshelfData = window.currentBookshelfData;
      console.log('从window.currentBookshelfData获取书架数据:', userBookshelfData.length, '本书');
    }
  } catch (err) {
    console.error('获取书架数据失败:', err);
  }
  
  // 渲染每本书
  books.forEach((book, index) => {
    console.log('渲染书籍:', book.title);
    
    // 创建卡片容器
    const bookCardWrapper = document.createElement('div');
    bookCardWrapper.className = 'book-card-wrapper transform transition duration-500';
    bookCardWrapper.style.opacity = '0';
    bookCardWrapper.style.transform = 'translateY(20px)';
    bookCardWrapper.dataset.id = book.id;
    
    // 为每本书设置不同的动画延迟
    setTimeout(() => {
      bookCardWrapper.style.opacity = '1';
      bookCardWrapper.style.transform = 'translateY(0)';
    }, 100 * index);
    
    // 数据兼容处理 - 统一处理字段名称差异
    const bookData = {
      id: book.id || book._id || '',
      title: book.title || '',
      author: book.author || '未知作者',
      tags: book.tags || book.categories || [],
      coverUrl: book.coverImage || book.cover || book.coverUrl || '../images/default-cover.jpg',
      introduction: book.description || book.introduction || '暂无简介',
      popularity: book.popularity || book.heat || 0,
      rating: book.rating || 0,
      searchFrequency: book.searchFrequency || book.frequency || 0,
      reasons: book.reasons || ''
    };
    
    // 确保标签始终是数组格式
    if (!Array.isArray(bookData.tags)) {
      if (typeof bookData.tags === 'string') {
        bookData.tags = bookData.tags.split(',').map((tag) => tag.trim());
      } else {
        bookData.tags = [];
      }
    }
    
    // 检查书籍是否已经在书架中
    const isInBookshelf = userBookshelfData.some(item => {
      // 书架项中可能有两种结构：1) 直接数据 2) 有book或Book子对象
      const shelfBook = item.book || item.Book || item;
      
      // 获取书架中书籍的ID和标题
      const shelfBookId = shelfBook.id || item.bookId || item.book_id;
      const shelfBookTitle = shelfBook.title || '';
      
      console.log(`比较书籍: "${bookData.title}"(ID:${bookData.id}) 与书架中: "${shelfBookTitle}"(ID:${shelfBookId})`);
      
              // 仅使用精确标题匹配（最可靠的跨页面匹配方式）
        // 不使用ID匹配，因为ID可能为undefined或不可靠
        if (bookData.title && shelfBookTitle && 
            bookData.title.trim().toLowerCase() === shelfBookTitle.trim().toLowerCase()) {
          console.log(`✅ 通过标题精确匹配确认书籍已在书架中: "${bookData.title}"`);
          return true;
        }
      
      // 不使用部分匹配，避免误匹配
      return false;
    });
    
    console.log(`书籍 "${bookData.title}" ${isInBookshelf ? '已在' : '不在'}书架中`);
    
    // 检查是否有搜索频率数据，如果有则使用搜索频率展示，否则使用评分展示
    let ratingOrFrequencyHtml = '';
    if (bookData.searchFrequency || bookData.searchFrequency === 0) {
      // 使用搜索频率
      ratingOrFrequencyHtml = generateSearchFrequencyIndicator(bookData.searchFrequency);
      console.log(`书籍 "${bookData.title}" 使用搜索频率展示: ${bookData.searchFrequency}`);
    } else {
      // 使用评分
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
      ratingOrFrequencyHtml = `<div class="flex items-center">
                                ${starsHtml}
                                <span class="text-gray-600 text-sm ml-1">${bookData.rating.toFixed(1)}</span>
                              </div>`;
    }
    
    // 准备简介内容，处理过长的情况
    const shortIntro = bookData.introduction.length > 60 
      ? bookData.introduction.substring(0, 60) + '...' 
      : bookData.introduction;
    
    // 使用与首页相同的卡片结构
    bookCardWrapper.innerHTML = `
      <div class="book-card" data-book-id="${bookData.id}">
        <div class="book-card-content">
          <!-- 书籍封面区域 -->
          <div class="book-cover-container">
            ${createBookCoverElement(bookData)}
          </div>
          
          <!-- 书籍信息区域 -->
          <div class="book-info-container">
            <h3 class="book-title">${bookData.title}</h3>
            <p class="book-author">${bookData.author}</p>
            
            <!-- 评分或搜索频率区域 -->
            <div class="book-rating-container">
              ${ratingOrFrequencyHtml}
            </div>

            <!-- 简介区域 -->
            <div class="tooltip">
              <div class="book-introduction">${shortIntro}</div>
              <div class="tooltip-text">${bookData.introduction}</div>
            </div>
          </div>
          
          <!-- 操作按钮区域 -->
          <div class="book-actions">
            <a href="#" class="btn btn-read">阅读</a>
            <button class="btn btn-add-shelf ${isInBookshelf ? 'added' : ''}" data-book-id="${bookData.id}">
              ${isInBookshelf ? '已加入书架' : '加入书架'}
            </button>
          </div>
        </div>
      </div>
    `;
    
    // 添加到容器
    container.appendChild(bookCardWrapper);
  });
  
  // 添加点击事件
  addBookCardListeners();
  
  console.log('书籍列表渲染完成');
}

// 设置书籍描述浮窗
function setupDescriptionTooltips() {
  const bookCards = document.querySelectorAll('.book-card');
  
  bookCards.forEach(card => {
    const description = card.querySelector('.book-description');
    const tooltip = card.querySelector('.description-tooltip');
    if (!tooltip || !description) return;
    
    // 从文档中移除浮窗元素并附加到body
    document.body.appendChild(tooltip);
    
    // 创建鼠标移入事件处理函数
    const handleMouseEnter = () => {
      const rect = card.getBoundingClientRect();
      
      // 设置浮窗位置，显示在卡片上方
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
      tooltip.style.width = `${rect.width}px`;
      
      // 显示浮窗
      tooltip.classList.add('show');
    };
    
    // 创建鼠标移出事件处理函数
    const handleMouseLeave = () => {
      tooltip.classList.remove('show');
    };
    
    // 添加悬停事件
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
  });
}

// 根据分类获取背景颜色
function getBgColorByCategory(category) {
  if (!category) return 'bg-blue-500';
  
  // 将category转为小写
  const categoryLower = typeof category === 'string' ? category.toLowerCase() : '';
  
  // 根据类别返回不同的颜色
  if (categoryLower.includes('小说') || categoryLower.includes('文学')) return 'bg-blue-500';
  if (categoryLower.includes('历史') || categoryLower.includes('传记')) return 'bg-amber-500';
  if (categoryLower.includes('科学') || categoryLower.includes('技术') || categoryLower.includes('计算机')) return 'bg-green-500';
  if (categoryLower.includes('哲学') || categoryLower.includes('心理')) return 'bg-purple-500';
  if (categoryLower.includes('艺术') || categoryLower.includes('设计')) return 'bg-pink-500';
  if (categoryLower.includes('经济') || categoryLower.includes('管理')) return 'bg-cyan-500';
  
  // 默认颜色
  return 'bg-blue-500';
}

// 添加书籍卡片事件监听
function addBookCardListeners() {
  // 为"加入书架"按钮添加点击事件（对于没有使用onclick属性的旧版卡片）
  document.querySelectorAll('.btn-add-shelf:not([onclick])').forEach(btn => {
    // 移除可能存在的旧事件监听器
    btn.removeEventListener('click', handleAddToBookshelf);
    // 添加新的事件监听器
    btn.addEventListener('click', handleAddToBookshelf);
  });
  
  // 为阅读按钮添加点击事件
  document.querySelectorAll('.btn-read, .btn-primary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // 如果已经有href属性，不需要处理
      if (btn.hasAttribute('href') && btn.getAttribute('href') !== '#') {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const bookCard = btn.closest('.book-card');
      const bookId = btn.getAttribute('data-book-id') || 
                    (bookCard ? bookCard.getAttribute('data-book-id') : null);
      
      if (bookId) {
        console.log('阅读书籍:', bookId);
        // 跳转到阅读页面
        window.location.href = `/src/pages/reader.html?id=${encodeURIComponent(bookId)}`;
      }
    });
  });
  
  // 为整个卡片添加点击事件（跳转到详情页）
  document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // 确保点击不是在按钮上
      if (e.target.closest('.btn-read') || e.target.closest('.btn-add-shelf') || 
          e.target.closest('.btn-primary') || e.target.closest('.read-btn')) {
        return;
      }
      
      const bookId = card.dataset.id || card.getAttribute('data-book-id');
      if (bookId) {
        console.log('查看书籍详情:', bookId);
        window.location.href = `/src/pages/book-detail.html?id=${encodeURIComponent(bookId)}`;
      }
    });
  });
}

// 初始化首页功能
function initHomePage() {
  // 检查是否在首页
  const welcomeSection = document.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-600');
  if (!welcomeSection) {
    console.log('不在首页，跳过首页初始化');
    return;
  }
  
  console.log('初始化首页功能');
  
  // 加载ImageProxy模块，确保图片代理可用
  loadImageProxyModule();
  
  // 初始化搜索框
  const searchForm = document.querySelector('.hero-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      window.location.href = 'src/pages/search.html';
    });
  }
  
  // 不再主动加载推荐书籍，由专门的homepage.js处理
  console.log('首页数据将由homepage.js加载...');
}

// 加载推荐书籍
async function loadRecommendedBooks() {
  console.log('main.js中的loadRecommendedBooks被跳过，数据由homepage.js加载');
  return; // 直接返回，不执行任何加载

  try {
    console.log('开始加载推荐书籍');
    
    // 检查是否在首页
    const recommendedContainer = document.querySelector('.recommended-section .grid');
    const popularContainer = document.querySelector('.popular-section .grid');
    
    console.log('推荐书籍容器:', recommendedContainer ? '找到' : '未找到');
    console.log('热门书籍容器:', popularContainer ? '找到' : '未找到');
    
    // 尝试查找其他元素，确认是否在首页
    const welcomeBanner = document.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-600');
    console.log('欢迎横幅:', welcomeBanner ? '找到' : '未找到');
    
    if (!recommendedContainer || !popularContainer) {
      console.log('未找到推荐书籍容器或热门书籍容器，可能不在首页');
      return;
    }
    
    showLoadingState();
    
    // 获取推荐书籍
    const recommendedResponse = await bookApi.getBooks({ limit: 4, sort: 'recommended' });
    const recommendedBooks = recommendedResponse.books || [];
    
    // 获取热门书籍
    const popularResponse = await bookApi.getBooks({ limit: 4, sort: 'popular' });
    const popularBooks = popularResponse.books || [];
    
    console.log('推荐书籍:', recommendedBooks);
    console.log('热门书籍:', popularBooks);
    
    // 获取用户书架数据（如果已登录）
    const token = localStorage.getItem('bookstore_auth') ? 
      JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
    let userBookshelf = [];
    let bookshelfBookIds = new Set();
    
    if (token) {
      try {
        const bookshelfData = await bookshelfApi.getBookshelf();
        console.log('获取到的书架数据:', bookshelfData);
        
        // 处理不同的API响应结构
        if (bookshelfData && bookshelfData.data && bookshelfData.data.bookshelf) {
          userBookshelf = bookshelfData.data.bookshelf;
        } else if (bookshelfData && bookshelfData.bookshelf) {
          userBookshelf = bookshelfData.bookshelf;
        } else if (Array.isArray(bookshelfData)) {
          userBookshelf = bookshelfData;
        } else {
          userBookshelf = [];
        }
        
        console.log('处理后的书架数据:', userBookshelf);
        
        // 创建一个书籍ID集合，用于快速检查书籍是否在书架中
        userBookshelf.forEach(item => {
          // 获取书籍ID，考虑不同的数据结构
          const bookInfo = item.Book || item;
          const bookId = item.bookId || bookInfo.id || bookInfo.bookId;
          
          if (bookId) {
            bookshelfBookIds.add(Number(bookId));
            console.log(`添加书架中的书籍ID: ${bookId}`);
          }
        });
      } catch (error) {
        console.error('获取用户书架数据失败:', error);
      }
    }
    
    // 更新推荐书籍区域
    if (recommendedContainer) {
      console.log('找到推荐书籍容器，开始生成书籍卡片');
      
      // 检查是否有BookCard组件
      if (typeof BookCard !== 'undefined' && BookCard.createBookCard) {
        console.log('使用BookCard组件生成卡片');
        recommendedContainer.innerHTML = recommendedBooks.map(book => {
          const isInBookshelf = bookshelfBookIds.has(Number(book.id));
          return BookCard.createBookCard(book, '推荐', isInBookshelf);
        }).join('');
      } else {
        console.log('使用内部函数生成卡片');
        recommendedContainer.innerHTML = recommendedBooks.map(book => {
          const isInBookshelf = bookshelfBookIds.has(Number(book.id));
          return generateBookCard(book, isInBookshelf);
        }).join('');
      }
    } else {
      console.error('未找到推荐书籍容器');
    }
    
    // 更新热门书籍区域
    if (popularContainer) {
      console.log('找到热门书籍容器，开始生成书籍卡片');
      
      // 检查是否有BookCard组件
      if (typeof BookCard !== 'undefined' && BookCard.createBookCard) {
        console.log('使用BookCard组件生成卡片');
        popularContainer.innerHTML = popularBooks.map(book => {
          const isInBookshelf = bookshelfBookIds.has(Number(book.id));
          return BookCard.createBookCard(book, '热门', isInBookshelf);
        }).join('');
      } else {
        console.log('使用内部函数生成卡片');
        popularContainer.innerHTML = popularBooks.map(book => {
          const isInBookshelf = bookshelfBookIds.has(Number(book.id));
          return generateBookCard(book, isInBookshelf);
        }).join('');
      }
    } else {
      console.error('未找到热门书籍容器');
    }
    
    // 添加事件监听器
    document.querySelectorAll('.add-to-bookshelf, .add-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!isLoggedIn()) {
          showLoginPrompt();
          return;
        }
        
        const bookId = button.getAttribute('data-book-id');
        const bookCard = button.closest('.book-card');
        
        try {
          if (button.classList.contains('in-bookshelf') || button.classList.contains('added')) {
            // 从书架中移除
            await bookshelfApi.removeFromBookshelf(bookId);
            button.classList.remove('in-bookshelf', 'added');
            button.innerHTML = '<i class="fas fa-plus"></i>';
            showToast('已从书架中移除', 'success');
          } else {
            // 添加到书架
            await bookshelfApi.addToBookshelf(bookId);
            button.classList.add('in-bookshelf', 'added');
            button.innerHTML = '<i class="fas fa-check"></i>';
            showToast('已添加到书架', 'success');
          }
        } catch (error) {
          console.error('书架操作失败:', error);
          showToast('操作失败，请稍后再试', 'error');
        }
      });
    });
    
    // 添加书籍卡片点击事件
    document.querySelectorAll('.book-card, .book-card-wrapper').forEach(card => {
      card.addEventListener('click', (e) => {
        // 如果点击的是按钮，不处理
        if (e.target.closest('button')) return;
        
        const bookId = card.getAttribute('data-book-id');
        if (bookId) {
          window.location.href = `src/pages/book-detail.html?id=${bookId}`;
        }
      });
    });
    
    hideLoadingState();
  } catch (error) {
    console.error('加载推荐书籍失败:', error);
    hideLoadingState();
    showErrorMessage('加载推荐书籍失败，请稍后再试');
  }
}

// 生成书籍卡片HTML
function generateBookCard(book, isInBookshelf = false) {
  // 处理rating可能为空的情况
  const rating = book.rating || 0;
  
  // 处理searchFrequency可能存在的情况
  const searchFrequency = book.searchFrequency || book.frequency || 0;
  const hasSearchFrequency = book.searchFrequency !== undefined || book.frequency !== undefined;
  
  // 处理简介，增加字数限制
  const description = book.description ? 
    (book.description.length > 100 ? book.description.substring(0, 100) + '...' : book.description) : 
    '暂无简介';
  
  // 获取封面图片URL，如果没有则使用默认图片
  const coverImage = book.coverImage || book.cover_image || book.cover || '../images/default-cover.jpg';
  
  // 根据是否已在书架中设置按钮文本和样式
  const addBtnClass = isInBookshelf ? 'add-to-bookshelf in-bookshelf' : 'add-to-bookshelf';
  const addBtnIcon = isInBookshelf ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>';
  
  // 根据是否有搜索频率数据决定显示评分还是搜索频率
  let ratingOrFrequencyHTML = '';
  if (hasSearchFrequency) {
    // 使用搜索频率指示器
    ratingOrFrequencyHTML = generateSearchFrequencyIndicator(searchFrequency);
  } else {
    // 使用评分星星
    ratingOrFrequencyHTML = `
      <div class="flex items-center mb-2">
        ${generateStarRating(rating)}
        <span class="text-gray-600 text-sm ml-1">${rating.toFixed(1)}</span>
      </div>
    `;
  }
  
  return `
    <div class="book-card" data-book-id="${book.id}">
      <div class="relative">
        <img src="${coverImage}" alt="${book.title}" class="w-full h-48 object-cover rounded-t-lg">
        <div class="absolute top-2 right-2">
          <button class="${addBtnClass}" data-book-id="${book.id}">
            ${addBtnIcon}
          </button>
        </div>
      </div>
      <div class="p-4">
        <h3 class="font-bold text-lg mb-1">${book.title}</h3>
        <p class="text-gray-600 text-sm mb-2">${book.author || '未知作者'}</p>
        ${ratingOrFrequencyHTML}
        <p class="text-gray-700 text-sm line-clamp-3">${description}</p>
      </div>
    </div>
  `;
}

// 初始化书架页面
function initBookshelfPage() {
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (!bookshelfContainer) {
    console.log('未找到书架容器，跳过书架页面初始化');
    return;
  }
  
  console.log('初始化书架页面');
  
  // 检查用户是否登录
  const token = localStorage.getItem('bookstore_auth') ? 
    JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
  
  if (!token) {
    console.log('用户未登录，显示登录提示');
    // 清空书架内容，防止显示默认内容
    bookshelfContainer.innerHTML = '';
    // 显示登录提示
    showLoginPrompt();
    return; // 终止函数执行
  }
  
  // 检查是否有bookshelf.js中的函数
  if (window.updateBookshelfDisplay) {
    console.log('使用bookshelf.js中的函数');
    // 如果bookshelf.js已加载，使用其函数
    window.updateBookshelfDisplay();
    return;
  }
  
  // 加载用户书架
  loadUserBookshelf().then(books => {
    if (books && books.length > 0) {
      console.log('书架加载成功，添加事件监听器');
      // 确保添加事件监听器
      setTimeout(() => {
        addBookshelfCardListeners();
        console.log('书架卡片事件监听器已添加');
      }, 100);
    }
  });
  
  // 初始化书架搜索功能
  initBookshelfSearch();
  
  // 初始化筛选和排序功能
  initFilterAndSort();
}

// 初始化书架搜索功能
function initBookshelfSearch() {
  const searchInput = document.querySelector('.search-input');
  const searchButton = document.querySelector('.search-container button');
  
  if (!searchInput || !searchButton) return;
  
  // 检查用户是否登录 - 虽然此时页面应该已经重定向，但为了安全起见仍进行检查
  const token = localStorage.getItem('bookstore_auth') ? 
    JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
  
  if (!token) {
    console.log('用户未登录，禁用书架搜索功能');
    return; // 不添加搜索事件监听器
  }
  
  // 搜索按钮点击事件
  searchButton.addEventListener('click', () => {
    performBookshelfSearch(searchInput.value.trim());
  });
  
  // 输入框回车事件
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performBookshelfSearch(searchInput.value.trim());
    }
  });
}

// 执行书架搜索
async function performBookshelfSearch(query) {
  // 检查用户是否登录
  const token = localStorage.getItem('bookstore_auth') ? 
    JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
  
  if (!token) {
    console.log('用户未登录，无法执行书架搜索');
    showLoginPrompt();
    return;
  }
  
  if (!query) {
    // 如果搜索词为空，显示所有书籍
    loadUserBookshelf();
    return;
  }
  
  console.log('开始搜索书架，关键词:', query);
  
  try {
    // 显示加载状态
    showLoadingState();
    
    // 调用API获取用户书架
    const bookshelfData = await bookshelfApi.getBookshelf();
    console.log('搜索获取到的书架数据原始结构:', JSON.stringify(bookshelfData));
    
    // 确保我们正确处理bookshelf数据
    let bookshelfItems = [];
    
    if (bookshelfData && bookshelfData.bookshelf && Array.isArray(bookshelfData.bookshelf)) {
      console.log('数据结构: bookshelfData.bookshelf');
      bookshelfItems = bookshelfData.bookshelf;
    } else if (bookshelfData && bookshelfData.data && bookshelfData.data.bookshelf && Array.isArray(bookshelfData.data.bookshelf)) {
      console.log('数据结构: bookshelfData.data.bookshelf');
      bookshelfItems = bookshelfData.data.bookshelf;
    } else if (Array.isArray(bookshelfData)) {
      console.log('数据结构: bookshelfData 是数组');
      bookshelfItems = bookshelfData;
    } else if (bookshelfData && bookshelfData.books && Array.isArray(bookshelfData.books)) {
      console.log('数据结构: bookshelfData.books');
      bookshelfItems = bookshelfData.books;
    } else if (bookshelfData && bookshelfData.data && Array.isArray(bookshelfData.data)) {
      console.log('数据结构: bookshelfData.data');
      bookshelfItems = bookshelfData.data;
    } else {
      console.warn('获取到的书架数据格式不符合预期:', bookshelfData);
      bookshelfItems = window.currentBookshelfData || [];
    }
    
    console.log('处理后的书架数据项目数:', bookshelfItems.length);
    console.log('第一个书籍数据样例:', bookshelfItems.length > 0 ? JSON.stringify(bookshelfItems[0]) : '无数据');
    
    if (!bookshelfItems || !Array.isArray(bookshelfItems) || bookshelfItems.length === 0) {
      console.warn('获取书架数据失败或书架为空');
      if (window.currentBookshelfData && Array.isArray(window.currentBookshelfData)) {
        console.log('使用window.currentBookshelfData作为备选数据源');
        bookshelfItems = window.currentBookshelfData;
      } else {
        throw new Error('获取书架数据失败或书架为空');
      }
    }
    
    // 过滤匹配的书籍
    const searchLower = query.toLowerCase();
    const filteredBooks = bookshelfItems.filter(book => {
      console.log('当前检查的书籍数据:', JSON.stringify(book));
      
      // 尝试从各种可能的嵌套结构中提取书籍信息
      let bookInfo = book;
      if (book.Book && typeof book.Book === 'object') {
        bookInfo = book.Book;
      } else if (book.book && typeof book.book === 'object') {
        bookInfo = book.book;
      } else if (book.bookData && typeof book.bookData === 'object') {
        bookInfo = book.bookData;
      } else if (book.bookInfo && typeof book.bookInfo === 'object') {
        bookInfo = book.bookInfo;
      }
      
      // 从各种可能的字段名中提取书籍属性
      const title = (bookInfo.title || bookInfo.name || bookInfo.bookTitle || '').toLowerCase();
      const author = (bookInfo.author || bookInfo.authors || bookInfo.writer || '').toLowerCase();
      const description = (bookInfo.description || bookInfo.summary || bookInfo.intro || bookInfo.content || '').toLowerCase();
      
      console.log(`检查书籍: "${title}" 作者: "${author}", 关键词: "${searchLower}"`);
      
      // 即使是空字符串也确保能运行includes而不报错
      const titleMatch = title ? title.includes(searchLower) : false;
      const authorMatch = author ? author.includes(searchLower) : false;
      const descMatch = description ? description.includes(searchLower) : false;
      
      // 尝试搜索任何可能包含文本的字段
      const otherFieldsMatch = Object.entries(bookInfo).some(([key, value]) => {
        if (typeof value === 'string' && !['title', 'author', 'description'].includes(key.toLowerCase())) {
          return value.toLowerCase().includes(searchLower);
        }
        return false;
      });
      
      const isMatch = titleMatch || authorMatch || descMatch || otherFieldsMatch;
      
      console.log(`匹配结果: 标题匹配=${titleMatch}, 作者匹配=${authorMatch}, 描述匹配=${descMatch}, 其他字段匹配=${otherFieldsMatch}, 总匹配=${isMatch}`);
      
      return isMatch;
    });
    
    console.log(`搜索结果: 找到 ${filteredBooks.length} 本匹配的书籍`);
    if (filteredBooks.length > 0) {
      console.log('第一本匹配书籍:', filteredBooks[0]);
    }
    
    // 更新书架显示
    updateBookshelfDisplay(filteredBooks, query);
  } catch (error) {
    console.error('搜索书架失败:', error);
    showErrorMessage('搜索失败，请稍后再试');
  } finally {
    hideLoadingState();
  }
}

// 更新书架显示
function updateBookshelfDisplay(books, searchQuery = '') {
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (!bookshelfContent) return;
  
  if (books.length === 0) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        ${searchQuery ? `
          <div class="text-gray-500 mb-4">
            <i class="fas fa-search fa-3x mb-3"></i>
            <p class="text-xl font-medium">没有找到匹配 "${searchQuery}" 的书籍</p>
          </div>
          <button class="bg-blue-500 text-white px-4 py-2 rounded-lg" onclick="window.clearSearch()">
            <i class="fas fa-times mr-2"></i>清除搜索
          </button>
        ` : '您的书架还没有书籍'}
      </div>
    `;
    return;
  }
  
  // 更新书架内容
  if (searchQuery) {
    // 如果是搜索结果，添加搜索结果标题和清除搜索按钮
    bookshelfContent.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div class="text-gray-700">
          找到 <span class="font-medium">${books.length}</span> 本匹配 "${searchQuery}" 的书籍
        </div>
        <button class="text-blue-500 hover:text-blue-700 flex items-center" onclick="window.clearSearch()">
          <i class="fas fa-times mr-1"></i>清除搜索
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        ${books.map(book => generateBookshelfCard(book)).join('')}
      </div>
    `;
  } else {
    // 如果不是搜索结果，只显示书籍
    bookshelfContent.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        ${books.map(book => generateBookshelfCard(book)).join('')}
      </div>
    `;
  }
  
  // 添加事件监听器
  addBookshelfCardListeners();
}

// 清除搜索并重新加载所有书籍
function clearSearch() {
  // 清空搜索输入框
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // 重新加载所有书籍
  loadUserBookshelf();
  
  // 如果有当前搜索查询，清除它
  if (window.currentSearchQuery) {
    window.currentSearchQuery = '';
  }
}

// 生成书架卡片HTML
function generateBookshelfCard(book) {
  // 如果bookshelf.js中已经定义了这个函数，则使用那个版本
  // 但要避免递归调用自己
  if (window.generateBookshelfCard && window.generateBookshelfCard !== generateBookshelfCard) {
    return window.generateBookshelfCard(book);
  }
  
  console.log('生成书架卡片 - 原始数据:', book);
  
  try {
    // 提取书籍信息，兼容各种数据结构
    let bookInfo = book;
    
    // 检查嵌套结构 - 适配后端返回的数据结构
    if (book.Book && typeof book.Book === 'object') {
      console.log('从book.Book中提取书籍信息');
      bookInfo = book.Book;
    } else if (book.book && typeof book.book === 'object') {
      console.log('从book.book中提取书籍信息');
      bookInfo = book.book;
    }
    
    // 提取各种可能的字段名
    // 书籍基本信息
    const bookId = book.bookId || book.book_id || bookInfo.id || bookInfo.bookId || '';
    const title = bookInfo.title || bookInfo.name || bookInfo.bookTitle || '未知标题';
    const author = bookInfo.author || bookInfo.authors || '未知作者';
    const description = bookInfo.description || bookInfo.summary || '';
    
    // 书籍封面 - 适配不同的字段名
    const cover = bookInfo.coverUrl || bookInfo.cover || bookInfo.cover_url || 
                  bookInfo.coverImage || bookInfo.cover_image || '../images/default-cover.jpg';
    
    // 阅读状态和进度
    let status = book.status || book.readingStatus || book.reading_status || 'toRead';
    let progress = book.progress || book.readingProgress || book.reading_progress || 0;
    
    // 规范化状态值
    if (status === 'finished') status = 'completed';
    if (status === '阅读中') status = 'reading';
    if (status === '已完成' || status === '已读完') status = 'completed';
    
    // 确保进度是数字
    progress = Number(progress) || 0;
    
    // 根据状态设置标签
    let statusLabel = '';
    let statusClass = '';
    
    if (status === 'reading') {
      statusLabel = '阅读中';
      statusClass = 'bg-blue-100 text-blue-800';
    } else if (status === 'completed') {
      statusLabel = '已完成';
      statusClass = 'bg-green-100 text-green-800';
      // 如果状态是已完成，但进度不是100%，强制设为100%
      progress = 100;
    } else {
      statusLabel = '未读';
      statusClass = 'bg-yellow-100 text-yellow-800';
      // 如果状态是未读，但进度不是0，重置为0
      progress = 0;
    }
    
    console.log(`处理书籍: ID=${bookId}, 标题=${title}, 状态=${status}, 进度=${progress}%`);
    
    // 生成书架卡片HTML
    return `
      <div class="book-card bg-white p-4 relative rounded-lg" data-book-id="${bookId}" data-status="${status}" data-progress="${progress}">
        <div class="absolute top-2 left-2 dropdown-container">
          <button class="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 card-menu-btn">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="dropdown-menu hidden" style="position: absolute; left: 0; top: 28px; z-index: 100; background-color: white; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 150px; padding: 0.5rem 0; display: none;">
            <a href="book-detail.html?id=${bookId}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <i class="fas fa-info-circle mr-2"></i>查看详情
            </a>
            <button class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 remove-from-shelf-btn">
              <i class="fas fa-times mr-2"></i>移出书架
            </button>
          </div>
        </div>
        
        <div class="flex flex-col items-center">
          <img 
            src="${cover}" 
            alt="${title}" 
            class="book-cover w-32 h-48 mb-3 object-cover rounded" 
            data-original-src="${cover}"
            onerror="if(!this.dataset.defaultLoaded){this.dataset.defaultLoaded='true';this.src='../images/default-cover.jpg';}"
          >
          <div class="text-center mb-4">
            <h3 class="font-bold">${title}</h3>
            <p class="text-gray-600 text-sm">${author}</p>
          </div>
        </div>
        
        <div class="mt-auto pt-3 border-t border-gray-100">
          <div class="flex justify-between text-sm text-gray-500 mb-1">
            <span>阅读进度</span>
            <span>${progress}%</span>
          </div>
          <div class="bg-gray-200 rounded-full h-2 overflow-hidden mb-3">
            <div class="bg-blue-500 h-full" style="width: ${progress}%"></div>
          </div>
          
          <div class="flex justify-between items-center mt-3">
            <span class="inline-block ${statusClass} text-xs px-2 py-1 rounded-full">${statusLabel}</span>
            <button class="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded continue-reading-btn">
              ${status === 'reading' ? '继续阅读' : status === 'completed' ? '重新阅读' : '开始阅读'}
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('生成书架卡片出错:', error, book);
    
    // 尝试提取书名做为最基本的信息
    let title = '未知书名';
    let bookId = '';
    
    try {
      if (book) {
        if (book.title) title = book.title;
        else if (book.Book && book.Book.title) title = book.Book.title;
        
        if (book.id) bookId = book.id;
        else if (book.bookId) bookId = book.bookId;
        else if (book.Book && book.Book.id) bookId = book.Book.id;
      }
    } catch (e) {
      console.warn('提取基本信息也失败了:', e);
    }
    
    // 返回一个简单的错误卡片
    return `
      <div class="book-card bg-white p-4 relative rounded-lg" data-book-id="${bookId}">
        <div class="text-center py-4">
          <div class="text-red-500 mb-2"><i class="fas fa-exclamation-circle text-xl"></i></div>
          <h3 class="font-bold">${title}</h3>
          <p class="text-gray-500 text-sm mt-2">加载书籍信息时出错</p>
        </div>
      </div>
    `;
  }
}

// 添加书架卡片事件监听器
function addBookshelfCardListeners() {
  // 如果bookshelf.js中已经定义了这个函数，则使用那个版本
  // 但要避免递归调用自己
  if (window.attachBookCardEventListeners && window.attachBookCardEventListeners !== addBookshelfCardListeners) {
    window.attachBookCardEventListeners();
    return;
  }
  
  // 阅读按钮点击事件
  const readButtons = document.querySelectorAll('.continue-reading-btn');
  readButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const bookCard = button.closest('.book-card');
      const bookId = bookCard ? bookCard.dataset.bookId : null;
      
      if (bookId) {
        window.location.href = `reader.html?id=${bookId}`;
      }
    });
  });
  
  // 移出书架按钮点击事件 - 使用事件委托来避免重复绑定
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (bookshelfContainer && !bookshelfContainer.hasRemoveButtonListener) {
    // 标记已添加监听器，避免重复
    bookshelfContainer.hasRemoveButtonListener = true;
    
    bookshelfContainer.addEventListener('click', async (e) => {
      // 如果点击的是移出书架按钮
      const removeButton = e.target.closest('.remove-from-shelf-btn');
      if (!removeButton) return; // 如果不是移除按钮，不处理
      
      e.stopPropagation();
      e.preventDefault();
      
      const bookCard = removeButton.closest('.book-card');
      const bookId = bookCard ? bookCard.dataset.bookId : null;
      
      if (bookId && confirm('确定要从书架中移除这本书吗？')) {
        try {
          console.log(`从书架移除书籍 ID: ${bookId}`);
          await bookshelfApi.removeFromBookshelf(bookId);
          showToast('书籍已从书架移除', 'success');
          
          // 从全局书架数据中移除该书籍
          if (window.currentBookshelfData) {
            window.currentBookshelfData = window.currentBookshelfData.filter(item => {
              const shelfBook = item.Book || item.book || item;
              return !(shelfBook.id == bookId || shelfBook.bookId == bookId || 
                     item.bookId == bookId || item.book_id == bookId);
            });
            console.log(`从全局书架数据中移除书籍 ID: ${bookId}，剩余 ${window.currentBookshelfData.length} 本书`);
          }
          
          // 添加移除动画
          bookCard.style.transition = 'all 0.3s ease';
          bookCard.style.opacity = '0';
          bookCard.style.transform = 'scale(0.8)';
          
          // 等待动画完成后移除元素
          setTimeout(() => {
            bookCard.remove();
            
            // 更新统计数据
            updateBookshelfStats();
          }, 300);
        } catch (error) {
          console.error('移除书籍失败:', error);
          showToast('移除失败，请稍后再试', 'error');
        }
      }
    });
  }
  
  // 三点菜单按钮点击事件
  const menuButtons = document.querySelectorAll('.card-menu-btn');
  console.log('找到', menuButtons.length, '个菜单按钮');
  
  menuButtons.forEach(btn => {
    // 移除可能存在的旧事件监听器
    const newBtn = btn.cloneNode(true);
    if (btn.parentNode) {
      btn.parentNode.replaceChild(newBtn, btn);
    }
    
    const dropdownMenu = newBtn.nextElementSibling;
    if (!dropdownMenu) {
      console.error('未找到下拉菜单元素');
      return;
    }
    
    // 确保所有下拉菜单初始状态是隐藏的
    dropdownMenu.classList.add('hidden');
    dropdownMenu.style.display = 'none';
    
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      console.log('菜单按钮被点击');
      
      // 获取当前菜单的显示状态
      const isHidden = dropdownMenu.classList.contains('hidden');
      
      // 先关闭所有菜单
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
        menu.style.display = 'none';
      });
      
      // 如果当前菜单是隐藏的，则显示它
      if (isHidden) {
        dropdownMenu.classList.remove('hidden');
        
        // 强制设置菜单样式
        dropdownMenu.style.position = 'absolute';
        dropdownMenu.style.right = 'auto';
        dropdownMenu.style.left = '0';
        dropdownMenu.style.top = '28px'; // 直接设置固定距离，与按钮靠在一起
        dropdownMenu.style.zIndex = '100';
        dropdownMenu.style.backgroundColor = 'white';
        dropdownMenu.style.borderRadius = '0.5rem';
        dropdownMenu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        dropdownMenu.style.minWidth = '150px';
        dropdownMenu.style.display = 'block';
        dropdownMenu.style.padding = '0.5rem 0';
        dropdownMenu.style.opacity = '1';
        dropdownMenu.style.visibility = 'visible';
        
        // 确保菜单在视口内
        const rect = dropdownMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
          dropdownMenu.style.left = 'auto';
          dropdownMenu.style.right = '0';
        }
      }
      
      console.log('菜单状态:', dropdownMenu.classList.contains('hidden') ? '隐藏' : '显示');
    });
  });
  
  // 点击页面其他地方关闭所有菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  });
  
  // 书籍卡片点击事件（跳转到详情页）
  const bookCards = document.querySelectorAll('.book-card');
  bookCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮或链接，不处理
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.dropdown-container')) {
        return;
      }
      
      const bookId = card.dataset.bookId;
      if (bookId) {
        window.location.href = `book-detail.html?id=${bookId}`;
      }
    });
  });
}

// 加载用户书架
async function loadUserBookshelf() {
  console.log('加载用户书架数据');
  
  try {
    // 显示加载状态
    showLoadingState();
    
    // 调用API获取用户书架
    const response = await bookshelfApi.getBookshelf();
    console.log('getBookshelf API 响应:', JSON.stringify(response));
    
    // 尝试解析不同的数据结构
    let bookshelfData = [];
    
    if (response && response.bookshelf && Array.isArray(response.bookshelf)) {
      console.log('数据结构: response.bookshelf');
      bookshelfData = response.bookshelf;
    } else if (response && response.data && response.data.bookshelf && Array.isArray(response.data.bookshelf)) {
      console.log('数据结构: response.data.bookshelf');
      bookshelfData = response.data.bookshelf;
    } else if (Array.isArray(response)) {
      console.log('数据结构: response 是数组');
      bookshelfData = response;
    } else if (response && response.books && Array.isArray(response.books)) {
      console.log('数据结构: response.books');
      bookshelfData = response.books;
    } else if (response && response.data && Array.isArray(response.data)) {
      console.log('数据结构: response.data');
      bookshelfData = response.data;
    } else {
      console.warn('API响应格式不符合预期:', response);
      bookshelfData = [];
    }
    
    console.log(`获取到 ${bookshelfData.length} 本书籍`);
    
    // 保存到全局变量，以便搜索使用
    window.currentBookshelfData = bookshelfData;
    console.log('已将书架数据保存到 window.currentBookshelfData');
    
    if (bookshelfData.length > 0) {
      console.log('第一本书籍示例:', JSON.stringify(bookshelfData[0]));
    }
    
    // 更新书架显示
    displayBookshelf(bookshelfData);
    
    // 更新统计数据
    updateBookshelfStats(bookshelfData);
    
    // 隐藏加载状态
    hideLoadingState();
    
    return bookshelfData;
  } catch (error) {
    console.error('加载用户书架失败:', error);
    
    // 隐藏加载状态
    hideLoadingState();
    
    // 显示错误信息
    showErrorMessage('加载书架失败，请稍后再试');
    
    return [];
  }
}

// 显示用户书架
function displayBookshelf(bookshelfData) {
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (!bookshelfContent) return;
  
  console.log('显示书架数据 - 原始数据:', bookshelfData);
  
  // 处理不同的数据格式
  let books = [];
  
  if (Array.isArray(bookshelfData)) {
    console.log('bookshelfData是数组，直接使用');
    books = bookshelfData;
  } else if (bookshelfData && typeof bookshelfData === 'object') {
    if (bookshelfData.bookshelf && Array.isArray(bookshelfData.bookshelf)) {
      console.log('从bookshelfData.bookshelf中提取书籍数组');
      books = bookshelfData.bookshelf;
    } else if (bookshelfData.data && Array.isArray(bookshelfData.data)) {
      console.log('从bookshelfData.data中提取书籍数组');
      books = bookshelfData.data;
    } else if (bookshelfData.data && bookshelfData.data.bookshelf && Array.isArray(bookshelfData.data.bookshelf)) {
      console.log('从bookshelfData.data.bookshelf中提取书籍数组');
      books = bookshelfData.data.bookshelf;
    } else {
      // 尝试查找任何可能的数组字段
      for (const key in bookshelfData) {
        if (Array.isArray(bookshelfData[key])) {
          console.log(`从bookshelfData.${key}中提取书籍数组`);
          books = bookshelfData[key];
          break;
        }
      }
    }
  } else {
    console.warn('无法识别的bookshelfData格式:', bookshelfData);
    books = [];
  }
  
  // 检查最终提取的books是否为有效数组
  if (!Array.isArray(books)) {
    console.warn('处理后的books不是有效数组，创建空数组');
    books = [];
  }
  
  console.log('处理后的书架书籍数组:', books.length ? books : '空数组');
  
  // 检查书架数据
  if (books.length === 0) {
    console.log('书架为空，显示空状态');
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        您的书架还没有书籍
      </div>
    `;
    return;
  }
  
  // 检查第一本书的数据结构，以便适当处理
  const sampleBook = books[0];
  console.log('样本书籍数据结构:', sampleBook);
  
  // 更新书架内容
  bookshelfContent.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      ${books.map(book => {
        try {
          // 获取书籍信息，考虑可能的数据结构
          let bookInfo = book;
          
          // 检查各种可能的嵌套结构
          if (book.Book && typeof book.Book === 'object') {
            console.log('书籍存在Book子对象');
            bookInfo = book.Book;
          } else if (book.book && typeof book.book === 'object') {
            console.log('书籍存在book子对象');
            bookInfo = book.book;
          }
          
          // 尝试确保书籍有ID和标题
          const id = book.bookId || bookInfo.id || book.id || 'unknown';
          const title = bookInfo.title || book.title || '未知标题';
          
          // 使用ID标记调试日志
          console.log(`处理书籍ID:${id}, 标题:${title}`);
          
          // 使用generateBookshelfCard生成卡片
          return generateBookshelfCard(book);
        } catch (error) {
          console.error('生成书架卡片时出错:', error, book);
          return `<div class="book-card error">加载书籍信息出错</div>`;
        }
      }).join('')}
    </div>
  `;
  
  // 添加事件监听器
  addBookshelfCardListeners();
  
  // 更新统计数据
  updateBookshelfStats(books);
}

// 更新书架统计数据
function updateBookshelfStats(books) {
  console.log('更新书架统计数据 - 传入数据:', books ? `${books.length}本书籍` : '无数据');
  
  // 确保books是数组
  if (!books || !Array.isArray(books)) {
    console.error('无效的书架数据:', books);
    return;
  }
  
  // 计算统计数据
  const totalBooks = books.length;
  
  let finishedBooks = 0;
  let readingBooks = 0;
  let toReadBooks = 0;
  
  books.forEach(book => {
    try {
      // 处理不同的数据结构
      let bookInfo = book;
      
      // 检查嵌套结构
      if (book.Book && typeof book.Book === 'object') {
        bookInfo = book.Book;
      } else if (book.book && typeof book.book === 'object') {
        bookInfo = book.book;
      }
      
      // 提取状态和进度信息
      let status = book.status || book.readingStatus || book.reading_status || '';
      let progress = book.progress || book.readingProgress || book.reading_progress || 0;
      
      // 尝试从bookInfo中提取（如果上面没找到）
      if (!status) {
        status = bookInfo.status || bookInfo.readingStatus || bookInfo.reading_status || '';
      }
      
      if (!progress) {
        progress = bookInfo.progress || bookInfo.readingProgress || bookInfo.reading_progress || 0;
      }
      
      // 规范化状态值
      if (status === 'finished') status = 'completed';
      if (status === '阅读中') status = 'reading';
      if (status === '已完成' || status === '已读完') status = 'completed';
      
      // 确保进度是数字
      progress = Number(progress) || 0;
      
      // 基于状态和进度分类
      if (status === 'completed' || progress === 100) {
        finishedBooks++;
      } else if (status === 'reading' || (progress > 0 && progress < 100)) {
        readingBooks++;
      } else {
        toReadBooks++;
      }
    } catch (error) {
      console.error('处理书籍统计信息时出错:', error, book);
    }
  });
  
  console.log(`统计结果: 总计 ${totalBooks} 本, 已完成 ${finishedBooks} 本, 阅读中 ${readingBooks} 本, 未读 ${toReadBooks} 本`);
  
  // 更新DOM元素
  const totalElement = document.getElementById('total-books');
  const finishedElement = document.getElementById('finished-books');
  const readingElement = document.getElementById('reading-books');
  const toReadElement = document.getElementById('toread-books');
  
  if (totalElement) totalElement.textContent = totalBooks;
  if (finishedElement) finishedElement.textContent = finishedBooks;
  if (readingElement) readingElement.textContent = readingBooks;
  if (toReadElement) toReadElement.textContent = toReadBooks;
}

// 初始化书籍详情页面
function initBookDetailPage() {
  // 检查是否在书籍详情页
  if (!window.location.pathname.includes('/book.html')) {
    return;
  }
  
  console.log('初始化书籍详情页面');
  
  // 加载ImageProxy模块，确保图片代理可用
  loadImageProxyModule();
  
  // 获取书籍ID
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  
  if (bookId) {
    // 加载书籍详情
    loadBookDetail(bookId);
  } else {
    // 显示错误信息
    bookDetailContainer.innerHTML = '<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i> 未找到书籍信息</div>';
  }
}

// 加载书籍详情
async function loadBookDetail(bookId) {
  const bookDetailContainer = document.querySelector('.book-detail-container');
  if (!bookDetailContainer) return;
  
  try {
    // 显示加载状态
    bookDetailContainer.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin mr-2"></i> 加载中...</div>';
    
    // 调用API获取书籍详情
    const book = await bookApi.getBookById(bookId);
    
    if (!book) {
      throw new Error('未找到书籍信息');
    }
    
    // 更新页面标题
    document.title = `${book.title} - 百变书屋`;
    
    // 检查书籍是否已在书架中
    const token = localStorage.getItem('bookstore_auth') ? 
      JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
    let isInBookshelf = false;
    
    if (token) {
      try {
        const userBookshelf = await bookshelfApi.getBookshelf();
        console.log('获取到的书架数据类型:', typeof userBookshelf);
        console.log('获取到的书架数据:', JSON.stringify(userBookshelf, null, 2));
        
        // 确保我们正确处理bookshelf数据
        const bookshelfItems = userBookshelf.bookshelf || userBookshelf || [];
        console.log('处理后的书架数据:', bookshelfItems);
        console.log('当前书籍ID:', book.id);
        
        // 检查书籍是否在书架中 - 考虑所有可能的ID属性
        isInBookshelf = bookshelfItems.some(item => {
          console.log('检查书架项目:', item);
          
          // 直接的ID属性
          if (item.bookId && Number(item.bookId) === Number(book.id)) {
            console.log(`匹配bookId: ${item.bookId} === ${book.id}`);
            return true;
          }
          if (item.book_id && Number(item.book_id) === Number(book.id)) {
            console.log(`匹配book_id: ${item.book_id} === ${book.id}`);
            return true;
          }
          
          // 关联的Book对象
          if (item.Book && item.Book.id && Number(item.Book.id) === Number(book.id)) {
            console.log(`匹配Book.id: ${item.Book.id} === ${book.id}`);
            return true;
          }
          
          return false;
        });
        
        console.log('书籍是否在书架中:', isInBookshelf);
      } catch (error) {
        console.error('获取书架数据失败:', error);
      }
    }
    
    // 更新书籍详情内容
    updateBookDetailContent(book);
    
    // 初始化阅读按钮
    initReadButton(book);
    
    // 初始化加入书架按钮
    initAddToBookshelfButton(book, isInBookshelf);
    
  } catch (error) {
    console.error('加载书籍详情失败:', error);
    bookDetailContainer.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i> ${error.message || '加载书籍详情失败'}</div>`;
  }
}

// 初始化阅读按钮
function initReadButton(book) {
  const readButton = document.querySelector('.btn-primary');
  if (!readButton) return;
  
  readButton.addEventListener('click', () => {
    // 检查书籍是否有文件URL
    if (book.fileUrl) {
      // 跳转到阅读页面
      window.location.href = `reader.html?id=${book.id}`;
    } else {
      // 显示错误消息
      showErrorMessage('该书籍暂无阅读文件');
    }
  });
}

// 初始化加入书架按钮
function initAddToBookshelfButton(book, isInBookshelf) {
  const addToBookshelfButton = document.getElementById('add-to-bookshelf-btn');
  if (!addToBookshelfButton) return;
  
  // 添加书籍ID属性，以便BookCard.js中的代码能够正确更新它
  addToBookshelfButton.setAttribute('data-book-id', book.id);
  
  // 如果书籍已在书架中，更新按钮状态
  if (isInBookshelf) {
    addToBookshelfButton.innerHTML = '<i class="fas fa-check"></i> 已添加';
    addToBookshelfButton.classList.remove('btn-secondary');
    addToBookshelfButton.classList.add('btn-success');
    addToBookshelfButton.disabled = true;
    
    // 更新首页中相同书籍的按钮状态
    document.querySelectorAll(`.add-btn[data-book-id="${book.id}"]`).forEach(btn => {
      btn.innerHTML = '已加入书架';
      btn.classList.add('added');
    });
  }
  
  addToBookshelfButton.addEventListener('click', async () => {
    // 检查用户是否已登录
    const token = localStorage.getItem('bookstore_auth') ? 
      JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
    if (!token) {
      showToast('请先登录', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
      return;
    }
    
    // 如果书籍已在书架中，不需要再次添加
    if (addToBookshelfButton.classList.contains('btn-success')) {
      showToast('该书籍已在您的书架中', 'info');
      return;
    }
    
    try {
      // 显示加载状态
      const originalText = addToBookshelfButton.innerHTML;
      addToBookshelfButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 添加中...';
      addToBookshelfButton.disabled = true;
      
      // 调用API添加到书架
      await bookshelfApi.addToBookshelf(book.id);
      
      // 显示成功消息
      showToast('已成功添加到书架', 'success');
      
      // 更新按钮状态
      addToBookshelfButton.innerHTML = '<i class="fas fa-check"></i> 已添加';
      addToBookshelfButton.classList.remove('btn-secondary');
      addToBookshelfButton.classList.add('btn-success');
      addToBookshelfButton.disabled = true;
      
      // 更新首页中相同书籍的按钮状态
      document.querySelectorAll(`.add-btn[data-book-id="${book.id}"]`).forEach(btn => {
        btn.innerHTML = '已加入书架';
        btn.classList.add('added');
      });
    } catch (error) {
      console.error('添加到书架失败:', error);
      showToast('添加失败，请稍后再试', 'error');
      
      // 恢复按钮状态
      addToBookshelfButton.innerHTML = originalText;
      addToBookshelfButton.disabled = false;
    }
  });
}

// 个人资料页面初始化
function initProfilePage() {
  const profileForm = document.querySelector('.profile-form');
  if (profileForm) {
    // 加载用户信息
    loadUserProfile();
    
    // 表单提交
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // 获取表单数据
      const formData = new FormData(profileForm);
      const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        nickname: formData.get('nickname')
      };
      
      try {
        // 调用API更新用户信息
        await userApi.updateProfile(userData);
        showSuccessMessage('个人资料已更新');
      } catch (error) {
        console.error('更新个人资料失败:', error);
        showErrorMessage('更新个人资料失败，请稍后再试');
      }
    });
  }
  
  // 修改密码表单
  const passwordForm = document.querySelector('.password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // 获取表单数据
      const formData = new FormData(passwordForm);
      const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword')
      };
      
      // 验证新密码和确认密码是否一致
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        showErrorMessage('新密码和确认密码不一致');
        return;
      }
      
      try {
        // 调用API修改密码
        await userApi.changePassword(passwordData);
        showSuccessMessage('密码已修改');
        passwordForm.reset();
      } catch (error) {
        console.error('修改密码失败:', error);
        showErrorMessage('修改密码失败，请稍后再试');
      }
    });
  }
}

// 社区页面初始化
function initCommunityPage() {
  // 加载社区内容
  const communityContainer = document.querySelector('.community-container');
  if (communityContainer) {
    loadCommunityPosts();
  }
}

// 显示加载状态
function showLoadingState(container, message = '正在加载...') {
  if (!container) return;
  
  // 使用与首页完全一致的加载动画结构和样式
  const isAI = message.includes('AI');
  
  container.innerHTML = `
    <div class="loading-message">
      <div class="loading-indicator${isAI ? ' ai' : ''}">
        <svg class="loading-spinner" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3"></circle>
        </svg>
        <span>${message}</span>
      </div>
    </div>
    <div class="book-card-skeleton">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-author"></div>
      <div class="skeleton-tags"></div>
    </div>
    <div class="book-card-skeleton">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-author"></div>
      <div class="skeleton-tags"></div>
    </div>
    <div class="book-card-skeleton">
      <div class="skeleton-image"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-author"></div>
      <div class="skeleton-tags"></div>
    </div>
  `;
}

// 隐藏加载状态
function hideLoadingState() {
  // 移除加载指示器
  const loadingIndicator = document.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// 显示成功消息
function showSuccessMessage(message) {
  showMessage(message, 'success');
}

// 显示错误消息
function showErrorMessage(message) {
  showMessage(message, 'error');
}

// 显示消息
function showMessage(message, type) {
  // 创建消息元素
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type}`;
  messageElement.textContent = message;
  
  // 添加到页面
  document.body.appendChild(messageElement);
  
  // 3秒后自动移除
  setTimeout(() => {
    messageElement.remove();
  }, 3000);
}

// 显示登录提示
function showLoginPrompt() {
  // 先移除可能已存在的登录弹窗，防止重复显示
  const existingModal = document.getElementById('login-modal');
  if (existingModal) {
    existingModal.parentNode.removeChild(existingModal);
  }

  const modalHtml = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="login-modal">
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div class="text-center mb-4">
          <i class="fas fa-user-lock text-blue-500 text-4xl mb-3"></i>
          <h3 class="text-xl font-bold">需要登录</h3>
          <p class="text-gray-600 mt-2">请登录后继续操作</p>
        </div>
        <div class="flex justify-center space-x-4 mt-6">
          <button class="btn-secondary px-4 py-2" id="cancel-login">取消</button>
          <button class="btn-primary px-4 py-2" id="confirm-login">去登录</button>
        </div>
      </div>
    </div>
  `;
  
  // 添加模态框到页面
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // 获取模态框元素
  const modal = document.getElementById('login-modal');
  const cancelBtn = document.getElementById('cancel-login');
  const confirmBtn = document.getElementById('confirm-login');
  
  // 定义移除模态框的函数，确保能正确移除
  const removeModal = () => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };
  
  // 添加事件监听器
  cancelBtn.addEventListener('click', removeModal);
  
  confirmBtn.addEventListener('click', () => {
    // 保存当前URL，登录后可以返回
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('auth_redirect', currentPath);
    
    // 确定正确的登录页面路径
    let loginUrl = '';
    // 判断当前是否在pages目录下
    if (window.location.pathname.includes('/src/pages/')) {
      // 如果在pages目录下，使用相对路径
      loginUrl = 'login.html';
    } else {
      // 否则使用完整路径
      loginUrl = '/src/pages/login.html';
    }
    
    // 跳转到登录页面
    window.location.href = loginUrl;
  });
  
  // 点击背景关闭模态框
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      removeModal();
    }
  });
}

// 本地存储工具
const storage = {
  get: (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting data from localStorage:', error);
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing data from localStorage:', error);
      return false;
    }
  }
};

// 导出工具函数
export { storage };

// 初始化个人资料按钮
function initProfileButton() {
  console.log('initProfileButton 函数被调用');
  
  // 获取所有个人资料按钮（通过类名、图标或href属性匹配）
  const profileButtons = document.querySelectorAll('a[href*="profile.html"], .w-8.h-8.rounded-full.bg-blue-500');
  console.log('找到的个人资料按钮数量:', profileButtons.length);
  console.log('找到的个人资料按钮:', profileButtons);
  
  profileButtons.forEach((button, index) => {
    console.log(`为第 ${index + 1} 个按钮添加点击事件`);
    button.addEventListener('click', (e) => {
      console.log('个人资料按钮被点击');
      e.preventDefault();
      
      // 检查用户是否已登录
      const token = localStorage.getItem('bookstore_auth') ? 
        JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
      const user = localStorage.getItem('user');
      console.log('用户登录状态:', { token: !!token, user: !!user });
      
      if (token && user) {
        // 用户已登录，跳转到个人资料页面
        console.log('用户已登录，跳转到个人资料页面');
        window.location.href = '/src/pages/profile.html';
      } else {
        // 用户未登录，跳转到登录页面
        console.log('用户未登录，跳转到登录页面');
        window.location.href = '/src/pages/login.html';
      }
    });
  });
}

// 初始化筛选和排序功能
function initFilterAndSort() {
  // 检查用户是否登录
  const token = localStorage.getItem('bookstore_auth') ? 
    JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
  
  if (!token) {
    console.log('用户未登录，禁用筛选和排序功能');
    return; // 不添加筛选和排序事件监听器
  }
  
  // 筛选按钮
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.getAttribute('data-filter');
        
        // 更新按钮状态
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // 如果bookshelf.js中有applyFilter函数，则使用它
        if (window.applyFilter) {
          window.applyFilter(filter);
          return;
        }
        
        // 否则使用main.js中的实现
        applyFilter(filter);
      });
    });
  }
  
  // 排序下拉菜单
  const sortSelect = document.querySelector('.sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const sortBy = sortSelect.value;
      
      // 如果bookshelf.js中有applySorting函数，则使用它
      if (window.applySorting) {
        window.applySorting(sortBy);
        return;
      }
      
      // 否则使用main.js中的实现
      applySorting(sortBy);
    });
  }
}

// 应用筛选
function applyFilter(filter) {
  console.log('应用筛选:', filter);
  
  // 获取所有书籍卡片
  const bookCards = document.querySelectorAll('.book-card');
  
  // 如果没有书籍卡片，直接返回
  if (!bookCards.length) return;
  
  // 遍历所有书籍卡片
  bookCards.forEach(card => {
    const status = card.getAttribute('data-status');
    
    if (filter === 'all') {
      // 显示所有书籍
      card.style.display = '';
    } else if (filter === status) {
      // 显示匹配筛选条件的书籍
      card.style.display = '';
    } else {
      // 隐藏不匹配筛选条件的书籍
      card.style.display = 'none';
    }
  });
  
  // 检查是否有显示的书籍
  const visibleCards = document.querySelectorAll('.book-card[style="display: "]');
  const emptyMessage = document.querySelector('.empty-message');
  
  if (visibleCards.length === 0) {
    // 如果没有显示的书籍，显示空状态消息
    if (!emptyMessage) {
      const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
      if (bookshelfContent) {
        bookshelfContent.innerHTML += `
          <div class="empty-message text-center py-8">
            没有符合条件的书籍
          </div>
        `;
      }
    } else {
      emptyMessage.style.display = '';
    }
  } else if (emptyMessage) {
    // 如果有显示的书籍，隐藏空状态消息
    emptyMessage.style.display = 'none';
  }
}

// 应用排序
function applySorting(sortBy) {
  console.log('应用排序:', sortBy);
  
  // 获取书架内容容器
  const bookshelfContent = document.querySelector('.category-content[data-category="all"] .grid');
  if (!bookshelfContent) return;
  
  // 获取所有书籍卡片
  const bookCards = Array.from(bookshelfContent.querySelectorAll('.book-card'));
  
  // 如果没有书籍卡片，直接返回
  if (!bookCards.length) return;
  
  // 根据排序条件对书籍卡片进行排序
  bookCards.sort((a, b) => {
    const titleA = a.querySelector('h3').textContent.toLowerCase();
    const titleB = b.querySelector('h3').textContent.toLowerCase();
    const authorA = a.querySelector('p').textContent.toLowerCase();
    const authorB = b.querySelector('p').textContent.toLowerCase();
    const progressA = parseInt(a.getAttribute('data-progress') || '0');
    const progressB = parseInt(b.getAttribute('data-progress') || '0');
    const dateAddedA = new Date(a.getAttribute('data-added') || 0);
    const dateAddedB = new Date(b.getAttribute('data-added') || 0);
    
    switch (sortBy) {
      case 'title-asc':
        return titleA.localeCompare(titleB);
      case 'title-desc':
        return titleB.localeCompare(titleA);
      case 'author-asc':
        return authorA.localeCompare(authorB);
      case 'author-desc':
        return authorB.localeCompare(authorA);
      case 'progress-asc':
        return progressA - progressB;
      case 'progress-desc':
        return progressB - progressA;
      case 'date-added-asc':
        return dateAddedA - dateAddedB;
      case 'date-added-desc':
        return dateAddedB - dateAddedA;
      default:
        return 0;
    }
  });
  
  // 重新排列书籍卡片
  bookCards.forEach(card => {
    bookshelfContent.appendChild(card);
  });
}

// 导出函数到window对象
// 保存原始函数的引用，避免循环引用
const mainJsGenerateBookshelfCard = generateBookshelfCard;
const mainJsAddBookshelfCardListeners = addBookshelfCardListeners;

// 只有在window对象上没有这些函数时才导出
if (!window.generateBookshelfCard) {
  window.generateBookshelfCard = mainJsGenerateBookshelfCard;
}
if (!window.addBookshelfCardListeners) {
  window.addBookshelfCardListeners = mainJsAddBookshelfCardListeners;
}
if (!window.attachBookCardEventListeners) {
  window.attachBookCardEventListeners = mainJsAddBookshelfCardListeners;
}

// 其他函数可以直接导出，因为它们不会导致循环引用
window.loadUserBookshelf = loadUserBookshelf;
window.displayBookshelf = displayBookshelf;
window.updateBookshelfStats = updateBookshelfStats;
window.performBookshelfSearch = performBookshelfSearch;
window.applyFilter = applyFilter;
window.applySorting = applySorting; 
window.clearSearch = clearSearch;

// 确保在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('main.js DOMContentLoaded 事件触发');
});

// 获取认证令牌
function getToken() {
  return localStorage.getItem(config.cache.keys.AUTH_TOKEN) ? 
    JSON.parse(localStorage.getItem(config.cache.keys.AUTH_TOKEN)).token : null;
}

// 获取认证令牌（别名，与现有代码兼容）
function getAuthToken() {
  return getToken();
}

// 导出必要的函数给其他模块使用
export {
  loadUserBookshelf,
  updateBookshelfStats
};

// 显示搜索结果
function displaySearchResults(results) {
  // 获取搜索结果容器
  const searchResultsSection = document.querySelector('.search-results');
  if (!searchResultsSection) return;
  
  // 隐藏初始结果（如果存在）
  const initialResults = document.querySelector('.initial-results');
  if (initialResults) {
    initialResults.style.display = 'none';
  }
  
  // 检查搜索结果是否有效
  if (!results || !results.books || results.books.length === 0) {
    // 显示无结果的消息
    searchResultsSection.innerHTML = `
      <div class="text-center py-12">
        <img src="../images/no-results.svg" alt="无结果" class="w-40 h-40 mx-auto mb-4">
        <h3 class="text-lg font-semibold mb-2">未找到相关书籍</h3>
        <p class="text-gray-500">尝试使用不同的关键词或更广泛的描述。</p>
      </div>
    `;
    
    // 保存搜索查询到历史
    if (results.query) {
      saveSearchHistory(results.query);
    }
    
    return;
  }
  
  // 提取书籍数据
  const books = results.books;
  
  // 保存搜索查询到历史
  if (results.query) {
    saveSearchHistory(results.query);
  }
  
  // 更新界面以显示搜索结果
  let resultsHTML = `
    <h2 class="text-xl font-bold mb-4">搜索结果 (${books.length})</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  `;
  
  // 渲染书籍列表
  books.forEach(book => {
    resultsHTML += generateBookCard(book);
  });
  
  resultsHTML += '</div>';
  searchResultsSection.innerHTML = resultsHTML;
  
  // 确保ImageProxy模块已加载，用于处理豆瓣图片
  loadImageProxyModule();
  
  // 添加书籍卡片的事件监听器
  addBookCardListeners();
  
  // 更新搜索历史显示
  updateSearchHistoryDisplay();
  
  // 在搜索结果显示后应用图片代理
  if (window.ImageProxy) {
    setTimeout(() => {
      console.log('对搜索结果中的图片应用代理...');
      // 对所有豆瓣图片应用代理
      window.ImageProxy.applyImageProxy('img[data-douban-image="true"]');
      // 对所有需要代理的图片应用代理
      window.ImageProxy.applyImageProxy('img[data-needs-proxy="true"]');
    }, 200);
  }
  
  // 如果用户已登录，定期更新书籍卡片的书架状态
  if (isLoggedIn()) {
    // 首次刷新书架状态
    refreshBookshelfStatus();
    
    // 然后每隔一段时间刷新一次，以确保状态最新
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshBookshelfStatus();
      }
    }, 30000); // 每30秒刷新一次
    
    // 页面离开时清除定时器
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        clearInterval(refreshInterval);
      }
    }, { once: true });
  }
}

// 保存搜索历史
function saveSearchHistory(query) {
  if (!query || query.trim() === '') return;
  
  // 创建搜索历史项
  const searchItem = {
    query: query.trim(),
    timestamp: Date.now()
  };
  
  // 检查用户是否登录
  if (isLoggedIn()) {
    // 已登录：调用API保存搜索历史到服务器
    try {
      userApi.saveSearchHistory({
        query: searchItem.query,
        timestamp: searchItem.timestamp
      }).then(() => {
        console.log('搜索历史已保存到服务器');
      }).catch(error => {
        console.error('保存搜索历史到服务器失败:', error);
        // 如果API调用失败，保存到本地存储作为备份
        saveSearchHistoryToLocalStorage(searchItem);
      });
    } catch (error) {
      console.error('保存搜索历史到服务器失败:', error);
      // 如果API调用失败，保存到本地存储作为备份
      saveSearchHistoryToLocalStorage(searchItem);
    }
  } else {
    // 未登录：保存到本地存储
    saveSearchHistoryToLocalStorage(searchItem);
  }
}

// 保存搜索历史到本地存储
function saveSearchHistoryToLocalStorage(searchItem) {
  // 读取现有历史记录
  const existingHistory = getSearchHistoryFromLocalStorage();
  
  // 检查是否已存在相同查询
  const existingIndex = existingHistory.findIndex(item => item.query === searchItem.query);
  
  if (existingIndex !== -1) {
    // 如果查询已存在，更新时间戳并移到顶部
    existingHistory.splice(existingIndex, 1);
  }
  
  // 添加到历史记录顶部
  existingHistory.unshift(searchItem);
  
  // 如果历史记录超过10条，删除最旧的记录
  if (existingHistory.length > 10) {
    existingHistory.pop();
  }
  
  // 保存到本地存储
  localStorage.setItem(config.cache.keys.SEARCH_HISTORY, JSON.stringify(existingHistory));
  
  // 如果这是第一条记录，显示清除按钮
  if (existingHistory.length === 1) {
    const clearAllButton = document.getElementById('clearAllHistory');
    if (clearAllButton) {
      clearAllButton.classList.remove('hidden');
    }
  }
  
  // 更新UI
  updateSearchHistoryDisplay();
}

// 从本地存储获取搜索历史
function getSearchHistoryFromLocalStorage() {
  try {
    const history = localStorage.getItem(config.cache.keys.SEARCH_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('读取搜索历史失败:', error);
    return [];
  }
}

// 格式化日期显示
function formatDateForDisplay(timestamp) {
  // 检查输入是否为ISO字符串或时间戳数字
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '未知时间';
  }
  
  // 格式化日期
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 更新搜索历史显示
function updateSearchHistoryDisplay() {
  const searchHistoryContainer = document.querySelector('.search-history .bg-white');
  const clearAllButton = document.getElementById('clearAllHistory');
  
  if (!searchHistoryContainer) return;
  
  // 获取搜索历史
  const searchHistory = getSearchHistoryFromLocalStorage();
  
  // 处理清除所有按钮的显示逻辑
  if (clearAllButton) {
    if (searchHistory.length > 0) {
      clearAllButton.classList.remove('hidden');
    } else {
      clearAllButton.classList.add('hidden');
    }
  }
  
  // 如果没有搜索历史记录，显示默认内容
  if (!searchHistory.length) {
    searchHistoryContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-6">
        <img src="../images/no-results.svg" alt="无搜索历史" class="w-24 h-24 mb-4">
        <p class="text-gray-500 text-center">您还没有搜索记录</p>
        <p class="text-gray-400 text-sm text-center mt-2">尝试搜索一些内容，您的搜索记录将显示在这里</p>
      </div>
    `;
    return;
  }
  
  // 有搜索记录时，显示搜索历史列表
  let historyHTML = '<div class="space-y-4">';
  
  searchHistory.forEach((item, index) => {
    const isLast = index === searchHistory.length - 1;
    historyHTML += `
      <div class="flex justify-between items-center ${!isLast ? 'pb-3 border-b border-gray-100' : ''}">
        <div>
          <p class="font-medium">${item.query}</p>
          <p class="text-gray-500 text-sm mt-1">${formatDateForDisplay(item.timestamp)}</p>
        </div>
        <div class="flex space-x-2">
          <button class="text-blue-500 hover:text-blue-600 search-again" data-query="${item.query}">
            <i class="fas fa-search"></i>
          </button>
          <button class="text-gray-400 hover:text-gray-500 delete-history" data-index="${index}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
  });
  
  historyHTML += '</div>';
  searchHistoryContainer.innerHTML = historyHTML;
  
  // 添加重新搜索事件监听器
  document.querySelectorAll('.search-again').forEach(button => {
    button.addEventListener('click', () => {
      const query = button.getAttribute('data-query');
      if (query) {
        // 填充搜索框
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          searchInput.value = query;
          // 触发搜索
          const searchForm = document.querySelector('.search-form');
          if (searchForm) {
            searchForm.dispatchEvent(new Event('submit'));
          }
        }
      }
    });
  });
  
  // 添加删除历史记录事件监听器
  document.querySelectorAll('.delete-history').forEach(button => {
    button.addEventListener('click', () => {
      const index = parseInt(button.getAttribute('data-index'), 10);
      if (!isNaN(index)) {
        deleteSearchHistoryItem(index);
      }
    });
  });
}

// 删除搜索历史项
function deleteSearchHistoryItem(index) {
  // 获取搜索历史
  const searchHistory = getSearchHistoryFromLocalStorage();
  
  // 检查索引是否有效
  if (index < 0 || index >= searchHistory.length) return;
  
  // 获取要删除的项目
  const itemToDelete = searchHistory[index];
  
  if (isLoggedIn() && itemToDelete.id) {
    // 已登录且有服务器ID：从服务器删除
    try {
      userApi.deleteSearchHistory(itemToDelete.id).then(() => {
        console.log('已从服务器删除搜索历史');
        // 从本地存储中删除
        searchHistory.splice(index, 1);
        localStorage.setItem(config.cache.keys.SEARCH_HISTORY, JSON.stringify(searchHistory));
        // 更新UI
        updateSearchHistoryDisplay();
        // 显示提示
        showToast('已删除该搜索记录', 'success');
      }).catch(error => {
        console.error('从服务器删除搜索历史失败:', error);
        // 如果API调用失败，仅本地删除
        searchHistory.splice(index, 1);
        localStorage.setItem(config.cache.keys.SEARCH_HISTORY, JSON.stringify(searchHistory));
        // 更新UI
        updateSearchHistoryDisplay();
        // 显示提示
        showToast('已删除该搜索记录', 'success');
      });
    } catch (error) {
      console.error('从服务器删除搜索历史失败:', error);
      // 如果API调用失败，仅本地删除
      searchHistory.splice(index, 1);
      localStorage.setItem(config.cache.keys.SEARCH_HISTORY, JSON.stringify(searchHistory));
      // 更新UI
      updateSearchHistoryDisplay();
      // 显示提示
      showToast('已删除该搜索记录', 'success');
    }
  } else {
    // 未登录或无服务器ID：仅从本地删除
    searchHistory.splice(index, 1);
    localStorage.setItem(config.cache.keys.SEARCH_HISTORY, JSON.stringify(searchHistory));
    // 更新UI
    updateSearchHistoryDisplay();
    // 显示提示
    showToast('已删除该搜索记录', 'success');
  }
  
  // 如果删除后没有历史记录了，隐藏清除所有按钮
  if (searchHistory.length === 0) {
    const clearAllButton = document.getElementById('clearAllHistory');
    if (clearAllButton) {
      clearAllButton.classList.add('hidden');
    }
  }
}

// 初始化搜索历史
function initSearchHistory() {
  const searchHistorySection = document.querySelector('.search-history');
  if (!searchHistorySection) return;
  
  // 更新搜索历史显示
  updateSearchHistoryDisplay();
  
  // 添加清除所有历史记录按钮事件
  const clearAllButton = document.getElementById('clearAllHistory');
  if (clearAllButton) {
    clearAllButton.addEventListener('click', () => {
      if (isLoggedIn()) {
        // 已登录：从服务器清除所有历史记录
        try {
          userApi.clearSearchHistory().then(() => {
            console.log('已从服务器清除所有搜索历史');
            // 更新UI
            updateSearchHistoryDisplay();
            // 显示成功消息
            showToast('已清除所有搜索历史', 'success');
          }).catch(error => {
            console.error('从服务器清除搜索历史失败:', error);
            // 如果API调用失败，仅清除本地存储
            localStorage.removeItem(config.cache.keys.SEARCH_HISTORY);
            // 更新UI
            updateSearchHistoryDisplay();
            // 显示成功消息
            showToast('已清除所有搜索历史', 'success');
          });
        } catch (error) {
          console.error('从服务器清除搜索历史失败:', error);
          // 如果API调用失败，仅清除本地存储
          localStorage.removeItem(config.cache.keys.SEARCH_HISTORY);
          // 更新UI
          updateSearchHistoryDisplay();
          // 显示成功消息
          showToast('已清除所有搜索历史', 'success');
        }
      } else {
        // 未登录：清空本地存储中的搜索历史
        localStorage.removeItem(config.cache.keys.SEARCH_HISTORY);
        // 更新UI
        updateSearchHistoryDisplay();
        // 显示成功消息
        showToast('已清除所有搜索历史', 'success');
      }
    });
  }
}

// 为AI搜索添加防抖和请求锁
let searchRequestInProgress = false;
let lastSearchTime = 0;
const MIN_SEARCH_INTERVAL = 5000; // 最小搜索间隔，单位毫秒

/**
 * 执行AI智能搜索
 * @param {string} query 搜索查询
 * @param {HTMLElement} container 结果容器
 */
async function performAISearch(query, container) {
  try {
    // 检查是否有请求正在进行中
    if (searchRequestInProgress) {
      console.warn('搜索请求正在处理中，请等待当前请求完成');
      showToast('请等待当前搜索完成', 'warning');
      return;
    }
    
    // 检查距离上次搜索的时间间隔
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    
    if (timeSinceLastSearch < MIN_SEARCH_INTERVAL) {
      const remainingTime = Math.ceil((MIN_SEARCH_INTERVAL - timeSinceLastSearch) / 1000);
      console.warn(`搜索请求过于频繁，请在${remainingTime}秒后再试`);
      
      container.innerHTML = `
        <div class="bg-amber-50 text-amber-600 p-4 rounded-lg">
          <h3 class="font-bold mb-2">请求过于频繁</h3>
          <p>为了确保AI服务质量，请在${remainingTime}秒后再尝试新的搜索。</p>
        </div>
      `;
      
      return;
    }
    
    // 设置请求锁和时间戳
    searchRequestInProgress = true;
    lastSearchTime = now;
    
    // 显示AI搜索进行中的界面
    showAISearchProgress(container, query);
    
    try {
      // 调用AI搜索API
      const response = await aiApi.searchBooks(query);
      console.log('AI搜索请求提交成功:', response);
      
      if (!response.success || !response.sessionId) {
        throw new Error(response.message || '搜索请求提交失败');
      }
      
      // 保存搜索历史
      saveSearchHistory(query);
      
      // 开始轮询搜索进度
      await pollSearchProgress(response.sessionId, container, query);
      
    } catch (error) {
      console.error('搜索错误:', error);
      
      container.innerHTML = `
        <div class="bg-red-50 text-red-500 p-4 rounded-lg">
          搜索时出错: ${error.message || '未知错误'}
        </div>
      `;
    } finally {
      // 解除请求锁
      searchRequestInProgress = false;
    }
  } catch (error) {
    console.error('搜索错误:', error);
    
    container.innerHTML = `
      <div class="bg-red-50 text-red-500 p-4 rounded-lg">
        搜索时出错: ${error.message || '未知错误'}
      </div>
    `;
    
    // 确保请求锁被释放
    searchRequestInProgress = false;
  }
}

/**
 * 显示AI搜索进行中的界面
 * @param {HTMLElement} container 容器元素
 * @param {string} query 搜索查询
 */
function showAISearchProgress(container, query) {
  container.innerHTML = `
    <h2 class="text-xl font-bold mb-4">AI智能搜索: "${query}"</h2>
    
    <div class="ai-search-progress mb-8">
      <!-- 进度条 -->
      <div class="relative pt-1">
        <div class="flex mb-2 items-center justify-between">
          <div>
            <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
              搜索进行中
            </span>
          </div>
          <div class="text-right">
            <span id="search-progress-percentage" class="text-xs font-semibold inline-block text-blue-600">
              0%
            </span>
          </div>
        </div>
        <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
          <div id="search-progress-bar" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500" style="width: 0%"></div>
        </div>
      </div>
      
      <!-- AI思考过程 -->
      <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 class="font-semibold text-gray-700 mb-2">AI思考过程:</h3>
        <ul id="ai-thinking-list" class="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>正在分析您的搜索需求...</li>
        </ul>
      </div>
    </div>
    
    <div id="ai-search-results" class="mt-8">
      <!-- 搜索结果将在这里显示 -->
    </div>
  `;
}

/**
 * 轮询搜索进度
 * @param {string} sessionId 会话ID
 * @param {HTMLElement} container 容器元素
 * @param {string} query 搜索查询
 * @returns {Promise<void>} 完成时解析的Promise
 */
async function pollSearchProgress(sessionId, container, query) {
  return new Promise((resolve, reject) => {
    let completed = false;
    let retryCount = 0;
    
    // 使用时间控制而不是固定次数
    const maxWaitTime = 180000; // 最大等待时间180秒
    const startTime = Date.now();
    
    // 配置更保守的轮询参数
    const initialInterval = 1500; // 初始轮询间隔提高到1.5秒
    let interval = initialInterval;
    let consecutiveErrorCount = 0; // 连续错误计数
    let consecutiveEmptyResponseCount = 0; // 连续空响应计数
    const maxConsecutiveErrors = 3; // 最大连续错误次数
    
    // 记录上次请求时间，用于限制请求频率
    let lastRequestTime = 0;
    const minRequestInterval = 1000; // 最小请求间隔1秒
    
    // 使用更智能的指数退避策略
    const updateProgress = async () => {
      try {
        // 基于时间判断是否超时
        const elapsedTime = Date.now() - startTime;
        if (completed || elapsedTime > maxWaitTime) {
          if (elapsedTime > maxWaitTime && !completed) {
            console.error(`搜索请求超时，已等待${elapsedTime / 1000}秒`);
            const aiSearchResults = document.getElementById('ai-search-results');
            if (aiSearchResults) {
              aiSearchResults.innerHTML = `
                <div class="bg-red-50 text-red-500 p-4 rounded-lg">
                  <h3 class="font-bold mb-2">搜索处理超时</h3>
                  <p>很抱歉，智能搜索处理时间超过了预期。这可能是因为我们的AI服务当前负载过高或您的查询特别复杂。</p>
                  <p class="mt-2">您可以:</p>
                  <ul class="list-disc pl-5 mt-1">
                    <li>稍后再试</li>
                    <li>尝试简化您的搜索查询</li>
                    <li>使用更具体的关键词</li>
                  </ul>
                  <button class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" 
                    onclick="document.querySelector('.search-form').scrollIntoView({behavior: 'smooth'})">
                    返回搜索
                  </button>
                </div>
              `;
            }
          }
          resolve(); // 解析Promise
          return;
        }
        
        // 检查请求频率限制
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        
        if (timeSinceLastRequest < minRequestInterval) {
          // 如果距离上次请求时间太短，则等待
          const waitTime = minRequestInterval - timeSinceLastRequest;
          console.log(`请求过于频繁，等待${waitTime}ms再发送下一个请求`);
          setTimeout(updateProgress, waitTime);
          return;
        }
        
        // 更新上次请求时间
        lastRequestTime = now;
        retryCount++;
        
        // 记录轮询信息
        console.log(`轮询搜索进度 [${retryCount}], 已等待${elapsedTime / 1000}秒, 间隔:${interval}ms`);
        
        // 发送请求
        const response = await aiApi.getSearchProgress(sessionId);
        
        // 重置连续错误计数
        consecutiveErrorCount = 0;
        
        // 检查响应是否有效
        if (!response.success) {
          // 处理API返回的错误
          if (response.message && response.message.includes('请求过于频繁')) {
            console.warn('服务器提示请求过于频繁，增加轮询间隔');
            // 响应错误为频率限制，大幅增加轮询间隔
            interval = Math.min(interval * 2.5, 8000); // 指数级增加间隔，最大8秒
            setTimeout(updateProgress, interval);
            return;
          } else {
            throw new Error(response.message || '获取搜索进度失败');
          }
        }
        
        // 提取进度数据
        const progressData = response.data;
        
        // 检查是否有进度数据
        if (!progressData) {
          consecutiveEmptyResponseCount++;
          console.warn(`收到空响应 (${consecutiveEmptyResponseCount}次)`);
          
          if (consecutiveEmptyResponseCount >= 3) {
            // 连续多次收到空响应，可能是服务器问题
            throw new Error('多次收到空响应，服务器可能存在问题');
          }
          
          // 增加轮询间隔并继续
          interval = Math.min(interval * 1.5, 5000);
          setTimeout(updateProgress, interval);
          return;
        }
        
        // 重置空响应计数
        consecutiveEmptyResponseCount = 0;
        
        console.log('获取到搜索进度数据:', progressData.status, progressData.progress, '结果数量:', progressData.results ? progressData.results.length : 0);
        
        // 更新进度条
        const progressBar = document.getElementById('search-progress-bar');
        const progressPercentage = document.getElementById('search-progress-percentage');
        
        if (progressBar && progressPercentage) {
          progressBar.style.width = `${progressData.progress}%`;
          progressPercentage.textContent = `${progressData.progress}%`;
        }
        
        // 更新思考过程
        const thinkingList = document.getElementById('ai-thinking-list');
        if (thinkingList && progressData.thinking) {
          thinkingList.innerHTML = progressData.thinking.map(thought => 
            `<li>${thought}</li>`
          ).join('');
          
          // 自动滚动到最新的思考过程
          const thoughtItems = thinkingList.querySelectorAll('li');
          if (thoughtItems.length > 0) {
            thoughtItems[thoughtItems.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        
        // 检查是否完成
        if (progressData.status === 'completed') {
          console.log('搜索完成，状态:', progressData.status);
          completed = true;
          
          // 检查是否有有效结果
          if (progressData.results && progressData.results.length > 0) {
            console.log('搜索完成，找到结果:', progressData.results.length);
            // 立即显示结果
            displayAISearchResults(progressData.results, query, container, progressData.aiAnalysis);
          } else {
            console.warn('搜索完成，但没有找到结果');
            container.innerHTML = `
              <div class="text-center py-12">
                <img src="../images/no-results.svg" alt="无结果" class="w-40 h-40 mx-auto mb-4">
                <h3 class="text-lg font-semibold mb-2">未找到相关书籍</h3>
                <p class="text-gray-500 mb-4">尝试使用不同的关键词或更广泛的描述。</p>
                <button class="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" 
                  onclick="document.querySelector('.search-form').scrollIntoView({behavior: 'smooth'})">
                  返回搜索
                </button>
              </div>
            `;
          }
          resolve(); // 解析Promise
          return;
        } else if (progressData.status === 'failed') {
          console.error('搜索处理失败');
          completed = true;
          
          const aiSearchResults = document.getElementById('ai-search-results');
          if (aiSearchResults) {
            aiSearchResults.innerHTML = `
              <div class="bg-red-50 text-red-500 p-4 rounded-lg">
                <h3 class="font-bold mb-2">搜索处理失败</h3>
                <p>很抱歉，处理您的请求时出现了问题。这可能是因为我们的AI服务当前负载过高。</p>
                <p class="mt-2">建议：</p>
                <ul class="list-disc pl-5 mt-1">
                  <li>稍后再试</li>
                  <li>尝试更简短或更具体的搜索查询</li>
                </ul>
                <button class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" 
                  onclick="document.querySelector('.search-form').scrollIntoView({behavior: 'smooth'})">
                  返回搜索
                </button>
              </div>
            `;
          }
          
          resolve(); // 解析Promise
          return;
        }
        
        // 动态调整轮询间隔，基于进度和已用时间
        if (progressData.progress >= 90) {
          // 接近完成时，缩短轮询间隔
          interval = 800;
        } else if (progressData.progress >= 70) {
          interval = 1200;
        } else if (progressData.progress >= 40) {
          interval = 2000;
        } else {
          // 根据已经等待的时间动态调整间隔
          const timeRatio = elapsedTime / maxWaitTime;
          if (timeRatio > 0.7) {
            interval = 1500; // 等待时间超过70%，适当缩短间隔
          } else if (timeRatio > 0.5) {
            interval = 2500;
          } else {
            interval = 3000; // 初始阶段使用较长间隔
          }
        }
        
        // 如果没有完成，继续轮询
        if (!completed) {
          setTimeout(updateProgress, interval);
        }
        
      } catch (error) {
        console.error('轮询搜索进度失败:', error);
        
        // 增加连续错误计数
        consecutiveErrorCount++;
        
        // 基于时间判断是否应该继续尝试
        const elapsedTime = Date.now() - startTime;
        
        if (consecutiveErrorCount >= maxConsecutiveErrors) {
          console.error(`连续 ${maxConsecutiveErrors} 次请求失败，停止轮询`);
          const aiSearchResults = document.getElementById('ai-search-results');
          if (aiSearchResults) {
            aiSearchResults.innerHTML = `
              <div class="bg-red-50 text-red-500 p-4 rounded-lg">
                <h3 class="font-bold mb-2">连接问题</h3>
                <p>很抱歉，我们无法与搜索服务保持连接。这可能是因为网络问题或服务器限制。</p>
                <p class="mt-2">您可以:</p>
                <ul class="list-disc pl-5 mt-1">
                  <li>检查您的网络连接</li>
                  <li>等待几分钟后重试</li>
                  <li>刷新页面后重新搜索</li>
                </ul>
                <button class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" 
                  onclick="document.querySelector('.search-form').scrollIntoView({behavior: 'smooth'})">
                  返回搜索
                </button>
              </div>
            `;
          }
          reject(error);
          return;
        }
        
        if (!completed && elapsedTime < maxWaitTime) {
          // 使用更激进的指数退避策略
          const backoffFactor = Math.pow(2, consecutiveErrorCount);
          interval = Math.min(interval * backoffFactor, 10000); // 最大间隔10秒
          console.log(`使用退避策略，下次轮询间隔: ${interval}ms`);
          setTimeout(updateProgress, interval);
        } else {
          const aiSearchResults = document.getElementById('ai-search-results');
          if (aiSearchResults) {
            aiSearchResults.innerHTML = `
              <div class="bg-red-50 text-red-500 p-4 rounded-lg">
                <h3 class="font-bold mb-2">连接问题</h3>
                <p>很抱歉，我们无法与搜索服务保持连接。这可能是因为网络问题或服务器负载过高。</p>
                <p class="mt-2">您可以:</p>
                <ul class="list-disc pl-5 mt-1">
                  <li>检查您的网络连接</li>
                  <li>刷新页面后重试</li>
                  <li>稍后再尝试搜索</li>
                </ul>
                <button class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" 
                  onclick="document.querySelector('.search-form').scrollIntoView({behavior: 'smooth'})">
                  返回搜索
                </button>
              </div>
            `;
          }
          reject(error); // 拒绝Promise
        }
      }
    };
    
    // 开始轮询
    updateProgress();
  });
}

/**
 * 显示AI搜索结果
 * @param {Array} books 书籍数据
 * @param {string} query 搜索查询
 * @param {HTMLElement} container 容器元素
 * @param {string} aiAnalysis AI分析内容
 */
function displayAISearchResults(books, query, container, aiAnalysis = '') {
  console.log('显示AI搜索结果:', books);
  
  // 确保有结果可显示
  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <img src="../images/no-results.svg" alt="无结果" class="w-40 h-40 mx-auto mb-4">
        <h3 class="text-lg font-semibold mb-2">未找到相关书籍</h3>
        <p class="text-gray-500">尝试使用不同的关键词或更广泛的描述。</p>
      </div>
    `;
    return;
  }
  
  // 使用Marked.js将Markdown格式的AI分析转换为HTML
  let parsedAnalysis = '';
  if (aiAnalysis && typeof aiAnalysis === 'string') {
    try {
      // 检查marked库是否存在
      if (typeof marked === 'function') {
        // 移除json代码块（如果有）
        let cleanedAnalysis = aiAnalysis;
        
        // 移除可能包含的JSON块
        const jsonBlockRegex = /```json[\s\S]*?```/g;
        cleanedAnalysis = cleanedAnalysis.replace(jsonBlockRegex, '');
        
        // 移除markdown中的特殊字符如\n
        cleanedAnalysis = cleanedAnalysis.replace(/\\n/g, '\n');
        
        // 使用marked解析Markdown
        parsedAnalysis = marked.parse(cleanedAnalysis);
        console.log('Markdown解析成功');
      } else {
        // 如果marked库不可用，回退到基本的文本处理
        console.warn('Marked.js库未加载，使用基本文本处理');
        parsedAnalysis = aiAnalysis.split('\n').filter(line => line.trim()).map(line => `<p>${line}</p>`).join('');
      }
    } catch (error) {
      console.error('Markdown解析错误:', error);
      // 出错时回退到基本的文本处理
      parsedAnalysis = aiAnalysis.split('\n').filter(line => line.trim()).map(line => `<p>${line}</p>`).join('');
    }
  }
  
  // 创建头部展示内容
  const headerHtml = `
    <h2 class="text-xl font-bold mb-2">AI智能搜索: "${query}"</h2>
    ${aiAnalysis ? `
      <div class="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 class="font-semibold text-blue-700 mb-2">AI分析:</h3>
        <div class="text-sm text-gray-700 space-y-2 ai-analysis markdown-content">
          ${parsedAnalysis}
        </div>
      </div>
    ` : ''}
    <p class="mb-4 text-gray-600">为您找到 <span class="font-semibold">${books.length}</span> 本相关书籍</p>
  `;
  
  // 为了更好的用户体验，使用分页显示结果
  const booksPerPage = window.innerWidth >= 768 ? 9 : 6; // 响应式调整每页显示数量
  let currentPage = 1;
  const totalPages = Math.ceil(books.length / booksPerPage);
  
  // 创建结果容器和分页
  container.innerHTML = `
    ${headerHtml}
    <div class="books-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <!-- 书籍卡片将在这里动态添加 -->
    </div>
    ${totalPages > 1 ? `
      <div class="pagination flex justify-center items-center space-x-2 mt-6">
        <button class="pagination-prev bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50" disabled>
          上一页
        </button>
        <span class="page-info text-gray-600">第 <span class="current-page">1</span> 页，共 <span class="total-pages">${totalPages}</span> 页</span>
        <button class="pagination-next bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded">
          下一页
        </button>
      </div>
    ` : ''}
  `;
  
  const booksGrid = container.querySelector('.books-grid');
  
  // 确保在显示书籍状态前，已加载最新的书架数据
  const renderBooks = () => {
    // 书籍分页展示函数
    function displayBooksForPage(page, booksPerPage) {
      const startIndex = (page - 1) * booksPerPage;
      const endIndex = Math.min(startIndex + booksPerPage, books.length);
      const booksToShow = books.slice(startIndex, endIndex);
      
      booksGrid.innerHTML = '';
      
      // 尝试获取用户书架数据，用于判断书籍是否已在书架中
      let userBookshelfData = [];
      try {
        // 如果已登录，从本地变量获取书架数据
        if (isLoggedIn() && window.currentBookshelfData) {
          userBookshelfData = window.currentBookshelfData;
          console.log('从window.currentBookshelfData获取书架数据:', userBookshelfData.length, '本书');
        }
      } catch (err) {
        console.error('获取书架数据失败:', err);
      }
      
      // 为每本书添加延迟，创造动画效果
      booksToShow.forEach((book, index) => {
        const delay = index * 100; // 100ms的延迟增量
        
        // 创建卡片容器
        const bookCardWrapper = document.createElement('div');
        bookCardWrapper.className = 'book-card-wrapper transform transition duration-500';
        bookCardWrapper.style.opacity = '0';
        bookCardWrapper.style.transform = 'translateY(20px)';
        bookCardWrapper.dataset.id = book.id || `search-${Date.now()}-${index}`;
        
        // 为每本书设置不同的动画延迟
        setTimeout(() => {
          bookCardWrapper.style.opacity = '1';
          bookCardWrapper.style.transform = 'translateY(0)';
        }, delay);
        
        // 数据兼容处理 - 统一处理字段名称差异
        const bookData = {
          id: book.id || book._id || `search-${Date.now()}-${index}`,
          title: book.title || book.name || '未知书名',
          author: book.author || '未知作者',
          tags: book.tags || book.categories || [],
          coverUrl: book.coverImage || book.cover || book.coverUrl || '../images/default-book-cover.svg',
          introduction: book.description || book.introduction || '暂无简介',
          popularity: book.popularity || book.heat || 0,
          rating: book.rating || 0,
          searchFrequency: book.searchFrequency || book.frequency || 0,
          reasons: book.reasons || ''
        };
        
        // 确保标签始终是数组格式
        if (!Array.isArray(bookData.tags)) {
          if (typeof bookData.tags === 'string') {
            bookData.tags = bookData.tags.split(',').map((tag) => tag.trim());
          } else {
            bookData.tags = [];
          }
        }
        
        // 检查书籍是否已经在书架中 - 考虑所有可能的匹配方式
        const isInBookshelf = userBookshelfData.some(item => {
          // 书架项中可能有两种结构：1) 直接数据 2) 有book或Book子对象
          const shelfBook = item.Book || item.book || item;
          
          // 记录所有可能的ID
          const possibleIds = [
            bookData.id, 
            String(bookData.id)
          ];
          
          // 记录所有可能的书架中对应的ID
          const possibleShelfIds = [
            shelfBook.id,
            String(shelfBook.id),
            shelfBook.bookId,
            String(shelfBook.bookId),
            item.bookId,
            String(item.bookId),
            item.book_id,
            String(item.book_id)
          ].filter(Boolean); // 过滤掉null/undefined
          
          // 1. 优先通过标题匹配（最可靠的跨页面匹配方式）
          if (bookData.title && shelfBook.title && 
              bookData.title.trim().toLowerCase() === shelfBook.title.trim().toLowerCase()) {
            console.log(`✅ 通过标题精确匹配确认书籍已在书架中: "${bookData.title}"`);
            return true;
          }
          
          // 移除ID匹配和部分标题匹配逻辑，因为它们可能导致误匹配
          // 仅使用精确标题匹配判断书籍是否在书架中
          
          return false;
        });
        
        console.log(`书籍 "${bookData.title}" ${isInBookshelf ? '已在' : '不在'}书架中`);
        
        // 检查是否有搜索频率数据，如果有则使用搜索频率展示，否则使用评分展示
        let ratingOrFrequencyHtml = '';
        if (bookData.searchFrequency || bookData.searchFrequency === 0) {
          // 使用搜索频率
          ratingOrFrequencyHtml = generateSearchFrequencyIndicator(bookData.searchFrequency);
          console.log(`书籍 "${bookData.title}" 使用搜索频率展示: ${bookData.searchFrequency}`);
        } else {
          // 使用评分
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
          ratingOrFrequencyHtml = `<div class="flex items-center">
                                    ${starsHtml}
                                    <span class="text-gray-600 text-sm ml-1">${bookData.rating.toFixed(1)}</span>
                                  </div>`;
        }
        
        // 准备简介内容，处理过长的情况
        const shortIntro = bookData.introduction.length > 60 
          ? bookData.introduction.substring(0, 60) + '...' 
          : bookData.introduction;
        
        // 准备加入书架按钮的状态
        const shelfBtnClass = isInBookshelf ? 'btn btn-add-shelf added' : 'btn btn-add-shelf';
        const shelfBtnText = isInBookshelf ? '已加入书架' : '加入书架';
        const shelfBtnDisabled = isInBookshelf ? 'disabled' : '';
        
        // 使用与首页相同的卡片结构
        bookCardWrapper.innerHTML = `
          <div class="book-card" data-book-id="${bookData.id}">
            <div class="book-card-content">
              <!-- 书籍封面区域 -->
              <div class="book-cover-container">
                ${createBookCoverElement(bookData)}
              </div>
              
              <!-- 书籍信息区域 -->
              <div class="book-info-container">
                <h3 class="book-title">${bookData.title}</h3>
                <p class="book-author">${bookData.author}</p>
                
                <!-- 评分或搜索频率区域 -->
                <div class="book-rating-container">
                  ${ratingOrFrequencyHtml}
                </div>
    
                <!-- 简介区域 -->
                <div class="tooltip">
                  <div class="book-introduction">${shortIntro}</div>
                  <div class="tooltip-text">${bookData.introduction}</div>
                </div>
              </div>
              
              <!-- 操作按钮区域 -->
              <div class="book-actions">
                <a href="/src/pages/book-detail.html?id=${encodeURIComponent(bookData.id || bookData.title)}" class="btn btn-read">阅读</a>
                <button class="${shelfBtnClass}" onclick="addToBookshelf('${encodeURIComponent(bookData.id || bookData.title)}')" ${shelfBtnDisabled}>${shelfBtnText}</button>
              </div>
            </div>
          </div>
        `;
        
        // 添加到容器
        booksGrid.appendChild(bookCardWrapper);
      });
      
      // 更新分页信息
      const currentPageEl = container.querySelector('.current-page');
      if (currentPageEl) {
        currentPageEl.textContent = page;
      }
      
      // 更新分页按钮状态
      const prevBtn = container.querySelector('.pagination-prev');
      const nextBtn = container.querySelector('.pagination-next');
      
      if (prevBtn) {
        prevBtn.disabled = page <= 1;
      }
      
      if (nextBtn) {
        nextBtn.disabled = page >= totalPages;
      }
      
      // 添加书籍卡片的事件监听
      addBookCardListeners();
      
      // 添加描述工具提示
      setupDescriptionTooltips();
    }
    
    // 初始化显示第一页
    displayBooksForPage(currentPage, booksPerPage);
    
    // 添加分页事件监听
    const prevBtn = container.querySelector('.pagination-prev');
    const nextBtn = container.querySelector('.pagination-next');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          displayBooksForPage(currentPage, booksPerPage);
          // 滚动到结果顶部
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          displayBooksForPage(currentPage, booksPerPage);
          // 滚动到结果顶部
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  };

  // 添加保存搜索历史的功能
  saveSearchHistory(query);
  
  // 更新搜索历史显示
  updateSearchHistoryDisplay();
  
  // 确保在渲染书籍前先加载最新的书架数据
  if (isLoggedIn()) {
    // 先显示加载提示
    booksGrid.innerHTML = '<div class="col-span-3 text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>加载书架数据中...</div>';
    
    // 加载书架数据完成后再渲染书籍
    loadUserBookshelfData().then(() => {
      console.log('智能搜索页面：已加载最新书架数据，准备渲染书籍');
      renderBooks();
    }).catch(err => {
      console.error('加载书架数据失败:', err);
      // 即使加载失败，也要显示书籍结果
      renderBooks();
    });
  } else {
    // 未登录用户直接渲染书籍
    renderBooks();
  }
}

// 加载用户书架数据
async function loadUserBookshelfData(forceReload = false) {
  try {
    if (!isLoggedIn()) {
      console.log('用户未登录，无法加载书架数据');
      return [];
    }
    
    // 如果已经有缓存数据且不需要强制刷新，直接返回
    if (!forceReload && window.currentBookshelfData && window.currentBookshelfData.length > 0) {
      console.log('使用缓存的书架数据，共', window.currentBookshelfData.length, '本书');
      return window.currentBookshelfData;
    }
    
    console.log('从服务器加载最新书架数据');
    
    // 使用书架API获取数据
    const response = await bookshelfApi.getBookshelf();
    console.log('书架数据加载成功:', response);
    
    // 处理不同的API响应结构
    let bookshelfData = [];
    
    if (response && response.bookshelf) {
      bookshelfData = response.bookshelf;
    } else if (response && response.data && response.data.bookshelf) {
      bookshelfData = response.data.bookshelf;
    } else if (Array.isArray(response)) {
      bookshelfData = response;
    } else {
      console.warn('API响应格式不符合预期:', response);
      bookshelfData = [];
    }
    
    // 确保每个书籍条目都有标题信息，以便通过标题匹配
    bookshelfData = bookshelfData.map(item => {
      const bookInfo = item.Book || item;
      // 如果没有title字段，但有bookTitle或name字段，使用它
      if (!bookInfo.title && (bookInfo.bookTitle || bookInfo.name)) {
        bookInfo.title = bookInfo.bookTitle || bookInfo.name;
      }
      return item;
    });
    
    // 保存到全局变量
    window.currentBookshelfData = bookshelfData;
    window.lastBookshelfLoadTime = Date.now(); // 记录最后加载时间
    
    // 刷新页面上书籍的书架状态
    refreshBookshelfStatus();
    
    console.log(`成功加载书架数据，共 ${bookshelfData.length} 本书`);
    
    return bookshelfData;
  } catch (error) {
    console.error('加载用户书架数据失败:', error);
    // 保留旧数据，不要覆盖为空数组，除非确实没有数据
    if (!window.currentBookshelfData) {
      window.currentBookshelfData = [];
    }
    return window.currentBookshelfData;
  }
}

// 刷新搜索结果中书籍的书架状态
function refreshBookshelfStatus() {
  if (!window.currentBookshelfData || !isLoggedIn()) {
    return;
  }
  
  console.log('刷新搜索结果中书籍的书架状态...');
  
  // 刷新首页和其他页面的书籍卡片
  const bookCards = document.querySelectorAll('.book-card-wrapper');
  if (bookCards.length > 0) {
    bookCards.forEach(card => {
      const bookId = card.dataset.id;
      if (!bookId) return;
      
      // 尝试获取书籍标题用于额外的匹配
      let bookTitle = '';
      const titleElement = card.querySelector('.book-title');
      if (titleElement) {
        bookTitle = titleElement.textContent.trim();
      }
      
      // 检查书籍是否在书架中 - 考虑所有可能的匹配方式
      const isInBookshelf = window.currentBookshelfData.some(item => {
        // 书架项中可能有两种结构：1) 直接数据 2) 有book或Book子对象
        const shelfBook = item.Book || item.book || item;
        
        // 记录所有可能的ID
        const possibleIds = [
          bookId, 
          String(bookId)
        ];
        
        // 记录所有可能的书架中对应的ID
        const possibleShelfIds = [
          shelfBook.id,
          String(shelfBook.id),
          shelfBook.bookId,
          String(shelfBook.bookId),
          item.bookId,
          String(item.bookId),
          item.book_id,
          String(item.book_id)
        ].filter(Boolean); // 过滤掉null/undefined
        
        // 1. 优先通过标题匹配（最可靠的跨页面匹配方式）
        if (bookTitle && shelfBook.title && 
            bookTitle.toLowerCase() === shelfBook.title.toLowerCase()) {
          console.log(`✅ 通过标题精确匹配确认书籍在书架中: "${bookTitle}"`);
          return true;
        }
        
        // 移除基于ID和部分标题的匹配逻辑，因为它们可能导致误匹配
        // 仅使用精确标题匹配判断
        
        return false;
      });
      
      // 更新按钮状态
      const addButton = card.querySelector('.btn-add-shelf');
      if (addButton) {
        if (isInBookshelf && !addButton.classList.contains('added')) {
          console.log(`更新书籍"${bookTitle || bookId}"按钮状态为"已加入书架"`);
          addButton.classList.add('added');
          addButton.textContent = '已加入书架';
          addButton.disabled = true; // 确保禁用按钮
        } else if (!isInBookshelf && addButton.classList.contains('added')) {
          console.log(`更新书籍"${bookTitle || bookId}"按钮状态为"加入书架"`);
          addButton.classList.remove('added');
          addButton.textContent = '加入书架';
          addButton.disabled = false; // 确保启用按钮
        }
      }
    });
  }
  
  // 特别处理智能搜索页面的书籍卡片
  const searchPageCards = document.querySelectorAll('.search-result-grid .book-card');
  if (searchPageCards.length > 0) {
    console.log('刷新智能搜索页面中的书籍状态:', searchPageCards.length, '本书');
    searchPageCards.forEach(card => {
      const bookId = card.getAttribute('data-book-id');
      if (!bookId) return;
      
      // 尝试获取书籍标题用于额外的匹配
      let bookTitle = '';
      const titleElement = card.querySelector('.book-title');
      if (titleElement) {
        bookTitle = titleElement.textContent.trim();
      }
      
      // 检查书籍是否在书架中 - 使用精确匹配
      const isInBookshelf = window.currentBookshelfData && window.currentBookshelfData.some(item => {
        // 适配不同的数据结构
        const shelfBook = item.book || item.Book || item;
        const shelfBookId = shelfBook.id || item.bookId || item.book_id;
        const shelfBookTitle = shelfBook.title || '';
        
        // 打印比较日志
        console.log(`搜索页面比较: "${bookTitle}"(ID:${bookId}) 与书架中: "${shelfBookTitle}"(ID:${shelfBookId})`);
        
        // 仅使用精确标题匹配，不使用ID匹配
        // 因为ID可能为undefined或不可靠，导致错误匹配
        if (bookTitle && shelfBookTitle && 
            bookTitle.trim().toLowerCase() === shelfBookTitle.trim().toLowerCase()) {
          console.log(`✅ 搜索页面: 通过标题精确匹配确认书籍在书架中: "${bookTitle}"`);
          return true;
        }
        
        return false;
      });
      
      // 更新按钮状态
      const addButton = card.querySelector('.btn-add-shelf');
      if (addButton) {
        if (isInBookshelf && !addButton.classList.contains('added')) {
          addButton.classList.add('added');
          addButton.textContent = '已加入书架';
          addButton.disabled = true;
        } else if (!isInBookshelf && addButton.classList.contains('added')) {
          addButton.classList.remove('added');
          addButton.textContent = '加入书架';
          addButton.disabled = false;
        }
      }
    });
  }
}

/**
 * 更新所有相同书籍的卡片状态
 * @param {string} bookIdOrTitle - 书籍ID或标题
 * @param {boolean} isInBookshelf - 是否在书架中
 */
function updateAllBookCardStates(bookIdOrTitle, isInBookshelf) {
  if (!bookIdOrTitle) return;
  
  console.log(`更新所有书籍卡片状态: ${bookIdOrTitle}, 在书架中: ${isInBookshelf}`);
  
  // 解码ID（如果需要）
  let decodedId = bookIdOrTitle;
  if (typeof bookIdOrTitle === 'string' && bookIdOrTitle.includes('%')) {
    decodedId = decodeURIComponent(bookIdOrTitle);
  }
  
  // 获取所有可能需要更新的书籍标题
  let possibleTitles = [];
  
  // 如果decodedId看起来像标题而不是ID（不是纯数字），添加它
  if (isNaN(decodedId) || decodedId.length > 5) {
    possibleTitles.push(decodedId);
  }
  
  // 从全局书架数据中查找更多可能的标题
  if (window.currentBookshelfData) {
    window.currentBookshelfData.forEach(item => {
      const shelfBook = item.Book || item.book || item;
      
      // 检查是否匹配ID
      if (shelfBook.id == decodedId || 
          shelfBook.bookId == decodedId || 
          item.bookId == decodedId || 
          item.book_id == decodedId) {
        // 如果匹配ID，添加标题
        if (shelfBook.title && !possibleTitles.includes(shelfBook.title)) {
          possibleTitles.push(shelfBook.title);
        }
      }
    });
  }
  
  console.log(`可能的书籍标题: ${possibleTitles.join(', ')}`);
  
  // 函数：更新按钮状态
  const updateButton = (button, inShelf) => {
    if (!button) return;
    
    if (inShelf) {
      button.textContent = '已加入书架';
      button.classList.add('added');
      button.disabled = true;
    } else {
      button.textContent = '加入书架';
      button.classList.remove('added');
      button.disabled = false;
    }
  };
  
  // 注释掉ID匹配逻辑，因为ID匹配不可靠
  // document.querySelectorAll(`.book-card[data-book-id="${decodedId}"]`).forEach(card => {
  //  console.log(`✅ 通过ID匹配到卡片: ${decodedId}`);
  //  updateButton(card.querySelector('.btn-add-shelf'), isInBookshelf);
  // });
  
  // 2. 更新所有匹配标题的卡片（针对不同页面的相同书籍）
  const allCards = document.querySelectorAll('.book-card');
  allCards.forEach(card => {
    // 获取卡片中的标题
    const titleElement = card.querySelector('.book-title');
    if (titleElement) {
      const cardTitle = titleElement.textContent.trim();
      
      // 检查是否匹配任何可能的标题
      // 检查是否匹配任何可能的标题 - 仅精确匹配
      const titleMatch = possibleTitles.some(title => 
        cardTitle.toLowerCase() === title.toLowerCase()
      );
      
      // 只通过标题精确匹配更新按钮状态，不再使用ID匹配
      if (titleMatch) {
        console.log(`✅ 通过标题或ID匹配到卡片: ${cardTitle || card.getAttribute('data-book-id')}`);
        updateButton(card.querySelector('.btn-add-shelf'), isInBookshelf);
      }
    }
  });
  
  // 3. 特别处理智能搜索页面的卡片
  const searchPageCards = document.querySelectorAll('.books-grid .book-card, .search-result-grid .book-card');
  searchPageCards.forEach(card => {
    const titleElement = card.querySelector('.book-title');
    const cardId = card.getAttribute('data-book-id');
    
    if (titleElement) {
      const cardTitle = titleElement.textContent.trim();
      // 检查是否匹配任何可能的标题
      // u4ec5u4f7fu7528u7cbeu786eu6807u9898u5339u914du800cu4e0du662fu6a21u7ccau5339u914d
      const titleMatch = possibleTitles.some(title => 
        cardTitle.toLowerCase() === title.toLowerCase()
      );
      
      // u79fbu9664IDu5339u914duff0cu53eau4f7fu7528u7cbeu786eu6807u9898u5339u914d
      if (titleMatch) {
        console.log(`✅ 在搜索页面匹配到卡片: "${cardTitle}"`);
        updateButton(card.querySelector('.btn-add-shelf'), isInBookshelf);
      }
    }
  });
  
  // 4. 如果存在详情页的按钮，也更新它
  const detailPageButton = document.getElementById('add-to-bookshelf-btn');
  if (detailPageButton) {
    const buttonBookId = detailPageButton.getAttribute('data-book-id');
    
    // 检查ID匹配
    const idMatch = buttonBookId === decodedId;
    
    // 检查标题匹配（如果页面上有书名）
    const titleElement = document.querySelector('.book-detail-container h1, .book-detail-title');
    let titleMatch = false;
    
    if (titleElement) {
      const pageTitle = titleElement.textContent.trim();
      titleMatch = possibleTitles.some(title => 
        pageTitle.toLowerCase() === title.toLowerCase() || 
        pageTitle.toLowerCase().includes(title.toLowerCase()) || 
        title.toLowerCase().includes(pageTitle.toLowerCase())
      );
    }
    
    if (idMatch || titleMatch) {
      if (isInBookshelf) {
        detailPageButton.innerHTML = '<i class="fas fa-check"></i> 已添加';
        detailPageButton.classList.remove('btn-secondary');
        detailPageButton.classList.add('btn-success');
        detailPageButton.disabled = true;
      } else {
        detailPageButton.innerHTML = '加入书架';
        detailPageButton.classList.remove('btn-success');
        detailPageButton.classList.add('btn-secondary');
        detailPageButton.disabled = false;
      }
    }
  }
  
  // 5. 刷新所有书架状态
  refreshBookshelfStatus();
}

// 处理加入书架按钮点击事件
function handleAddToBookshelf(event) {
  // 阻止默认行为和事件冒泡
  event.preventDefault();
  event.stopPropagation();
  
  // 防止重复点击，使用一个标记来跟踪是否已经在处理中
  if (window.isAddingToBookshelf) {
    console.log('已有添加请求正在处理中，忽略重复点击');
    return;
  }
  
  window.isAddingToBookshelf = true;
  
  // 检查用户是否已登录
  if (!isLoggedIn()) {
    showLoginPrompt();
    window.isAddingToBookshelf = false;
    return;
  }
  
  // 获取按钮所在的书籍卡片
  const button = event.currentTarget;
  const bookCard = button.closest('.book-card');
  
  if (!bookCard) {
    showErrorMessage('无法找到书籍信息');
    window.isAddingToBookshelf = false;
    return;
  }
  
  // 获取书籍ID
  let bookId = button.getAttribute('data-book-id') || bookCard.getAttribute('data-book-id');
  
  // 检查按钮当前状态，如果已经添加，则不再重复操作
  if (button.classList.contains('added')) {
    showMessage('该书籍已在您的书架中', 'info');
    window.isAddingToBookshelf = false;
    return;
  }
  
  // 备份按钮原始文本，用于恢复
  const originalText = button.textContent;
  
  // 临时更改按钮状态为"添加中..."
  button.textContent = '添加中...';
  button.disabled = true;
  
  // 获取详细的书籍信息 - 尝试从卡片中获取标题和作者
  let bookInfo = {
    title: bookId, // 默认使用ID作为标题
    author: '未知作者',
    description: '暂无简介',
    coverImage: 'default-cover.png'
  };
  
  // 尝试从卡片获取更准确的书籍信息
  const titleElement = bookCard.querySelector('.book-title');
  const authorElement = bookCard.querySelector('.book-author');
  
  if (titleElement) {
    bookInfo.title = titleElement.textContent.trim();
  }
  
  if (authorElement) {
    bookInfo.author = authorElement.textContent.trim();
  }
  
  // 从卡片中获取详细信息
  try {
    // 获取标题
    const titleElement = bookCard.querySelector('.book-title');
    if (titleElement) {
      bookInfo.title = titleElement.textContent.trim();
    }
    
    // 获取作者
    const authorElement = bookCard.querySelector('.book-author');
    if (authorElement) {
      bookInfo.author = authorElement.textContent.trim();
    }
    
    // 获取简介
    const introElement = bookCard.querySelector('.tooltip-text') || bookCard.querySelector('.book-introduction');
    if (introElement) {
      bookInfo.description = introElement.textContent.trim();
    }
    
    // 获取封面图片
    const coverElement = bookCard.querySelector('.book-cover-image') || bookCard.querySelector('.book-cover');
    if (coverElement && coverElement.src) {
      bookInfo.coverImage = coverElement.src;
    }
    
    console.log('从卡片提取到的书籍信息:', bookInfo);
  } catch (infoError) {
    console.error('提取书籍信息时出错:', infoError);
  }
  
  // 处理临时ID（以search-开头），使用书籍标题作为ID
  if (bookId && bookId.startsWith('search-')) {
    console.log(`检测到临时ID ${bookId}，将使用书籍标题作为ID: ${bookInfo.title}`);
    bookId = bookInfo.title;
  }
  
  // 获取API基础URL
  let apiBaseUrl = '';
  if (window.config && window.config.api && window.config.api.baseUrl) {
    apiBaseUrl = window.config.api.baseUrl;
  } else {
    apiBaseUrl = '/api';
  }
  
  // 获取token
  const token = getToken();
  
  // 发送请求到API
  fetch(`${apiBaseUrl}/books/${encodeURIComponent(bookId || 'unknown')}/bookshelf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      reading_status: '未开始',
      current_page: 0,
      title: bookInfo.title, // 确保保存书籍标题，用于跨页面统一书架状态判断
      author: bookInfo.author,
      description: bookInfo.description,
      coverImage: bookInfo.coverImage
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
    if (result.ok || (result.status === 400 && result.data.message === "该书籍已在您的书架中")) {
      // 成功添加到书架或书籍已在书架中
      console.log('添加书籍成功或已在书架中:', result.data);
      
      // 更新按钮状态
      button.textContent = '已加入书架';
      button.classList.add('added');
      button.disabled = true;
      
      // 更新本地书架缓存 (如果有)
      if (typeof updateLocalBookshelfCache === 'function') {
        updateLocalBookshelfCache(bookId);
      } else {
        console.log('updateLocalBookshelfCache函数不存在，跳过本地缓存更新');
      }
      
        // 更新所有相同书籍的卡片状态
  updateAllBookCardStates(bookId, true);
  
  // 显示成功消息
  showSuccessMessage(result.status === 400 ? result.data.message : '成功添加到书架');
  
  // 更新全局书架数据，添加新书籍
  if (window.currentBookshelfData) {
    // 如果是新添加的书籍，添加到全局书架数据中
    const isAlreadyInBookshelf = window.currentBookshelfData.some(item => {
      const shelfBook = item.Book || item.book || item;
      return shelfBook.id === bookId || shelfBook.bookId === bookId || item.bookId === bookId || item.book_id === bookId ||
             (bookInfo.title && shelfBook.title && bookInfo.title.toLowerCase() === shelfBook.title.toLowerCase());
    });
    
    if (!isAlreadyInBookshelf) {
      console.log('将新添加的书籍添加到全局书架数据中:', bookInfo.title);
      // 添加新书籍到全局书架数据
      window.currentBookshelfData.push({
        bookId: bookId,
        book_id: bookId,
        book: {
          id: bookId,
          title: bookInfo.title,
          author: bookInfo.author,
          coverImage: bookInfo.coverImage,
          description: bookInfo.description
        }
      });
    }
  }
    } else {
      // 其他错误
      console.error('添加书籍失败:', result);
      
      // 恢复按钮状态
      button.textContent = originalText;
      button.disabled = false;
      
      const errorMessage = result.data && result.data.message 
        ? result.data.message 
        : '添加书籍失败，请稍后重试';
      
      showErrorMessage(errorMessage);
    }
  })
  .catch(error => {
    console.error('添加书籍请求失败:', error);
    
    // 恢复按钮状态
    button.textContent = originalText;
    button.disabled = false;
    
    showErrorMessage(error.message || '网络错误，请稍后再试');
  })
  .finally(() => {
    // 请求完成后，重置标记
    window.isAddingToBookshelf = false;
  });
}

// 将handleAddToBookshelf暴露给全局，以便onclick属性可以调用它
window.handleAddToBookshelf = handleAddToBookshelf;

/**
 * 添加书籍到书架 - 与首页保持一致的实现
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
      if (window.showLoginPrompt) {
        window.showLoginPrompt();
      } else if (window.showErrorMessage) {
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
    
    // 显示加载状态 - 只获取当前点击的按钮，通过onclick属性选择
    const btn = document.querySelector(`.btn-add-shelf[onclick*="${bookId}"]:not(.added)`);
    if (!btn) {
      console.log('未找到对应按钮或按钮已标记为added');
      window.isAddingToBookshelf = false;
      return;
    }
    
    const originalText = btn.textContent;
    btn.textContent = '添加中...';
    btn.disabled = true;
    
    // 获取书籍卡片的完整信息
    const bookCard = btn.closest('.book-card');
    let bookInfo = {
      title: decodedBookId,
      author: '未知作者',
      description: '暂无简介',
      coverImage: 'default-cover.png'
    };
    
    // 尝试从卡片中提取更多书籍信息
    try {
      // 获取标题 - 优先从卡片中获取
      const titleElement = bookCard.querySelector('.book-title');
      if (titleElement) {
        bookInfo.title = titleElement.textContent.trim();
        console.log('从卡片提取到书籍标题:', bookInfo.title);
      }
      
      // 获取作者
      const authorElement = bookCard.querySelector('.book-author');
      if (authorElement) {
        bookInfo.author = authorElement.textContent.trim();
      }
      
      // 获取简介
      const introElement = bookCard.querySelector('.tooltip-text');
      if (introElement) {
        bookInfo.description = introElement.textContent.trim();
      }
      
      // 获取封面图片
      const coverElement = bookCard.querySelector('.book-cover-image');
      if (coverElement && coverElement.src) {
        bookInfo.coverImage = coverElement.src;
      }
      
      console.log('从卡片提取到的书籍信息:', bookInfo);
    } catch (infoError) {
      console.error('提取书籍信息时出错:', infoError);
    }
    
    // 发送请求到API - 使用与首页完全一致的格式
    fetch(`${apiBaseUrl}/books/${decodedBookId}/bookshelf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reading_status: '未开始',
        current_page: 0,
        title: bookInfo.title, // 确保传递正确的书籍标题
        author: bookInfo.author,
        description: bookInfo.description,
        coverImage: bookInfo.coverImage
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
      if (result.ok || (result.status === 400 && result.data.message === "该书籍已在您的书架中")) {
        // 成功添加到书架或书籍已在书架中
        console.log('添加书籍成功或已在书架中:', result.data);
        
        // 更新按钮状态
        btn.textContent = '已加入书架';
        btn.classList.add('added');
        btn.disabled = true;
        
        // 更新所有相同书籍的卡片状态
        updateAllBookCardStates(decodedBookId, true);
        
        // 显示成功消息
        if (window.showSuccessMessage) {
          window.showSuccessMessage(result.status === 400 ? result.data.message : '成功添加到书架');
        } else if (window.showToast) {
          window.showToast(result.status === 400 ? result.data.message : '已添加到书架', 'success');
        } else {
          alert(result.status === 400 ? result.data.message : '已添加到书架');
        }
        
        // 更新全局书架数据，添加新书籍
        if (window.currentBookshelfData) {
          // 如果是新添加的书籍，添加到全局书架数据中
          const isAlreadyInBookshelf = window.currentBookshelfData.some(item => {
            const shelfBook = item.Book || item.book || item;
            return shelfBook.id === decodedBookId || shelfBook.bookId === decodedBookId || 
                   item.bookId === decodedBookId || item.book_id === decodedBookId ||
                   (bookInfo.title && shelfBook.title && bookInfo.title.toLowerCase() === shelfBook.title.toLowerCase());
          });
          
          if (!isAlreadyInBookshelf) {
            console.log('将新添加的书籍添加到全局书架数据中:', bookInfo.title);
            // 添加新书籍到全局书架数据
            window.currentBookshelfData.push({
              bookId: decodedBookId,
              book_id: decodedBookId,
              book: {
                id: decodedBookId,
                title: bookInfo.title,
                author: bookInfo.author,
                coverImage: bookInfo.coverImage,
                description: bookInfo.description
              }
            });
          }
        }
      } else {
        // 其他错误
        console.error('添加书籍失败:', result);
        
        // 恢复按钮状态
        btn.textContent = originalText;
        btn.disabled = false;
        
        const errorMessage = result.data && result.data.message 
          ? result.data.message 
          : '添加失败，请稍后再试';
        
        if (window.showErrorMessage) {
          window.showErrorMessage(errorMessage);
        } else {
          alert(errorMessage);
        }
      }
    })
    .catch(error => {
      console.error('添加书籍请求失败:', error);
      
      // 恢复按钮状态
      btn.textContent = originalText;
      btn.disabled = false;
      
      if (window.showErrorMessage) {
        window.showErrorMessage(error.message || '网络错误，请稍后再试');
      } else {
        alert('网络错误，请稍后再试');
      }
    })
    .finally(() => {
      // 请求完成后，重置标记
      window.isAddingToBookshelf = false;
    });
  } catch (error) {
    console.error('添加书籍到书架时出错:', error);
    window.isAddingToBookshelf = false;
    
    if (window.showErrorMessage) {
      window.showErrorMessage('操作失败，请稍后再试');
    } else {
      alert('操作失败，请稍后再试');
    }
  }
}

// 将addToBookshelf函数暴露给全局，以便onclick属性可以调用它
window.addToBookshelf = addToBookshelf;



