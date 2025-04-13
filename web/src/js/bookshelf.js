/**
 * bookshelf.js
 * 书架页面专用脚本，处理书架页面的筛选、排序和添加书籍功能
 */

import { bookApi, bookshelfApi } from './api.js';
import { showToast } from './utils.js';
import { isLoggedIn } from './auth.js';
import { 
  loadUserBookshelf, 
  updateBookshelfStats
} from './main.js';

// 立即执行的代码，确保关键函数在模块加载后立即导出到window对象
(function() {
  console.log('bookshelf.js 模块加载中，准备导出关键函数到window对象');
  
  // 防止重复请求的安全检查
  ensureNoDuplicateRequests();
})();

/**
 * 确保不会发生重复的图片请求
 * 主要是防止homepage.js中的checkAndFixCoverImages和bookshelf.js中的处理冲突
 */
function ensureNoDuplicateRequests() {
  // 标记此页面为书架页面，避免homepage.js中的函数执行
  window._isBookshelfPage = true;
  
  // 如果checkAndFixCoverImages正在执行，尝试终止它
  if (window._isCheckingCoverImages) {
    console.log('检测到正在进行图片处理，终止它以避免重复请求');
    window._isCheckingCoverImages = false;
  }
  
  // 覆盖homepage.js中可能导致循环请求的函数
  if (window.checkAndFixCoverImages) {
    const originalFunction = window.checkAndFixCoverImages;
    window.checkAndFixCoverImages = function() {
      // 在书架页面不执行此函数
      if (window._isBookshelfPage) {
        console.log('在书架页面，跳过checkAndFixCoverImages执行');
        return;
      }
      // 在其他页面保持原来的行为
      return originalFunction.apply(this, arguments);
    };
    console.log('已覆盖checkAndFixCoverImages函数以避免在书架页面重复执行');
  }
}

// 模拟数据，用于在API不可用时进行测试
const mockBooks = [
  {
    id: '1',
    title: '三体',
    author: '刘慈欣',
    description: '地球文明向宇宙发出的一声啼鸣，以及以此为开端，地球文明与三体文明间的恩怨情仇。',
    coverUrl: 'https://img9.doubanio.com/view/subject/s/public/s2768378.jpg',
    status: 'reading',
    progress: 45
  },
  {
    id: '2',
    title: '活着',
    author: '余华',
    description: '《活着》是余华的代表作，讲述了一个人历尽世间沧桑和磨难的一生。',
    coverUrl: 'https://img9.doubanio.com/view/subject/s/public/s29053580.jpg',
    status: 'completed',
    progress: 100
  },
  {
    id: '3',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事。',
    coverUrl: 'https://img9.doubanio.com/view/subject/s/public/s6384944.jpg',
    status: 'toRead',
    progress: 0
  },
  {
    id: '4',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    description: '从认知革命、农业革命、科学革命到人工智能，重新审视现代社会的问题。',
    coverUrl: 'https://img9.doubanio.com/view/subject/s/public/s27814883.jpg',
    status: 'reading',
    progress: 30
  }
];

// 当前书架数据
let currentBookshelfData = [];
// 当前过滤器
let currentFilter = 'all';
// 当前排序方式
let currentSort = 'date-desc';

// 当页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('bookshelf.js: DOMContentLoaded 事件触发');
  
  // 首先将关键函数添加到window对象，确保它们在整个页面中可用
  window.performBookshelfSearch = performBookshelfSearch;
  window.applyFilter = applyFilter;
  window.applySorting = applySorting;
  window.showAddBookDialog = showAddBookDialog;
  window.generateBookshelfCard = generateBookshelfCard;
  window.attachBookCardEventListeners = attachBookCardEventListeners;
  window.checkEmptyState = checkEmptyState;
  window.currentBookshelfData = currentBookshelfData;
  window.initSearchFunction = initSearchFunction;
  window.updateBookshelfDisplay = updateBookshelfDisplay;
  window.loadUserBookshelfData = loadUserBookshelfData;
  window.applyFiltersAndSort = applyFiltersAndSort;
  window.updateCategoryContent = updateCategoryContent;
  
  console.log('bookshelf.js: 已将关键函数添加到window对象');
  console.log('updateBookshelfDisplay是否已添加到window:', typeof window.updateBookshelfDisplay === 'function');
  console.log('loadUserBookshelfData是否已添加到window:', typeof window.loadUserBookshelfData === 'function');

  // 检查是否在书架页面
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (!bookshelfContainer) return;
  
  // 初始化页面功能
  // 初始化过滤下拉菜单
  initFilterDropdown();
  
  // 初始化排序下拉菜单
  initSortDropdown();
  
  // 初始化添加书籍按钮
  initAddBookButton();
  
  // 初始化分类标签
  initCategoryTabs();
  
  // 初始化搜索功能
  initSearchFunction();
  
  // 创建图片目录(如果不存在)
  ensureImageDirectory();
  
  // 显示默认标签内容
  const activeTab = document.querySelector('.category-tab.active');
  if (activeTab) {
    console.log('找到活跃的标签:', activeTab.getAttribute('data-category'));
    // 触发一次点击，确保内容正确显示
    activeTab.click();
  } else {
    console.log('未找到活跃的标签，默认点击全部标签');
    // 默认选中"全部"标签
    const allTab = document.querySelector('.category-tab[data-category="all"]');
    if (allTab) {
      console.log('默认点击全部标签');
      allTab.click();
    } else {
      console.log('未找到全部标签，直接加载全部书籍');
      loadUserBookshelfData();
    }
  }
});

