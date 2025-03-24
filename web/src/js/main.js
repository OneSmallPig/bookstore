// 导入样式
import '../css/styles.css';

console.log('main.js 文件已加载');

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

console.log('API服务已导入');

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
  console.log('初始化搜索页面');
  
  // 如果当前不在搜索页面，则返回
  if (!window.location.pathname.includes('/search')) {
    return;
  }
  
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
        searchResults.innerHTML = `
          <div class="py-8 flex justify-center">
            <div class="loader"></div>
          </div>
        `;
      }
      
      try {
        const response = await bookApi.searchBooks(query);
        displaySearchResults(response);
      } catch (error) {
        console.error('搜索错误:', error);
        
        if (searchResults) {
          searchResults.innerHTML = `
            <div class="bg-red-50 text-red-500 p-4 rounded-lg">
              搜索时出错: ${error.message || '未知错误'}
            </div>
          `;
        }
      }
    });
  }
  
  // 测试API连接
  testApiConnection();
  
  // 加载热门搜索
  loadPopularSearches();
  
  // 初始化搜索历史
  initSearchHistory();
  
  // 初始化搜索示例
  initSearchExamples();
}

// 加载ImageProxy模块
function loadImageProxyModule() {
  if (window.ImageProxy) {
    console.log('ImageProxy模块已加载');
    return;
  }
  
  console.log('加载ImageProxy模块...');
  
  // 创建script元素
  const script = document.createElement('script');
  script.src = '../js/imageProxy.js';
  script.async = true;
  script.onload = function() {
    console.log('ImageProxy模块加载成功');
  };
  script.onerror = function() {
    console.error('ImageProxy模块加载失败');
  };
  
  // 添加到文档中
  document.head.appendChild(script);
}

// 创建书籍封面元素
function createBookCoverElement(bookData) {
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
        
        // 返回带有代理处理标记的图片元素，添加备用图像
        return `<img src="${coverUrl}" alt="${bookData.title}" class="book-cover" 
                data-original-src="${coverUrl}" 
                data-use-proxy="true"
                onerror="this.onerror=null; handleBookCoverError(this);">`;
      } else {
        // 非豆瓣图片，正常加载
        return `<img src="${coverUrl}" alt="${bookData.title}" class="book-cover" 
                onerror="this.onerror=null; handleBookCoverError(this);">`;
      }
    } catch (e) {
      console.warn('无效的封面URL:', coverUrl, e);
      // 如果URL无效，使用默认图片
      return `<img src="../images/default-book-cover.svg" alt="${bookData.title}" class="book-cover">`;
    }
  }
  
  // 使用默认图片
  return `<img src="../images/default-book-cover.svg" alt="${bookData.title}" class="book-cover">`;
}

// 处理书籍封面加载错误
function handleBookCoverError(img) {
  console.warn('书籍封面加载失败，尝试使用备用方法:', img.src);
  
  // 获取原始URL
  const originalUrl = img.dataset.originalSrc || img.src;
  
  // 检查是否为豆瓣图片
  const isDoubanImage = originalUrl.includes('douban') || originalUrl.includes('doubanio');
  
  // 如果ImageProxy模块不可用，则先加载它
  if (!window.ImageProxy) {
    console.log('ImageProxy模块未加载，正在加载...');
    loadImageProxyModule();
    // 设置一个短暂的延迟，等待模块加载
    setTimeout(() => {
      // 递归调用自己，此时ImageProxy可能已加载
      handleBookCoverError(img);
    }, 300);
    return;
  }
  
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
      return; // 尝试使用代理加载，不立即显示默认图片
    }
  }
  
  // 如果图片代理服务不可用或代理失败，使用默认图片
  img.src = '../images/default-book-cover.svg';
}

// 将函数添加到全局作用域
window.handleBookCoverError = handleBookCoverError;

