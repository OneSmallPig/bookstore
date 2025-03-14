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

// 首页功能初始化
function initHomePage() {
  // 获取首页书籍卡片
  const bookCards = document.querySelectorAll('.card');
  
  // 为每个书籍卡片添加点击事件
  bookCards.forEach(card => {
    card.addEventListener('click', () => {
      const bookTitle = card.querySelector('h3')?.textContent || '未知书籍';
      window.location.href = `src/pages/book-detail.html?title=${encodeURIComponent(bookTitle)}`;
    });
  });
  
  // 智能搜索表单
  const searchInput = document.querySelector('.input');
  const searchButton = document.querySelector('.btn-primary');
  
  if (searchInput && searchButton) {
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `src/pages/search.html?q=${encodeURIComponent(query)}`;
      }
    });
    
    // 回车键提交
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = `src/pages/search.html?q=${encodeURIComponent(query)}`;
        }
      }
    });
  }
  
  // 确保"查看我的书架"按钮正常工作
  const viewBookshelfBtn = document.querySelector('a[href="src/pages/bookshelf.html"]');
  if (viewBookshelfBtn) {
    viewBookshelfBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'src/pages/bookshelf.html';
    });
  }
  
  // 确保"智能搜索"按钮正常工作
  const smartSearchBtn = document.querySelector('a[href="src/pages/search.html"]');
  if (smartSearchBtn) {
    smartSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'src/pages/search.html';
    });
  }
  
  // 加载推荐书籍
  loadRecommendedBooks();
}

// 加载推荐书籍
async function loadRecommendedBooks() {
  try {
    // 显示加载状态
    showLoadingState();
    
    // 获取推荐书籍 - 使用getBooks方法并传入适当的参数
    const recommendedResponse = await bookApi.getBooks({ limit: 4, sort: 'recommended' });
    const recommendedBooks = recommendedResponse.books || [];
    
    // 获取热门书籍 - 使用getBooks方法并传入适当的参数
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
        userBookshelf = await bookshelfApi.getBookshelf();
        console.log('获取到的书架数据类型:', typeof userBookshelf);
        console.log('获取到的书架数据:', JSON.stringify(userBookshelf, null, 2));
        
        // 确保我们正确处理bookshelf数据
        const bookshelfItems = userBookshelf.bookshelf || userBookshelf || [];
        console.log('处理后的书架数据:', bookshelfItems);
        
        // 创建一个书籍ID集合，用于快速检查书籍是否在书架中
        // 考虑所有可能的ID属性
        bookshelfItems.forEach(item => {
          console.log('处理书架项目:', item);
          
          // 直接的ID属性
          if (item.bookId) {
            bookshelfBookIds.add(Number(item.bookId));
            console.log(`添加bookId: ${item.bookId}`);
          }
          if (item.book_id) {
            bookshelfBookIds.add(Number(item.book_id));
            console.log(`添加book_id: ${item.book_id}`);
          }
          
          // 关联的Book对象
          if (item.Book) {
            if (item.Book.id) {
              bookshelfBookIds.add(Number(item.Book.id));
              console.log(`添加Book.id: ${item.Book.id}`);
            }
          }
        });
        
        console.log('书架中的书籍ID:', Array.from(bookshelfBookIds));
        console.log('推荐书籍ID:', recommendedBooks.map(book => book.id));
        console.log('热门书籍ID:', popularBooks.map(book => book.id));
      } catch (error) {
        console.error('获取用户书架失败:', error);
      }
    }
    
    // 获取推荐书籍容器
    const recommendedSection = document.querySelector('.recommended-section');
    const popularSection = document.querySelector('.popular-section');
    
    // 更新推荐书籍DOM - 使用新的BookCard组件
    if (recommendedSection) {
      const recommendedContainer = recommendedSection.querySelector('.grid');
      if (recommendedContainer && recommendedBooks.length > 0) {
        // 检查每本书是否在书架中
        recommendedBooks.forEach(book => {
          const isInShelf = bookshelfBookIds.has(Number(book.id));
          console.log(`书籍 ${book.title} (ID: ${book.id}) 是否在书架中: ${isInShelf}`);
        });
        
        recommendedContainer.innerHTML = '';
        
        // 使用BookCard组件创建书籍卡片
        recommendedBooks.forEach(book => {
          const isInBookshelf = bookshelfBookIds.has(Number(book.id));
          const bookCardHtml = BookCard.createBookCard(book, '推荐', isInBookshelf);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = bookCardHtml;
          recommendedContainer.appendChild(tempDiv.firstElementChild);
        });
        
        // 添加事件监听器
        BookCard.addBookCardListeners(recommendedContainer);
      } else if (recommendedContainer) {
        recommendedContainer.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500">暂无推荐书籍</div>';
      }
    }
    
    // 更新热门书籍DOM - 使用新的BookCard组件
    if (popularSection) {
      const popularContainer = popularSection.querySelector('.grid');
      if (popularContainer && popularBooks.length > 0) {
        // 检查每本书是否在书架中
        popularBooks.forEach(book => {
          const isInShelf = bookshelfBookIds.has(Number(book.id));
          console.log(`书籍 ${book.title} (ID: ${book.id}) 是否在书架中: ${isInShelf}`);
        });
        
        popularContainer.innerHTML = '';
        
        // 使用BookCard组件创建书籍卡片
        popularBooks.forEach(book => {
          const isInBookshelf = bookshelfBookIds.has(Number(book.id));
          const bookCardHtml = BookCard.createBookCard(book, '热门', isInBookshelf);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = bookCardHtml;
          popularContainer.appendChild(tempDiv.firstElementChild);
        });
        
        // 添加事件监听器
        BookCard.addBookCardListeners(popularContainer);
      } else if (popularContainer) {
        popularContainer.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500">暂无热门书籍</div>';
      }
    }
  } catch (error) {
    console.error('加载推荐书籍失败:', error);
    
    // 显示错误信息
    const recommendedSection = document.querySelector('.recommended-section');
    if (recommendedSection) {
      const recommendedContainer = recommendedSection.querySelector('.grid');
      if (recommendedContainer) {
        recommendedContainer.innerHTML = '<div class="col-span-full text-center py-8 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i> 加载推荐书籍失败</div>';
      }
    }
    
    const popularSection = document.querySelector('.popular-section');
    if (popularSection) {
      const popularContainer = popularSection.querySelector('.grid');
      if (popularContainer) {
        popularContainer.innerHTML = '<div class="col-span-full text-center py-8 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i> 加载热门书籍失败</div>';
      }
    }
  } finally {
    // 隐藏加载状态
    hideLoadingState();
  }
}