// 初始化筛选下拉菜单
function initFilterDropdown() {
  const filterBtn = document.getElementById('filter-btn');
  const filterMenu = document.getElementById('filter-menu');
  const applyFilterBtn = document.getElementById('apply-filter');
  
  if (!filterBtn || !filterMenu) {
    return;
  }
  
  // 确保下拉菜单初始状态为关闭
  filterMenu.classList.remove('show');
  
  // 移除可能存在的旧事件监听器
  const newFilterBtn = filterBtn.cloneNode(true);
  filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);
  
  // 点击筛选按钮显示/隐藏下拉菜单
  newFilterBtn.onclick = function(e) {
    e.stopPropagation(); // 阻止事件冒泡
    filterMenu.classList.toggle('show');
    
    // 关闭排序菜单
    const sortMenu = document.getElementById('sort-menu');
    if (sortMenu) sortMenu.classList.remove('show');
  };
  
  // 点击应用筛选按钮
  if (applyFilterBtn) {
    const newApplyFilterBtn = applyFilterBtn.cloneNode(true);
    applyFilterBtn.parentNode.replaceChild(newApplyFilterBtn, applyFilterBtn);
    
    newApplyFilterBtn.onclick = function() {
      // 获取选中的筛选条件
      const checkedFilters = document.querySelectorAll('input[name="filter-status"]:checked');
      const statusFilters = Array.from(checkedFilters).map(input => input.value);
      
      // 更新当前筛选条件
      currentFilter = statusFilters.length > 0 ? statusFilters[0] : 'all';
      
      // 应用筛选
      applyFiltersAndSort();
      
      // 隐藏下拉菜单
      filterMenu.classList.remove('show');
    };
  }
  
  // 点击页面其他地方关闭下拉菜单
  document.onclick = function(e) {
    if (newFilterBtn && !newFilterBtn.contains(e.target) && filterMenu && !filterMenu.contains(e.target)) {
      filterMenu.classList.remove('show');
    }
  };
}

// 初始化排序下拉菜单
function initSortDropdown() {
  const sortBtn = document.getElementById('sort-btn');
  const sortMenu = document.getElementById('sort-menu');
  const sortOptions = document.querySelectorAll('.sort-option');
  
  if (!sortBtn || !sortMenu) {
    return;
  }
  
  // 确保下拉菜单初始状态为关闭
  sortMenu.classList.remove('show');
  
  // 移除可能存在的旧事件监听器
  const newSortBtn = sortBtn.cloneNode(true);
  sortBtn.parentNode.replaceChild(newSortBtn, sortBtn);
  
  // 点击排序按钮显示/隐藏下拉菜单
  newSortBtn.onclick = function(e) {
    e.stopPropagation(); // 阻止事件冒泡
    sortMenu.classList.toggle('show');
    
    // 关闭筛选菜单
    const filterMenu = document.getElementById('filter-menu');
    if (filterMenu) filterMenu.classList.remove('show');
  };
  
  // 点击排序选项
  sortOptions.forEach(option => {
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);
    
    newOption.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation(); // 阻止事件冒泡
      
      // 获取排序方式
      const sortValue = newOption.getAttribute('data-sort');
      if (sortValue) {
        // 更新当前排序方式
        currentSort = sortValue;
        
        // 应用排序
        applyFiltersAndSort();
        
        // 隐藏下拉菜单
        sortMenu.classList.remove('show');
      }
    };
  });
}

// 初始化添加书籍按钮
function initAddBookButton() {
  const addBookBtn = document.getElementById('add-book-btn');
  
  if (!addBookBtn) return;
  
  addBookBtn.addEventListener('click', () => {
    // 跳转到智能搜索页面，使用正确的路径
    window.location.href = 'search.html';
  });
  
  // 同样修改空书架状态下的添加书籍按钮
  const emptyStateAddBtn = document.getElementById('add-book-btn-empty');
  if (emptyStateAddBtn) {
    emptyStateAddBtn.addEventListener('click', () => {
      // 跳转到智能搜索页面，使用正确的路径
      window.location.href = 'search.html';
    });
  }
  
  // 修改空状态下的添加第一本书按钮
  const addFirstBookBtn = document.getElementById('add-first-book-btn');
  if (addFirstBookBtn) {
    addFirstBookBtn.addEventListener('click', () => {
      // 跳转到智能搜索页面，使用正确的路径
      window.location.href = 'search.html';
    });
  }
}

// 显示添加书籍对话框
function showAddBookDialog() {
  // 检查用户是否登录
  if (!isLoggedIn()) {
    showToast('请先登录', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return;
  }
  
  // 创建对话框
  const dialog = document.createElement('div');
  dialog.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
  dialog.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">添加书籍到书架</h3>
        <button class="text-gray-500 hover:text-gray-700 close-dialog">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="mb-4">
        <div class="relative">
          <input type="text" id="book-search" class="w-full border rounded-lg px-4 py-2 pr-10" placeholder="搜索书籍...">
          <button id="search-book-btn" class="absolute right-2 top-2 text-gray-500 hover:text-gray-700">
            <i class="fas fa-search"></i>
          </button>
        </div>
      </div>
      
      <div id="search-results" class="max-h-80 overflow-y-auto mb-4">
        <div class="text-center py-4 text-gray-500">
          搜索书籍以添加到您的书架
        </div>
      </div>
      
      <div class="flex justify-end">
        <button class="btn-secondary mr-2 close-dialog">取消</button>
      </div>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(dialog);
  
  // 关闭对话框函数
  function closeDialog() {
    dialog.remove();
  }
  
  // 绑定关闭按钮事件
  dialog.querySelectorAll('.close-dialog').forEach(button => {
    button.addEventListener('click', closeDialog);
  });
  
  // 搜索书籍
  const searchInput = dialog.querySelector('#book-search');
  const searchButton = dialog.querySelector('#search-book-btn');
  const searchResults = dialog.querySelector('#search-results');
  
  // 搜索函数
  async function searchBooks() {
    const query = searchInput.value.trim();
    if (!query) {
      searchResults.innerHTML = `
        <div class="text-center py-4 text-gray-500">
          请输入搜索关键词
        </div>
      `;
      return;
    }
    
    try {
      // 显示加载状态
      searchResults.innerHTML = `
        <div class="text-center py-4">
          <i class="fas fa-spinner fa-spin mr-2"></i> 搜索中...
        </div>
      `;
      
      // 调用API搜索书籍
      const books = await bookApi.searchBooks(query);
      
      if (!books || books.length === 0) {
        searchResults.innerHTML = `
          <div class="text-center py-4 text-gray-500">
            未找到匹配的书籍
          </div>
        `;
        return;
      }
      
      // 显示搜索结果
      searchResults.innerHTML = books.map(book => `
        <div class="book-search-item flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer" data-book-id="${book.id}">
          <img src="${book.cover_image || 'https://via.placeholder.com/60x90/3b82f6/ffffff?text=' + encodeURIComponent(book.title)}" 
               alt="${book.title}" class="w-12 h-18 mr-4">
          <div>
            <h4 class="font-bold">${book.title}</h4>
            <p class="text-sm text-gray-600">${book.author}</p>
          </div>
          <button class="ml-auto btn-primary text-sm py-1 px-3 add-to-shelf-btn" data-book-id="${book.id}">
            添加到书架
          </button>
        </div>
      `).join('');
      
      // 绑定添加到书架按钮事件
      dialog.querySelectorAll('.add-to-shelf-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
          e.stopPropagation();
          
          const bookId = button.getAttribute('data-book-id');
          if (!bookId) return;
          
          try {
            // 显示加载状态
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            // 调用API添加到书架
            await bookshelfApi.addToBookshelf(bookId);
            
            // 显示成功消息
            showToast('已成功添加到书架', 'success');
            
            // 更新按钮状态
            button.innerHTML = '<i class="fas fa-check"></i> 已添加';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            button.disabled = true;
            
            // 重新加载书架数据
            const newBookshelfData = await loadUserBookshelfData();
            if (newBookshelfData) {
              currentBookshelfData = newBookshelfData;
              // 应用当前的过滤和排序
              applyFiltersAndSort();
            }
          } catch (error) {
            showToast('添加失败，请稍后再试', 'error');
            
            // 恢复按钮状态
            button.innerHTML = '添加到书架';
            button.disabled = false;
          }
        });
      });
      
    } catch (error) {
      searchResults.innerHTML = `
        <div class="text-center py-4 text-red-500">
          搜索失败，请稍后再试
        </div>
      `;
    }
  }
  
  // 绑定搜索按钮事件
  searchButton.addEventListener('click', searchBooks);
  
  // 绑定回车键搜索
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBooks();
    }
  });
  
  // 自动聚焦搜索框
  searchInput.focus();
}