// 测试API连接
async function testApiConnection() {
  try {
    console.log('测试API连接...');
    const url = `${config.api.baseUrl}/ai/test?time=${Date.now()}`;
    console.log('测试URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API测试结果:', data);
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
    
    console.log('开始加载热门搜索数据...');
    
    // 显示加载状态 - 使用统一的加载动画
    showLoadingState(initialResultsContainer, 'AI正在为您推荐热门搜索...');
    
    // 检查缓存
    const cachedData = checkPopularSearchesCache();
    if (cachedData) {
      console.log('从缓存中获取热门搜索数据');
      renderBooks(cachedData, initialResultsContainer);
      return;
    }
    
    // 尝试从API获取数据
    try {
      console.log('尝试从API获取热门搜索数据');
      const response = await aiApi.getPopularSearches({ limit: 3 });
      
      if (response && response.data && response.data.length > 0) {
        // 缓存结果
        savePopularSearchesToCache(response.data);
        
        // 渲染结果
        renderBooks(response.data, initialResultsContainer);
        return;
      }
    } catch (apiError) {
      console.error('API获取热门搜索失败:', apiError);
    }
    
    // 如果API调用失败，使用本地默认数据
    console.log('使用默认热门搜索数据');
    const mockData = getDefaultPopularSearches();
    renderBooks(mockData, initialResultsContainer);
    
  } catch (error) {
    console.error('加载热门搜索失败:', error);
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
  const searchInput = document.querySelector('.search-input');
  
  if (!searchExamples.length || !searchInput) {
    console.warn('搜索示例按钮或搜索输入框不存在');
    return;
  }
  
  console.log('初始化搜索示例按钮...');
  
  searchExamples.forEach(button => {
    button.addEventListener('click', () => {
      // 获取示例文本
      const exampleText = button.textContent.trim();
      
      // 填充到搜索框
      searchInput.value = exampleText;
      
      // 让搜索框获取焦点
      searchInput.focus();
      
      // 自动触发搜索（可选）
      // document.querySelector('.search-form button[type="submit"]').click();
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
      id: book.id || book._id || book.title || '',
      title: book.title || book.name || '未知书名',
      author: book.author || '未知作者',
      tags: book.tags || book.categories || [],
      coverUrl: book.coverImage || book.cover || book.coverUrl || '../images/default-book-cover.svg',
      introduction: book.description || book.introduction || '暂无简介',
      popularity: book.popularity || book.heat || 0,
      rating: book.rating || 0,
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
      // 考虑不同的数据结构
      const shelfBook = item.Book || item;
      return shelfBook.id === bookData.id || 
             shelfBook.bookId === bookData.id || 
             shelfBook.title === bookData.title;
    });
    
    console.log(`书籍 "${bookData.title}" ${isInBookshelf ? '已在' : '不在'}书架中`);
    
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
    
    // 使用与首页相同的卡片结构
    bookCardWrapper.innerHTML = `
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
  // 为所有阅读按钮添加事件
  document.querySelectorAll('.book-card .btn-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); // 阻止a标签默认行为
      e.stopPropagation(); // 阻止事件冒泡
      
      // 获取书籍ID
      const card = btn.closest('.book-card-wrapper');
      const bookId = card ? card.dataset.id : null;
      
      if (bookId) {
        console.log('阅读书籍:', bookId);
        // 跳转到阅读页面
        window.location.href = `./pages/book.html?id=${bookId}`;
      } else {
        console.error('未找到书籍ID');
      }
    });
  });
  
  // 为所有加入书架按钮添加事件
  document.querySelectorAll('.book-card .btn-add-shelf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      
      // 检查用户是否登录
      if (!isLoggedIn()) {
        console.log('用户未登录，显示登录提示');
        showLoginPrompt();
        return;
      }
      
      // 获取书籍ID
      let bookId = btn.dataset.bookId;
      if (!bookId) {
        // 尝试从父元素获取
        const card = btn.closest('.book-card-wrapper');
        bookId = card ? card.dataset.id : null;
      }
      
      if (!bookId) {
        console.error('未找到书籍ID');
        return;
      }
      
      // 如果按钮已有added类，说明书籍已在书架中，不重复添加
      if (btn.classList.contains('added')) {
        console.log('书籍已在书架中');
        showMessage('该书籍已在您的书架中', 'info');
        return;
      }
      
      console.log('添加书籍到书架:', bookId);
      
      // 发送请求到API
      fetch(`${API_BASE_URL}/api/bookshelf/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ bookId })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('添加书籍成功:', data);
        
        // 更新按钮状态
        btn.classList.add('added');
        btn.textContent = '已加入书架';
        
        // 显示成功消息
        showSuccessMessage('成功添加到书架');
        
        // 如果有本地书架数据，更新它
        if (window.currentBookshelfData) {
          // 获取当前书籍数据
          const bookElements = document.querySelectorAll(`.book-card-wrapper[data-id="${bookId}"]`);
          if (bookElements.length > 0) {
            const bookElement = bookElements[0];
            const titleElement = bookElement.querySelector('.book-title');
            const authorElement = bookElement.querySelector('.book-author');
            const coverElement = bookElement.querySelector('.book-cover');
            
            // 创建书籍对象
            const book = {
              id: bookId,
              title: titleElement ? titleElement.textContent : '未知书名',
              author: authorElement ? authorElement.textContent : '未知作者',
              coverUrl: coverElement ? coverElement.src : '',
            };
            
            // 添加到本地数据
            window.currentBookshelfData.push({ Book: book });
          }
        }
      })
      .catch(error => {
        console.error('添加书籍失败:', error);
        showErrorMessage('添加书籍失败，请稍后重试');
      });
    });
  });
  
  // 为整个卡片添加点击事件（跳转到详情页）
  document.querySelectorAll('.book-card-wrapper').forEach(card => {
    card.addEventListener('click', () => {
      const bookId = card.dataset.id;
      if (bookId) {
        console.log('查看书籍详情:', bookId);
        window.location.href = `./pages/book.html?id=${bookId}`;
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
  
  // 处理简介，增加字数限制
  const description = book.description ? 
    (book.description.length > 100 ? book.description.substring(0, 100) + '...' : book.description) : 
    '暂无简介';
  
  // 获取封面图片URL，如果没有则使用默认图片
  const coverImage = book.coverImage || book.cover_image || 'src/images/default-book-cover.svg';
  
  // 根据是否已在书架中设置按钮文本和样式
  const addBtnClass = isInBookshelf ? 'add-to-bookshelf in-bookshelf' : 'add-to-bookshelf';
  const addBtnIcon = isInBookshelf ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>';
  
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
        <div class="flex items-center mb-2">
          ${generateStarRating(rating)}
          <span class="text-gray-600 text-sm ml-1">${rating.toFixed(1)}</span>
        </div>
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
  
  try {
    // 显示加载状态
    showLoadingState();
    
    // 调用API获取用户书架
    const bookshelfData = await bookshelfApi.getBookshelf();
    console.log('搜索获取到的书架数据:', JSON.stringify(bookshelfData, null, 2));
    
    // 确保我们正确处理bookshelf数据
    const bookshelfItems = bookshelfData.bookshelf || bookshelfData || [];
    
    if (!bookshelfItems || !Array.isArray(bookshelfItems) || bookshelfItems.length === 0) {
      throw new Error('获取书架数据失败或书架为空');
    }
    
    // 过滤匹配的书籍
    const filteredBooks = bookshelfItems.filter(book => {
      // 获取书籍信息，考虑可能的数据结构
      const bookInfo = book.Book || book;
      
      // 在标题、作者、描述中搜索
      const title = bookInfo.title || '';
      const author = bookInfo.author || '';
      const description = bookInfo.description || '';
      
      const searchableText = `${title} ${author} ${description}`.toLowerCase();
      return searchableText.includes(query.toLowerCase());
    });
    
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
          <button class="bg-blue-500 text-white px-4 py-2 rounded-lg" onclick="window.location.reload()">
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
        <button class="text-blue-500 hover:text-blue-700 flex items-center" onclick="window.location.reload()">
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

// 生成书架卡片HTML
function generateBookshelfCard(book) {
  // 如果bookshelf.js中已经定义了这个函数，则使用那个版本
  // 但要避免递归调用自己
  if (window.generateBookshelfCard && window.generateBookshelfCard !== generateBookshelfCard) {
    return window.generateBookshelfCard(book);
  }
  
  console.log('生成书架卡片:', book);
  
  // 确保我们有正确的书籍数据结构
  const bookInfo = book.Book || book;
  const progress = book.progress || 0;
  const status = book.status || 'toRead';
  
  // 获取书籍信息
  const bookId = bookInfo.id || book.bookId || '';
  const title = bookInfo.title || '未知标题';
  const author = bookInfo.author || '未知作者';
  const cover = bookInfo.coverUrl || bookInfo.cover || '../images/default-cover.jpg';
  
  // 根据状态设置标签
  let statusLabel = '';
  let statusClass = '';
  
  if (status === 'reading') {
    statusLabel = '阅读中';
    statusClass = 'bg-blue-100 text-blue-800';
  } else if (status === 'completed' || status === 'finished') {
    statusLabel = '已完成';
    statusClass = 'bg-green-100 text-green-800';
  } else {
    statusLabel = '未读';
    statusClass = 'bg-yellow-100 text-yellow-800';
  }
  
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
        <img src="${cover}" alt="${title}" class="book-cover w-32 h-48 mb-3 object-cover rounded">
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
  
  // 移出书架按钮点击事件
  const removeButtons = document.querySelectorAll('.remove-from-shelf-btn');
  removeButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const bookCard = button.closest('.book-card');
      const bookId = bookCard ? bookCard.dataset.bookId : null;
      
      if (bookId && confirm('确定要从书架中移除这本书吗？')) {
        try {
          await bookshelfApi.removeFromBookshelf(bookId);
          showToast('书籍已从书架移除', 'success');
          
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
  });
  
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
  try {
    // 检查用户是否登录
    const token = localStorage.getItem('bookstore_auth') ? 
      JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
    if (!token) {
      // 未登录，显示登录提示
      showLoginPrompt();
      return null;
    }
    
    // 显示加载状态
    showLoadingState();
    
    // 调用API获取用户书架
    const bookshelfData = await bookshelfApi.getBookshelf();
    console.log('获取到的书架数据类型:', typeof bookshelfData);
    console.log('获取到的书架数据:', JSON.stringify(bookshelfData, null, 2));
    
    // 确保我们正确处理bookshelf数据
    const books = bookshelfData.bookshelf || bookshelfData || [];
    
    // 将书架数据存储在window对象中，以便bookshelf.js能够访问
    window.currentBookshelfData = books;
    
    displayBookshelf(bookshelfData);
    
    // 返回书架数据，以便其他函数能够使用
    return books;
  } catch (error) {
    console.error('加载书架失败:', error);
    showToast('加载书架失败，请稍后再试', 'error');
    return null;
  } finally {
    hideLoadingState();
  }
}

// 显示用户书架
function displayBookshelf(bookshelfData) {
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (!bookshelfContent) return;
  
  console.log('显示书架数据:', JSON.stringify(bookshelfData, null, 2));
  
  // 确保我们正确处理bookshelf数据
  const books = bookshelfData.bookshelf || bookshelfData || [];
  
  // 检查书架数据
  if (!Array.isArray(books) || books.length === 0) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        您的书架还没有书籍
      </div>
    `;
    return;
  }
  
  console.log('处理后的书架书籍:', books);
  
  // 更新书架内容
  bookshelfContent.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      ${books.map(book => {
        // 获取书籍信息，考虑可能的数据结构
        const bookInfo = book.Book || book;
        return generateBookshelfCard(bookInfo);
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
  console.log('更新书架统计数据:', books);
  
  // 确保books是数组
  if (!books || !Array.isArray(books)) {
    console.error('无效的书架数据:', books);
    return;
  }
  
  // 计算统计数据
  const totalBooks = books.length;
  
  let finishedBooks = 0;
  let readingBooks = 0;
  
  books.forEach(book => {
    // 处理不同的数据结构
    const bookInfo = book.Book || book;
    const progress = book.progress || bookInfo.progress || bookInfo.readingProgress || 0;
    const status = book.status || bookInfo.status || '';
    
    if (progress === 100 || status === 'completed' || status === 'finished') {
      finishedBooks++;
    } else if (progress > 0 || status === 'reading') {
      readingBooks++;
    }
  });
  
  console.log(`统计结果: 总计 ${totalBooks} 本, 已完成 ${finishedBooks} 本, 阅读中 ${readingBooks} 本`);
  
  // 更新DOM元素
  const totalElement = document.getElementById('total-books');
  const finishedElement = document.getElementById('finished-books');
  const readingElement = document.getElementById('reading-books');
  
  if (totalElement) totalElement.textContent = totalBooks;
  if (finishedElement) finishedElement.textContent = finishedBooks;
  if (readingElement) readingElement.textContent = readingBooks;
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
  
  // 添加事件监听器
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  confirmBtn.addEventListener('click', () => {
    // 保存当前URL，登录后可以返回
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('auth_redirect', currentPath);
    
    // 跳转到登录页面
    window.location.href = '/src/pages/login.html';
  });
  
  // 点击背景关闭模态框
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
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