// 初始化书架页面
function initBookshelfPage() {
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (!bookshelfContainer) return;
  
  // 加载用户书架
  loadUserBookshelf();
  
  // 初始化书架搜索功能
  initBookshelfSearch();
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
        ${searchQuery ? `没有找到匹配 "${searchQuery}" 的书籍` : '您的书架还没有书籍'}
      </div>
    `;
    return;
  }
  
  // 更新书架内容
  bookshelfContent.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      ${books.map(book => generateBookshelfCard(book)).join('')}
    </div>
  `;
  
  // 添加事件监听器
  addBookshelfCardListeners();
}

// 生成书架卡片HTML
function generateBookshelfCard(book) {
  console.log('生成书架卡片:', book);
  
  // 确保我们有正确的书籍ID
  const bookId = book.id || book.bookId || book.book_id || '';
  
  // 处理阅读进度
  const progress = book.readingProgress || 0;
  const statusClass = progress === 100 ? 'bg-green-100 text-green-800' : 
                      progress > 0 ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800';
  const statusText = progress === 100 ? '已读完' : 
                     progress > 0 ? '阅读中' : 
                     '未读';
  const actionText = progress === 100 ? '重新阅读' : 
                     progress > 0 ? '继续阅读' : 
                     '开始阅读';
  
  // 处理封面图片
  const coverImage = book.coverImage || book.cover_image || '';
  
  return `
    <div class="book-card bg-white p-4 relative" data-book-id="${bookId}">
      <div class="absolute top-4 right-4 flex space-x-2">
        <button class="text-gray-400 hover:text-gray-600 book-options-btn">
          <i class="fas fa-ellipsis-h"></i>
        </button>
      </div>
      
      <div class="flex flex-col items-center mb-4">
        <img src="${coverImage || 'https://via.placeholder.com/150x225/3b82f6/ffffff?text=' + encodeURIComponent(book.title)}" 
             alt="${book.title}" class="book-cover w-32 h-48 mb-3">
        <div class="text-center">
          <h3 class="font-bold">${book.title}</h3>
          <p class="text-gray-600 text-sm">${book.author}</p>
        </div>
      </div>
      
      <div class="mt-2">
        <div class="flex justify-between text-sm text-gray-500 mb-1">
          <span>阅读进度</span>
          <span>${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      
      <div class="mt-4 flex justify-between">
        <span class="inline-block ${statusClass} text-xs px-2 py-1 rounded-full">${statusText}</span>
        <button class="btn-primary text-sm py-1 px-3 read-book-btn" data-book-id="${bookId}">${actionText}</button>
      </div>
    </div>
  `;
}

// 添加书架卡片事件监听器
function addBookshelfCardListeners() {
  // 阅读按钮点击事件
  document.querySelectorAll('.read-book-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookId = button.getAttribute('data-book-id');
      if (bookId) {
        window.location.href = `book-detail.html?id=${bookId}`;
      }
    });
  });
  
  // 书籍卡片点击事件
  document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
      const bookId = card.getAttribute('data-book-id');
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
  const totalBooksElement = document.querySelector('.bookshelf-container .font-bold.text-xl:nth-child(1)');
  const finishedBooksElement = document.querySelector('.bookshelf-container .font-bold.text-xl:nth-child(2)');
  const readingBooksElement = document.querySelector('.bookshelf-container .font-bold.text-xl:nth-child(3)');
  
  if (totalBooksElement) {
    totalBooksElement.textContent = books.length;
  }
  
  if (finishedBooksElement) {
    const finishedCount = books.filter(book => {
      // 获取书籍信息，考虑可能的数据结构
      const bookInfo = book.Book || book;
      return bookInfo.readingStatus === '已完成' || bookInfo.readingProgress === 100;
    }).length;
    finishedBooksElement.textContent = finishedCount;
  }
  
  if (readingBooksElement) {
    const readingCount = books.filter(book => {
      // 获取书籍信息，考虑可能的数据结构
      const bookInfo = book.Book || book;
      return bookInfo.readingStatus === '阅读中' || 
             (bookInfo.readingProgress > 0 && bookInfo.readingProgress < 100);
    }).length;
    readingBooksElement.textContent = readingCount;
  }
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

// 导出函数
export {
  loadUserBookshelf,
  displayBookshelf,
  generateBookshelfCard,
  updateBookshelfStats,
  addBookshelfCardListeners
}; 