// 初始化分类标签
function initCategoryTabs() {
  const categoryTabs = document.querySelectorAll('.category-tab');
  
  if (!categoryTabs.length) {
    console.log('未找到分类标签，跳过初始化');
    return;
  }
  
  console.log('初始化分类标签，发现', categoryTabs.length, '个标签');
  
  // 为每个标签添加点击事件
  categoryTabs.forEach(tab => {
    // 移除可能存在的旧事件监听器
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
    
    // 添加新的事件监听器
    newTab.addEventListener('click', (e) => {
      e.preventDefault();
      
      console.log('分类标签被点击');
      
      // 获取分类
      const category = newTab.getAttribute('data-category');
      console.log('选中分类:', category);
      
      // 应用筛选
      applyFilter(category);
    });
  });
}

// 确保图片目录存在
function ensureImageDirectory() {
  // 如果默认封面图片不存在，尝试创建一个空div作为占位符
  const imgPlaceholder = document.createElement('div');
  imgPlaceholder.style.display = 'none';
  imgPlaceholder.innerHTML = `
    <style>
      .default-cover-placeholder {
        width: 200px;
        height: 300px;
        background-color: #e5e7eb;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
    </style>
    <div class="default-cover-placeholder">
      无封面图片
    </div>
  `;
  document.body.appendChild(imgPlaceholder);
}

// 初始化搜索功能
function initSearchFunction() {
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  
  if (!searchInput || !searchButton) {
    return;
  }
  
  // 搜索函数
  function searchBooks() {
    const query = searchInput.value.trim();
    
    if (query) {
      performBookshelfSearch(query);
    } else {
      applyFiltersAndSort();
    }
  }
  
  // 搜索按钮点击事件
  searchButton.addEventListener('click', (e) => {
    e.preventDefault();
    searchBooks();
  });
  
  // 输入框回车事件
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchBooks();
    }
  });
  
  // 将搜索函数添加到window对象，以便可以从HTML中调用
  window.performSearch = searchBooks;
}

