// 导入样式
import '../css/styles.css';

console.log('main.js 文件已加载');

// 导入API服务
import { userApi, bookApi, bookshelfApi, communityApi } from './api.js';
import { initAuthListeners, isLoggedIn, requireAuth } from './auth.js';
import { showToast } from './utils.js';
// 导入书籍卡片组件
import BookCard from './components/BookCard.js';

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
  const searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = searchForm.querySelector('input').value.trim();
      if (query) {
        // 显示加载状态
        showLoadingState();
        
        try {
          // 调用API搜索书籍
          const results = await bookApi.searchBooks(query);
          displaySearchResults(results);
        } catch (error) {
          showErrorMessage('搜索失败，请稍后再试');
        } finally {
          hideLoadingState();
        }
      }
    });
  }
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
        <p class="text-gray-600 text-sm mb-2">${book.author}</p>
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
  if (!query) {
    // 如果搜索词为空，显示所有书籍
    loadUserBookshelf();
    return;
  }
  
  try {
    // 显示加载状态
    showLoadingState();
    
    // 获取用户书架
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
    showToast('搜索失败，请稍后再试', 'error');
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
  const bookDetailContainer = document.querySelector('.book-detail-container');
  if (!bookDetailContainer) return;
  
  // 获取URL参数中的书籍ID
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
function showLoadingState() {
  // 创建加载指示器
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
  
  // 添加到页面
  document.body.appendChild(loadingIndicator);
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