// 应用筛选和排序
function applyFiltersAndSort() {
  // 首先打印当前状态
  console.log('应用筛选和排序:', {
    filter: currentFilter,
    sort: currentSort,
    booksAvailable: Array.isArray(currentBookshelfData) ? currentBookshelfData.length : 'not array',
    booksData: currentBookshelfData
  });
  
  // 检查currentBookshelfData是否是一个对象且有bookshelf属性
  let booksToFilter = currentBookshelfData;
  if (!Array.isArray(booksToFilter) && typeof booksToFilter === 'object' && booksToFilter.bookshelf && Array.isArray(booksToFilter.bookshelf)) {
    console.log('从currentBookshelfData.bookshelf提取数据');
    booksToFilter = booksToFilter.bookshelf;
  }
  
  // 确保booksToFilter是一个数组
  if (!Array.isArray(booksToFilter)) {
    console.warn('无有效的书籍数据进行筛选:', booksToFilter);
    booksToFilter = [];
  }
  
  // 深拷贝数据，避免影响原数据
  let filteredBooks = JSON.parse(JSON.stringify(booksToFilter || []));
  console.log(`应用筛选前有${filteredBooks.length}本书籍`);
  
  // 应用筛选 - 根据当前选择的类别
  if (currentFilter && currentFilter !== 'all') {
    console.log(`应用筛选: ${currentFilter}`);
    filteredBooks = filteredBooks.filter(book => {
      // 确定书籍对象结构和阅读状态
      const bookObj = book.book || book.Book || book;
      const status = book.readingStatus || bookObj.readingStatus || book.reading_status || bookObj.reading_status || 'toRead';
      
      if (currentFilter === 'reading' || currentFilter === '阅读中') {
        return status === 'reading' || status === '阅读中';
      } else if (currentFilter === 'completed' || currentFilter === '已完成') {
        return status === 'completed' || status === 'finished' || status === '已完成' || status === '已读完';
      } else if (currentFilter === 'toRead' || currentFilter === '未开始') {
        return !status || status === 'toRead' || status === '未开始';
      }
      
      return true;
    });
    console.log(`筛选后剩余${filteredBooks.length}本书籍`);
  }
  
  // 应用排序
  if (currentSort) {
    console.log(`应用排序: ${currentSort}`);
    const [sortField, sortOrder] = currentSort.split('-');
    
    filteredBooks.sort((a, b) => {
      // 确定书籍对象结构
      const bookA = a.book || a.Book || a;
      const bookB = b.book || b.Book || b;
      
      if (sortField === 'title') {
        const titleA = (bookA.title || '').toLowerCase();
        const titleB = (bookB.title || '').toLowerCase();
        return sortOrder === 'desc' ? titleB.localeCompare(titleA) : titleA.localeCompare(titleB);
      } else if (sortField === 'author') {
        const authorA = (bookA.author || '').toLowerCase();
        const authorB = (bookB.author || '').toLowerCase();
        return sortOrder === 'desc' ? authorB.localeCompare(authorA) : authorA.localeCompare(authorB);
      } else if (sortField === 'progress') {
        const progressA = a.currentPage || a.current_page || bookA.currentPage || bookA.current_page || 0;
        const progressB = b.currentPage || b.current_page || bookB.currentPage || bookB.current_page || 0;
        return sortOrder === 'desc' ? progressB - progressA : progressA - progressB;
      } else if (sortField === 'date') {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      
      // 默认排序
      return 0;
    });
    console.log('排序完成');
  }
  
  // 更新书架显示
  console.log(`最终显示${filteredBooks.length}本书籍`);
  
  // 根据当前活跃的标签决定是更新特定标签内容还是所有内容
  if (currentFilter === 'all') {
    // 全部标签 - 所有书籍
    updateBookshelfDisplay(filteredBooks);
  } else {
    // 特定标签 - 根据标签筛选
    const activeContainer = document.querySelector(`.category-content[data-category="${currentFilter}"]`);
    const activeGrid = activeContainer ? activeContainer.querySelector('.grid') : null;
    
    if (activeGrid) {
      // 清空当前标签的网格
      activeGrid.innerHTML = '';
      
      if (filteredBooks.length === 0) {
        // 显示空状态
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'col-span-full text-center py-8 text-gray-500';
        emptyMessage.innerHTML = `
          <i class="fas fa-book-open fa-3x mb-3"></i>
          <p class="text-xl font-medium">此分类暂无书籍</p>
        `;
        activeGrid.appendChild(emptyMessage);
      } else {
        // 使用displayBooks函数添加书籍卡片
        displayBooks(activeGrid, filteredBooks);
      }
    } else {
      console.error(`未找到活跃标签${currentFilter}的网格容器`);
    }
  }
}

// 执行书架搜索
async function performBookshelfSearch(query) {
  if (!query) {
    // 如果搜索内容为空，重新加载书架数据并刷新页面
    try {
      const bookshelfData = await loadUserBookshelfData();
      if (bookshelfData) {
        currentBookshelfData = bookshelfData;
        updateBookshelfDisplay(currentBookshelfData);
        updateBookshelfStats(currentBookshelfData);
      }
    } catch (error) {
      console.error('重新加载书架数据失败:', error);
      showToast('刷新书架失败，请稍后再试', 'error');
    }
    return;
  }
  
  // 显示加载状态
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (bookshelfContent) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-spinner fa-spin mr-2"></i> 搜索中...
      </div>
    `;
  } else {
    alert('未找到书架内容容器，请刷新页面重试');
    return;
  }
  
  try {
    // 获取当前书架数据
    let books = [];
    
    // 首先尝试使用本地数据进行搜索
    if (window.currentBookshelfData && Array.isArray(window.currentBookshelfData)) {
      books = window.currentBookshelfData.filter(book => {
        const bookInfo = book.Book || book;
        const title = (bookInfo.title || '').toLowerCase();
        const author = (bookInfo.author || '').toLowerCase();
        const description = (bookInfo.description || '').toLowerCase();
        
        const searchQuery = query.toLowerCase();
        return title.includes(searchQuery) || 
               author.includes(searchQuery) || 
               description.includes(searchQuery);
      });
    } else {
      // 尝试从API获取数据
      try {
        // 调用API搜索书架
        const searchResult = await bookshelfApi.getBookshelfBooks({ query });
        
        // 处理搜索结果
        if (searchResult && searchResult.data && searchResult.data.bookshelf) {
          books = searchResult.data.bookshelf;
        } else if (searchResult && searchResult.bookshelf) {
          books = searchResult.bookshelf;
        } else if (Array.isArray(searchResult)) {
          books = searchResult;
        } else {
          console.warn('API返回的数据格式不符合预期:', searchResult);
        }
      } catch (apiError) {
        console.error('API搜索失败:', apiError);
        alert('搜索API调用失败，请检查网络连接或联系管理员');
      }
    }
    
    // 检查books是否为有效数组
    if (!Array.isArray(books)) {
      console.error('搜索结果不是有效数组:', books);
      books = [];
    }
    
    // 清除加载状态
    if (bookshelfContent) {
      bookshelfContent.innerHTML = '';
    }
    
    // 更新书架显示
    updateBookshelfDisplay(books, query);
  } catch (error) {
    // 显示错误信息
    if (bookshelfContent) {
      bookshelfContent.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-circle mr-2"></i> 搜索失败，请稍后再试
        </div>
      `;
    }
    
    // 显示错误提示
    showToast('搜索失败，请稍后再试', 'error');
  }
}

// 应用筛选
function applyFilter(filter) {
  console.log('应用筛选:', filter);
  
  // 更新当前筛选条件
  currentFilter = filter;
  
  // 获取分类内容
  const allContainer = document.querySelector('.category-content[data-category="all"]');
  const readingContainer = document.querySelector('.category-content[data-category="reading"]');
  const completedContainer = document.querySelector('.category-content[data-category="completed"]');
  const toReadContainer = document.querySelector('.category-content[data-category="toRead"]');
  
  // 隐藏所有容器
  if (allContainer) allContainer.classList.add('hidden');
  if (readingContainer) readingContainer.classList.add('hidden');
  if (completedContainer) completedContainer.classList.add('hidden');
  if (toReadContainer) toReadContainer.classList.add('hidden');
  
  // 显示对应分类
  const activeContainer = document.querySelector(`.category-content[data-category="${filter}"]`);
  if (activeContainer) {
    activeContainer.classList.remove('hidden');
    
    // 检查容器中是否有书籍
    const booksGrid = activeContainer.querySelector('.grid');
    if (booksGrid && booksGrid.children.length === 0) {
      console.log(`${filter}分类的网格元素为空，加载该分类书籍`);
      
      // 根据选中的标签加载对应状态的书籍
      if (filter === 'all') {
        // 全部标签 - 加载所有书籍
        loadUserBookshelfData();
      } else {
        // 根据标签名映射到API所需的状态参数
        const statusMapping = {
          'reading': 'reading',
          'completed': 'completed',
          'toRead': 'toRead'
        };
        const apiStatus = statusMapping[filter] || filter;
        
        console.log(`加载${filter}状态的书籍，API参数: ${apiStatus}`);
        loadUserBookshelfData(apiStatus);
      }
    }
  }
  
  // 更新标签状态
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    const tabCategory = tab.getAttribute('data-category');
    if (tabCategory === filter) {
      tab.classList.add('active', 'border-blue-500', 'text-blue-500');
      tab.classList.remove('border-transparent', 'text-gray-500');
    } else {
      tab.classList.remove('active', 'border-blue-500', 'text-blue-500');
      tab.classList.add('border-transparent', 'text-gray-500');
    }
  });
}

// 应用排序函数（供HTML内联事件调用）
async function applySorting(sortValue) {
  // 更新当前排序方式
  currentSort = sortValue;
  
  // 应用筛选和排序
  applyFiltersAndSort();
  
  // 隐藏下拉菜单
  const sortMenu = document.getElementById('sort-menu');
  if (sortMenu) sortMenu.classList.remove('show');
}

// 加载用户书架数据
async function loadUserBookshelfData(status = null) {
  try {
    console.log('加载用户书架数据...', status ? `状态: ${status}` : '所有状态');
    
    // 检查用户是否登录
    const token = localStorage.getItem('bookstore_auth') ? 
      JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
    
    if (!token) {
      console.log('用户未登录，无法加载书架');
      showLoginPrompt();
      return null;
    }
    
    // 显示加载状态
    const activeContainer = status ? 
      document.querySelector(`.category-content[data-category="${status}"]`) : 
      document.querySelector('.category-content[data-category="all"]');
    
    if (activeContainer) {
      activeContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
      `;
    }
    
    // 调用API获取书架数据
    console.log('调用书架API获取数据', status ? `使用状态过滤: ${status}` : '');
    const response = await bookshelfApi.getBookshelf(status);
    console.log('书架API响应:', response);
    
    // 处理响应数据
    let bookshelfData;
    
    if (Array.isArray(response)) {
      console.log('API返回数组格式数据');
      bookshelfData = response;
    } else if (response && typeof response === 'object') {
      if (response.bookshelf && Array.isArray(response.bookshelf)) {
        console.log('从response.bookshelf中提取数据');
        bookshelfData = response.bookshelf;
      } else if (response.data && Array.isArray(response.data)) {
        console.log('从response.data中提取数据');
        bookshelfData = response.data;
      } else if (response.data && response.data.bookshelf && Array.isArray(response.data.bookshelf)) {
        console.log('从response.data.bookshelf中提取数据');
        bookshelfData = response.data.bookshelf;
      } else {
        // 尝试查找任何数组
        for (const key in response) {
          if (Array.isArray(response[key])) {
            console.log(`从response.${key}中提取数据`);
            bookshelfData = response[key];
            break;
          }
        }
      }
    }
    
    // 如果未找到有效数据
    if (!bookshelfData || !Array.isArray(bookshelfData)) {
      console.warn('未能找到有效的书架数据');
      bookshelfData = [];
    }
    
    console.log(`成功获取到${bookshelfData.length}本书籍数据`);
    
    // 更新全局数据
    if (!status) {
      // 只有获取全部书籍时才更新全局数据
      currentBookshelfData = bookshelfData;
      window.currentBookshelfData = bookshelfData;
    }
    
    // 根据当前活跃标签决定是更新哪个标签的内容
    if (status) {
      // 如果是特定状态，只更新对应标签
      updateCategoryContent(status, bookshelfData);
    } else {
      // 如果是获取全部，更新所有标签
      updateBookshelfDisplay(bookshelfData);
    }
    
    // 更新统计
    updateBookshelfStats(bookshelfData);
    
    return bookshelfData;
  } catch (error) {
    console.error('加载用户书架数据出错:', error);
    
    // 显示错误
    const activeContainer = status ? 
      document.querySelector(`.category-content[data-category="${status}"]`) : 
      document.querySelector('.category-content[data-category="all"]');
    
    if (activeContainer) {
      activeContainer.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
          <p class="text-xl">加载书架失败</p>
          <p class="text-gray-600 mt-2">请稍后再试或刷新页面</p>
          <button class="mt-4 bg-blue-500 text-white px-4 py-2 rounded" onclick="window.location.reload()">
            刷新页面
          </button>
        </div>
      `;
    }
    
    return null;
  }
}

// 更新特定分类的内容
function updateCategoryContent(category, books) {
  console.log(`更新${category}分类内容，有${books.length}本书`);
  
  const categoryContainer = document.querySelector(`.category-content[data-category="${category}"]`);
  if (!categoryContainer) {
    console.error(`未找到${category}分类的容器`);
    return;
  }
  
  // 清空内容并创建网格容器
  categoryContainer.innerHTML = '<div class="grid"></div>';
  const gridContainer = categoryContainer.querySelector('.grid');
  
  if (!gridContainer) {
    console.error(`创建${category}分类的网格容器失败`);
    return;
  }
  
  if (books.length === 0) {
    // 显示空状态
    gridContainer.innerHTML = `
      <div class="col-span-full text-center py-8 text-gray-500">
        <i class="fas fa-book-open fa-3x mb-3"></i>
        <p class="text-xl font-medium">此分类暂无书籍</p>
      </div>
    `;
    return;
  }
  
  // 渲染书籍
  displayBooks(gridContainer, books);
  
  // 添加事件监听器
  attachBookCardEventListeners();
}

// 更新书架显示
function updateBookshelfDisplay(books, searchQuery = '') {
  // 数据验证和调试日志
  console.log('updateBookshelfDisplay函数被调用:', {
    booksLength: books ? books.length : 0,
    searchQuery,
  });
  
  // 获取分类容器和内容容器
  const allContentContainer = document.querySelector('.category-content[data-category="all"]');
  const readingContentContainer = document.querySelector('.category-content[data-category="reading"]');
  const completedContentContainer = document.querySelector('.category-content[data-category="completed"]');
  const toReadContentContainer = document.querySelector('.category-content[data-category="toRead"]');
  
  // 确保容器元素存在
  if (!allContentContainer) {
    console.error('未找到"全部"分类容器');
    return;
  }
  
  // 获取grid容器
  const allContent = allContentContainer.querySelector('.grid');
  const readingContent = readingContentContainer?.querySelector('.grid');
  const completedContent = completedContentContainer?.querySelector('.grid');
  const toReadContent = toReadContentContainer?.querySelector('.grid');
  
  // 处理书籍数据
  let processedBooks = [];
  
  if (books && books.length > 0) {
    // 克隆书籍数组，避免修改原始数据
    processedBooks = [...books];
    
    // 对书籍数据进行兼容处理
    processedBooks = processedBooks.map(book => {
      // 创建一个新对象以避免修改原始数据
      let processedBook = { ...book };
      
      // 处理嵌套结构
      if (book.Book && typeof book.Book === 'object') {
        processedBook = {
          ...book,
          ...book.Book,
          originalData: book
        };
      }
      
      // 确保书籍有必要的属性
      processedBook.id = processedBook.id || processedBook.bookId || processedBook.book_id || '';
      processedBook.title = processedBook.title || processedBook.name || '未知书名';
      processedBook.author = processedBook.author || '未知作者';
      processedBook.description = processedBook.description || processedBook.intro || '暂无简介';
      processedBook.coverUrl = processedBook.coverUrl || processedBook.cover || processedBook.cover_image || '';
      processedBook.status = processedBook.status || processedBook.readingStatus || 'toRead';
      processedBook.progress = parseInt(processedBook.progress || processedBook.reading_progress || 0);
      
      return processedBook;
    });
  }
  
  // 清空所有容器
  if (allContent) {
    console.log('清空全部书籍容器');
    allContent.innerHTML = '';
  } else {
    console.error('未找到全部书籍容器!');
    // 如果未找到grid元素，在分类容器中创建一个
    if (allContentContainer) {
      allContentContainer.innerHTML = '<div class="grid"></div>';
      console.log('已在全部分类中创建grid元素');
      // 重新获取grid元素
      const allContent = allContentContainer.querySelector('.grid');
      if (allContent) {
        console.log('重新获取到全部书籍grid容器');
      }
    }
  }
  
  if (readingContent) readingContent.innerHTML = '';
  if (completedContent) completedContent.innerHTML = '';
  if (toReadContent) toReadContent.innerHTML = '';
  
  // 如果没有书籍
  if (!processedBooks || processedBooks.length === 0) {
    console.log('没有书籍数据，显示空状态');
    // 显示空状态
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.classList.remove('hidden');
      
      // 更新空状态内容，确保正确显示
      emptyState.innerHTML = `
        <img src="../images/empty-bookshelf.svg" alt="空书架" class="mx-auto w-40 h-40 mb-4">
        <h3 class="text-xl font-bold mb-2">您的书架还是空的</h3>
        <p class="text-gray-600 mb-4">开始添加书籍到您的书架，追踪您的阅读进度。</p>
        <button id="add-first-book-btn" class="bg-blue-500 text-white px-4 py-2 rounded-lg" onclick="window.location.href='search.html'">
          <i class="fas fa-plus mr-2"></i>添加第一本书
        </button>
      `;
      
      // 重新绑定添加第一本书按钮的事件
      const addFirstBookBtn = document.getElementById('add-first-book-btn');
      if (addFirstBookBtn) {
        addFirstBookBtn.addEventListener('click', () => {
          window.location.href = 'search.html';
        });
      }
    }
    
    // 在每个分类中显示空提示
    const containers = [allContent, readingContent, completedContent, toReadContent];
    containers.forEach(container => {
      if (container) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'col-span-full text-center py-8 text-gray-500';
        emptyMessage.innerHTML = `
          <i class="fas fa-book-open fa-3x mb-3"></i>
          <p class="text-xl font-medium">暂无书籍</p>
        `;
        container.appendChild(emptyMessage);
      }
    });
    
    return;
  }
  
  // 隐藏空状态
  console.log('有书籍数据，隐藏空状态');
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    emptyState.classList.add('hidden');
  }
}

// 生成书架卡片
function generateBookshelfCard(bookData) {
  try {
    console.log('generateBookshelfCard接收到的原始数据:', bookData);
    
    // 尝试从各种可能的结构中提取书籍信息
    let book = bookData;
    
    // 如果数据是包含book/Book属性的对象，提取实际的书籍数据
    if (bookData.book) {
      book = bookData.book;
      console.log('从bookData.book中提取书籍数据');
    } else if (bookData.Book) {
      book = bookData.Book;
      console.log('从bookData.Book中提取书籍数据');
    }
    
    // 提取书籍属性，兼容各种可能的字段名称
    const id = bookData.id || bookData.bookId || book.id || book.bookId || '未知ID';
    const title = book.title || book.name || '未知书名';
    const author = book.author || book.authors || '未知作者';
    const description = book.description || book.summary || '';
    const defaultCover = '../images/default-cover.jpg';
    const cover = book.cover || book.coverUrl || book.coverImage || defaultCover;
    
    // 提取阅读状态和进度
    const bookshelfId = bookData.bookshelfId || bookData.id || '未知书架ID';
    let readingStatus = bookData.readingStatus || bookData.reading_status || book.readingStatus || book.reading_status || 'toRead';
    const currentPage = bookData.currentPage || bookData.current_page || 0;
    const totalPages = bookData.totalPages || bookData.total_pages || book.pages || book.totalPages || 100;
    
    // 格式化状态为页面可用格式
    let statusText = '未开始';
    let statusClass = 'bg-gray-100 text-gray-700';
    
    if (readingStatus === 'reading' || readingStatus === '阅读中') {
      statusText = '阅读中';
      statusClass = 'bg-blue-100 text-blue-700';
      readingStatus = 'reading';
    } else if (readingStatus === 'completed' || readingStatus === 'finished' || readingStatus === '已读完' || readingStatus === '已完成') {
      statusText = '已完成';
      statusClass = 'bg-green-100 text-green-700';
      readingStatus = 'completed';
    } else {
      readingStatus = 'toRead';
    }
    
    // 计算阅读进度
    let progress = 0;
    if (readingStatus === 'completed') {
      progress = 100;
    } else if (totalPages > 0) {
      progress = Math.round((currentPage / totalPages) * 100);
    }
    
    console.log('准备创建书籍卡片，数据:', {
      id, title, author, cover, 
      bookshelfId, readingStatus, statusText,
      currentPage, totalPages, progress
    });
    
    // 处理封面图片URL
    let coverImgHtml = '';
    // 如果封面URL是default-cover.png或已经是默认图片路径，直接使用默认图片
    if (cover === 'default-cover.png' || cover.includes('default-cover') || cover === defaultCover) {
      coverImgHtml = `<img src="${defaultCover}" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105" data-processed="true">`;
    } else {
      // 对于其他封面，添加错误处理但避免无限循环
      coverImgHtml = `<img src="${cover}" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105" onerror="if(!this.dataset.fallbackAttempted){this.dataset.fallbackAttempted='true';this.src='../images/default-cover.jpg';}">`;
    }
    
    // 创建卡片元素
    const card = document.createElement('div');
    card.className = 'book-card bg-white rounded-xl overflow-hidden shadow transition-all duration-300 hover:shadow-md';
    card.dataset.id = id;
    card.dataset.bookshelfId = bookshelfId;
    
    // 构建卡片HTML
    card.innerHTML = `
      <div class="relative overflow-hidden rounded-t-xl bg-gray-100" style="aspect-ratio: 2/3;">
        ${coverImgHtml}
        <div class="absolute top-2 right-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
            ${statusText}
          </span>
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-sm font-semibold line-clamp-1 mb-1">${title}</h3>
        <p class="text-xs text-gray-600 mb-3">${author}</p>
        ${readingStatus === 'reading' ? `
        <div class="relative w-full h-1.5 bg-gray-200 rounded-full mb-2">
          <div class="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style="width: ${progress}%;"></div>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-500">已读 ${currentPage}/${totalPages}</span>
          <span class="font-medium text-blue-600">${progress}%</span>
        </div>
        ` : readingStatus === 'completed' ? `
        <div class="relative w-full h-1.5 bg-gray-200 rounded-full mb-2">
          <div class="absolute top-0 left-0 h-full bg-green-500 rounded-full" style="width: 100%;"></div>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-500">已读完 ${totalPages}页</span>
          <span class="font-medium text-green-600">100%</span>
        </div>
        ` : `
        <div class="flex items-center text-xs text-gray-500">
          <i class="fas fa-book-open mr-1"></i>
          <span>共 ${totalPages} 页</span>
        </div>
        `}
      </div>
      <div class="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
        <button class="btn-reading-status py-2 text-xs text-center text-gray-600 hover:bg-gray-50 transition" data-id="${id}" data-status="reading">
          <i class="fas fa-book mr-1"></i>阅读
        </button>
        <button class="btn-update-progress py-2 text-xs text-center text-gray-600 hover:bg-gray-50 transition" data-id="${id}" data-current="${currentPage}" data-total="${totalPages}">
          <i class="fas fa-tasks mr-1"></i>进度
        </button>
        <button class="btn-remove-book py-2 text-xs text-center text-gray-600 hover:bg-gray-50 transition hover:text-red-500" data-id="${id}" data-bookshelf-id="${bookshelfId}">
          <i class="fas fa-trash-alt mr-1"></i>移除
        </button>
      </div>
    `;
    
    console.log('书籍卡片创建成功:', card);
    return card;
  } catch (error) {
    console.error('生成书籍卡片时出错:', error);
    
    // 如果出错，尝试创建一个简单的后备卡片
    try {
      console.log('尝试创建后备书籍卡片');
      
      // 提取基本信息，尽量避免错误
      let title = '未知书名';
      let cover = '../images/default-cover.jpg';
      
      try {
        if (bookData) {
          if (typeof bookData === 'object') {
            // 尝试从各种嵌套结构获取标题
            if (bookData.title) title = bookData.title;
            else if (bookData.book && bookData.book.title) title = bookData.book.title;
            else if (bookData.Book && bookData.Book.title) title = bookData.Book.title;
            
            // 尝试获取封面
            if (bookData.cover) cover = bookData.cover;
            else if (bookData.coverUrl) cover = bookData.coverUrl;
            else if (bookData.book && bookData.book.cover) cover = bookData.book.cover;
            else if (bookData.Book && bookData.Book.cover) cover = bookData.Book.cover;
          }
        }
      } catch (e) {
        console.warn('提取书籍基础信息失败:', e);
      }
      
      const fallbackCard = document.createElement('div');
      fallbackCard.className = 'book-card bg-white rounded-xl overflow-hidden shadow transition-all duration-300 hover:shadow-md';
      
      // 直接使用默认封面避免请求错误
      fallbackCard.innerHTML = `
        <div class="relative overflow-hidden rounded-t-xl bg-gray-100" style="aspect-ratio: 2/3;">
          <img src="../images/default-cover.jpg" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover" data-processed="true">
        </div>
        <div class="p-4">
          <h3 class="text-sm font-semibold line-clamp-1 mb-1">${title}</h3>
          <p class="text-xs text-gray-500">数据加载错误</p>
        </div>
        <div class="border-t border-gray-100 p-2 text-xs text-center text-gray-500">
          <i class="fas fa-exclamation-circle mr-1"></i>加载详细信息出错
        </div>
      `;
      
      console.log('后备书籍卡片创建成功');
      return fallbackCard;
    } catch (fallbackError) {
      console.error('创建后备书籍卡片也失败了:', fallbackError);
      return null;
    }
  }
}

// 添加书架卡片事件监听器
function attachBookCardEventListeners() {
  // 继续阅读按钮
  const readingButtons = document.querySelectorAll('.continue-reading-btn');
  
  readingButtons.forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
      const bookCard = btn.closest('.book-card');
      const bookId = bookCard ? bookCard.dataset.bookId : null;
      
      if (bookId) {
        // 跳转到阅读页面
        window.location.href = `reader.html?id=${bookId}`;
      }
    });
  });
  
  // 移出书架按钮
  const removeButtons = document.querySelectorAll('.remove-from-shelf-btn');
  
  removeButtons.forEach((btn, index) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const bookCard = btn.closest('.book-card');
      const bookId = bookCard ? bookCard.dataset.bookId : null;
      
      if (bookId) {
        if (confirm('确定要从书架中移除这本书吗？')) {
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
              
              // 重新加载书架
              loadUserBookshelfData().then(bookshelfData => {
                if (bookshelfData) {
                  currentBookshelfData = bookshelfData;
                  // 更新统计数据
                  updateBookshelfStats(currentBookshelfData);
                  // 检查是否需要显示空状态
                  checkEmptyState();
                }
              });
            }, 300);
          } catch (error) {
            showToast('移除失败，请稍后再试', 'error');
          }
        }
      }
    });
  });
  
  // 三点菜单按钮
  const menuButtons = document.querySelectorAll('.card-menu-btn');
  
  menuButtons.forEach((btn) => {
    // 移除可能存在的旧事件监听器
    const newBtn = btn.cloneNode(true);
    if (btn.parentNode) {
      btn.parentNode.replaceChild(newBtn, btn);
    }
    
    const dropdownMenu = newBtn.nextElementSibling;
    
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      console.log('菜单按钮被点击');
      
      // 切换当前菜单的显示状态
      dropdownMenu.classList.toggle('hidden');
      
      // 关闭所有其他打开的菜单
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== dropdownMenu) {
          menu.classList.add('hidden');
        }
      });
      
      // 如果菜单现在是显示状态，确保样式正确
      if (!dropdownMenu.classList.contains('hidden')) {
        // 强制设置菜单样式
        dropdownMenu.style.position = 'absolute';
        dropdownMenu.style.right = '0';
        dropdownMenu.style.left = 'auto';
        dropdownMenu.style.top = '100%';
        dropdownMenu.style.zIndex = '100';
        dropdownMenu.style.backgroundColor = 'white';
        dropdownMenu.style.borderRadius = '0.5rem';
        dropdownMenu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        dropdownMenu.style.minWidth = '150px';
        dropdownMenu.style.display = 'block';
        dropdownMenu.style.padding = '0.5rem 0';
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
  
  // 书籍卡片点击
  const bookCards = document.querySelectorAll('.book-card');
  
  bookCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮，不处理
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.dropdown-container')) {
        return;
      }
      
      const bookId = card.dataset.bookId;
      if (bookId) {
        // 跳转到书籍详情页
        window.location.href = `book-detail.html?id=${bookId}`;
      }
    });
  });
}

// 检查是否需要显示空状态
function checkEmptyState() {
  console.log('checkEmptyState函数被调用');
  
  // 获取空状态元素和书籍容器
  const emptyState = document.getElementById('empty-state');
  const allBooksContainer = document.querySelector('.category-content[data-category="all"] .grid');
  
  if (!emptyState) {
    console.error('未找到empty-state元素');
    return;
  }
  
  if (!allBooksContainer) {
    console.error('未找到书籍容器');
    // 如果找不到容器，显示空状态
    emptyState.classList.remove('hidden');
    return;
  }
  
  // 检查是否有书籍卡片（排除空消息元素）
  const hasBooks = allBooksContainer.querySelectorAll('.book-card').length > 0;
  console.log('书架上的书籍数量:', allBooksContainer.querySelectorAll('.book-card').length);
  
  // 如果没有书籍，显示空状态；否则隐藏
  if (!hasBooks) {
    console.log('书架为空，显示空状态');
    emptyState.classList.remove('hidden');
    
    // 确保空状态内容正确
    if (emptyState.innerHTML.trim() === '') {
      emptyState.innerHTML = `
        <img src="../images/empty-bookshelf.svg" alt="空书架" class="mx-auto w-40 h-40 mb-4">
        <h3 class="text-xl font-bold mb-2">您的书架还是空的</h3>
        <p class="text-gray-600 mb-4">开始添加书籍到您的书架，追踪您的阅读进度。</p>
        <button id="add-first-book-btn" class="bg-blue-500 text-white px-4 py-2 rounded-lg">
          <i class="fas fa-plus mr-2"></i>添加第一本书
        </button>
      `;
      
      // 添加按钮事件
      const addFirstBookBtn = document.getElementById('add-first-book-btn');
      if (addFirstBookBtn) {
        addFirstBookBtn.addEventListener('click', () => {
          window.location.href = 'search.html';
        });
      }
    }
  } else {
    console.log('书架有书籍，隐藏空状态');
    emptyState.classList.add('hidden');
  }
}

// 导出函数
export {
  initFilterDropdown,
  initSortDropdown,
  initAddBookButton,
  initCategoryTabs,
  initSearchFunction,
  applyFiltersAndSort,
  applyFilter,
  applySorting,
  showAddBookDialog,
  performBookshelfSearch,
  loadUserBookshelfData,
  updateBookshelfDisplay,
  generateBookshelfCard,
  attachBookCardEventListeners
}; 

// 立即执行的代码，确保关键函数在模块加载后立即导出到window对象
(function() {
  console.log('bookshelf.js 模块加载完成，立即导出关键函数到window对象');
  
  // 将关键函数添加到window对象
  window.performBookshelfSearch = performBookshelfSearch;
  window.updateBookshelfDisplay = updateBookshelfDisplay;
  window.generateBookshelfCard = generateBookshelfCard;
  window.attachBookCardEventListeners = attachBookCardEventListeners;
  window.applyFilter = applyFilter;
  window.applySorting = applySorting;
  window.showAddBookDialog = showAddBookDialog;
  window.checkEmptyState = checkEmptyState;
  
  console.log('关键函数已导出到window对象');
})(); 