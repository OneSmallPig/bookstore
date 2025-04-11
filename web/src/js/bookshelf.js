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
})();

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

// 页面加载完成后初始化
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
  
  console.log('bookshelf.js: 已将关键函数添加到window对象');
  console.log('updateBookshelfDisplay是否已添加到window:', typeof window.updateBookshelfDisplay === 'function');

  // 检查是否在书架页面
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (!bookshelfContainer) return;
  
  // 显示加载状态
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (bookshelfContent) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
    `;
  }
  
  try {
    // 加载用户书架数据
    const bookshelfData = await loadUserBookshelfData();
    if (bookshelfData) {
      currentBookshelfData = bookshelfData;
      
      // 更新书架显示
      updateBookshelfDisplay(currentBookshelfData);
      
      // 更新统计数据
      updateBookshelfStats(currentBookshelfData);
    } else {
      currentBookshelfData = window.currentBookshelfData || [];
      
      // 显示空书架提示
      if (bookshelfContent) {
        bookshelfContent.innerHTML = `
          <div class="text-center py-8">
            您的书架还没有书籍
          </div>
        `;
      }
    }
  } catch (error) {
    // 显示错误信息
    if (bookshelfContent) {
      bookshelfContent.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-circle mr-2"></i> 加载书架失败，请稍后再试
        </div>
      `;
    }
  }
  
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
  const categoryContents = document.querySelectorAll('.category-content');
  
  if (!categoryTabs.length || !categoryContents.length) return;
  
  // 为每个标签添加点击事件
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 移除所有标签的活跃状态
      categoryTabs.forEach(t => {
        t.classList.remove('active', 'border-blue-500', 'text-blue-500');
        t.classList.add('border-transparent', 'text-gray-500');
      });
      
      // 添加当前标签的活跃状态
      tab.classList.add('active', 'border-blue-500', 'text-blue-500');
      tab.classList.remove('border-transparent', 'text-gray-500');
      
      // 获取分类
      const category = tab.getAttribute('data-category');
      
      // 隐藏所有内容
      categoryContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      // 显示对应分类的内容
      const activeContent = document.querySelector(`.category-content[data-category="${category}"]`);
      if (activeContent) {
        activeContent.classList.remove('hidden');
      }
      
      // 更新当前筛选条件
      currentFilter = category;
      
      // 应用筛选
      applyFiltersAndSort();
    });
  });
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
      const status = book.readingStatus || bookObj.readingStatus || book.reading_status || bookObj.reading_status;
      
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
  updateBookshelfDisplay(filteredBooks);
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

// 应用筛选函数（供HTML内联事件调用）
async function applyFilter() {
  // 获取选中的筛选条件
  const checkedFilters = document.querySelectorAll('input[name="filter-status"]:checked');
  const statusFilters = Array.from(checkedFilters).map(input => input.value);
  
  // 更新当前筛选条件
  currentFilter = statusFilters.length > 0 ? statusFilters[0] : 'all';
  
  // 应用筛选和排序
  applyFiltersAndSort();
  
  // 隐藏下拉菜单
  const filterMenu = document.getElementById('filter-menu');
  if (filterMenu) filterMenu.classList.remove('show');
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
async function loadUserBookshelfData() {
  try {
    console.log('=====开始加载用户书架数据=====');
    
    // 隐藏之前的空状态和错误状态
    document.getElementById('empty-state')?.classList.add('hidden');
    document.getElementById('error-state')?.classList.add('hidden');
    
    // 显示加载指示器
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.classList.remove('hidden');
      console.log('显示加载指示器');
    }
    
    // 检查用户是否登录
    const authData = localStorage.getItem('bookstore_auth');
    const token = authData ? JSON.parse(authData).token : null;
    if (!token) {
      console.log('用户未登录，显示空状态');
      document.getElementById('empty-state')?.classList.remove('hidden');
      loadingIndicator?.classList.add('hidden');
      return null;
    }
    
    console.log('开始请求API获取书架数据');
    // 发起API请求
    const response = await bookshelfApi.getBookshelf();
    console.log('API响应:', response);
    
    // 提取出书籍数据 - 处理不同的响应格式
    let books = [];
    
    if (response && response.data !== undefined) {
      console.log('从response.data中提取数据');
      // 响应格式可能是 { data: { bookshelf: [...] } } 或 { data: [...] }
      const data = response.data;
      
      if (Array.isArray(data)) {
        console.log('response.data是一个数组, 长度:', data.length);
        books = data;
      } else if (data && data.bookshelf && Array.isArray(data.bookshelf)) {
        console.log('response.data.bookshelf是一个数组, 长度:', data.bookshelf.length);
        books = data.bookshelf;
      } else if (data && Array.isArray(data.books)) {
        console.log('response.data.books是一个数组, 长度:', data.books.length);
        books = data.books;
      } else if (data && typeof data === 'object') {
        console.log('response.data是一个对象, 尝试找到包含书籍的数组');
        // 尝试遍历对象查找可能的书籍数组
        for (const key in data) {
          if (Array.isArray(data[key])) {
            console.log(`找到一个数组在response.data.${key}, 长度:`, data[key].length);
            books = data[key];
            break;
          }
        }
      }
    } else if (response && Array.isArray(response)) {
      console.log('response本身是一个数组, 长度:', response.length);
      books = response;
    } else if (response && response.bookshelf && Array.isArray(response.bookshelf)) {
      console.log('response.bookshelf是一个数组, 长度:', response.bookshelf.length);
      books = response.bookshelf;
    }
    
    // 隐藏加载指示器
    loadingIndicator?.classList.add('hidden');
    console.log('隐藏加载指示器');
    
    // 检查是否有书籍数据
    if (!Array.isArray(books) || books.length === 0) {
      console.log('未找到书籍数据或为空数组, 显示空状态');
      document.getElementById('empty-state')?.classList.remove('hidden');
      return [];
    }
    
    console.log(`发现${books.length}本书籍, 更新UI`);
    // 更新UI展示书籍
    updateBookshelfDisplay(books);
    
    // 保存当前书架数据
    currentBookshelfData = books;
    
    // 同时更新window对象上的数据，确保HTML中的脚本可以访问
    window.currentBookshelfData = books;
    console.log('已将书籍数据保存到window.currentBookshelfData:', window.currentBookshelfData.length);
    
    // 建立重试按钮的点击事件
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
      retryBtn.onclick = () => loadUserBookshelfData();
    }
    
    console.log('=====书架数据加载完成=====');
    return books;
  } catch (error) {
    console.error('加载书架数据失败:', error);
    
    // 隐藏加载指示器
    document.getElementById('loading-indicator')?.classList.add('hidden');
    
    // 显示错误状态
    document.getElementById('error-state')?.classList.remove('hidden');
    
    // 建立重试按钮的点击事件
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
      retryBtn.onclick = () => loadUserBookshelfData();
    }
    
    return null;
  }
}

// 更新书架显示
function updateBookshelfDisplay(books, searchQuery = '') {
  // 数据验证和调试日志
  console.log('updateBookshelfDisplay 被调用，传入数据:', {
    books: books,
    isArray: Array.isArray(books),
    length: books ? books.length : 0,
    searchQuery: searchQuery
  });
  
  // 处理可能的不同数据格式
  let processedBooks = [];
  
  if (Array.isArray(books)) {
    // 如果直接是数组
    console.log('books是数组类型，直接使用');
    processedBooks = books;
  } else if (books && typeof books === 'object') {
    // 处理可能的嵌套结构
    if (books.bookshelf && Array.isArray(books.bookshelf)) {
      console.log('从books.bookshelf中提取书籍数组');
      processedBooks = books.bookshelf;
    } else if (books.data && Array.isArray(books.data)) {
      console.log('从books.data中提取书籍数组');
      processedBooks = books.data;
    } else if (books.data && books.data.bookshelf && Array.isArray(books.data.bookshelf)) {
      console.log('从books.data.bookshelf中提取书籍数组');
      processedBooks = books.data.bookshelf;
    } else {
      // 尝试寻找任何可能的数组
      let foundArray = false;
      for (const key in books) {
        if (Array.isArray(books[key])) {
          console.log(`从books.${key}中找到并提取书籍数组`);
          processedBooks = books[key];
          foundArray = true;
          break;
        } else if (books[key] && typeof books[key] === 'object') {
          for (const nestedKey in books[key]) {
            if (Array.isArray(books[key][nestedKey])) {
              console.log(`从books.${key}.${nestedKey}中找到并提取书籍数组`);
              processedBooks = books[key][nestedKey];
              foundArray = true;
              break;
            }
          }
          if (foundArray) break;
        }
      }
      
      if (!foundArray) {
        console.warn('未能找到书籍数组，创建空数组');
        processedBooks = [];
      }
    }
  } else {
    console.warn('books不是数组也不是对象，创建空数组');
    processedBooks = [];
  }
  
  console.log('处理后的书籍数组长度:', processedBooks.length);
  
  // 同步更新window对象上的数据
  window.currentBookshelfData = processedBooks;
  console.log('已更新window.currentBookshelfData:', window.currentBookshelfData.length);
  
  // 获取所有分类内容容器
  const allContent = document.querySelector('.category-content[data-category="all"] .grid');
  const readingContent = document.querySelector('.category-content[data-category="reading"] .grid');
  const completedContent = document.querySelector('.category-content[data-category="completed"] .grid');
  const toReadContent = document.querySelector('.category-content[data-category="toRead"] .grid');
  
  console.log('网格容器状态:', {
    allContent: allContent ? '已找到' : '未找到',
    readingContent: readingContent ? '已找到' : '未找到',
    completedContent: completedContent ? '已找到' : '未找到',
    toReadContent: toReadContent ? '已找到' : '未找到'
  });
  
  // 清空所有容器
  if (allContent) {
    console.log('清空全部书籍容器');
    allContent.innerHTML = '';
  } else {
    console.error('未找到全部书籍容器!');
  }
  
  if (readingContent) readingContent.innerHTML = '';
  if (completedContent) completedContent.innerHTML = '';
  if (toReadContent) toReadContent.innerHTML = '';
  
  // 如果没有书籍
  if (!processedBooks || processedBooks.length === 0) {
    console.log('没有书籍数据，显示空状态');
    // 显示空状态
    document.getElementById('empty-state')?.classList.remove('hidden');
    
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
  document.getElementById('empty-state')?.classList.add('hidden');
  
  // 分类书籍
  const allBooks = [];
  const readingBooks = [];
  const completedBooks = [];
  const toReadBooks = [];
  
  processedBooks.forEach(book => {
    // 确保我们有正确的书籍数据结构
    const bookData = book.book || book.Book || book;
    const status = book.readingStatus || bookData.readingStatus || book.reading_status || bookData.reading_status || 'toRead';
    
    // 添加到所有书籍
    allBooks.push(book);
    
    // 根据状态分类
    if (status === 'reading' || status === '阅读中') {
      readingBooks.push(book);
    } else if (status === 'completed' || status === 'finished' || status === '已读完' || status === '已完成') {
      completedBooks.push(book);
    } else {
      toReadBooks.push(book);
    }
  });
  
  console.log('书籍分类完成:', {
    all: allBooks.length,
    reading: readingBooks.length,
    completed: completedBooks.length,
    toRead: toReadBooks.length
  });
  
  // 更新统计数据
  const totalBooksElement = document.getElementById('total-books');
  const finishedBooksElement = document.getElementById('finished-books');
  const readingBooksElement = document.getElementById('reading-books');
  
  if (totalBooksElement) totalBooksElement.textContent = allBooks.length;
  if (finishedBooksElement) finishedBooksElement.textContent = completedBooks.length;
  if (readingBooksElement) readingBooksElement.textContent = readingBooks.length;
  
  // 显示书籍
  function displayBooks(container, booksArray) {
    if (!container) {
      console.error('displayBooks: 容器不存在');
      return;
    }
    
    console.log(`displayBooks: 准备显示${booksArray ? booksArray.length : 0}本书籍到容器`, container);
    
    // 确保booksArray是一个数组
    if (!Array.isArray(booksArray)) {
      console.warn('displayBooks: booksArray不是数组类型:', booksArray);
      booksArray = [];
    }
    
    if (booksArray.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'col-span-full text-center py-8 text-gray-500';
      emptyMessage.innerHTML = `
        <i class="fas fa-book-open fa-3x mb-3"></i>
        <p class="text-xl font-medium">暂无书籍</p>
      `;
      container.appendChild(emptyMessage);
      return;
    }
    
    console.log(`displayBooks: 开始渲染${booksArray.length}本书籍`);
    
    // 使用documentFragment优化批量添加DOM
    const fragment = document.createDocumentFragment();
    let cardsAdded = 0;
    
    booksArray.forEach((book, index) => {
      try {
        const bookCard = generateBookshelfCard(book);
        if (bookCard) {
          fragment.appendChild(bookCard);
          cardsAdded++;
        } else {
          console.warn(`generateBookshelfCard返回了null或undefined，书籍索引: ${index}`);
        }
      } catch (error) {
        console.error(`生成第${index + 1}本书籍卡片时出错:`, error);
        
        // 添加一个简单的错误卡片
        try {
          const errorCard = document.createElement('div');
          errorCard.className = 'book-card bg-white rounded-xl overflow-hidden shadow-sm p-4 text-center';
          errorCard.innerHTML = `
            <div class="text-red-500">
              <i class="fas fa-exclamation-triangle mb-2"></i>
              <p>加载此书籍时出错</p>
            </div>
          `;
          fragment.appendChild(errorCard);
          cardsAdded++;
        } catch (fallbackError) {
          console.error('创建错误卡片也失败了:', fallbackError);
        }
      }
    });
    
    // 一次性添加所有卡片到容器
    container.appendChild(fragment);
    console.log(`displayBooks: 完成渲染${cardsAdded}/${booksArray.length}本书籍`);
    
    // 验证DOM是否真的更新了
    const actualCards = container.querySelectorAll('.book-card');
    console.log(`容器现在包含${actualCards.length}个书籍卡片`);
  }
  
  // 将displayBooks函数添加到window对象，使其在HTML中可用
  window.displayBooks = displayBooks;
  
  // 显示各分类的书籍
  console.log('开始显示各分类书籍');
  
  if (allContent) {
    console.log('渲染全部书籍分类');
    displayBooks(allContent, allBooks);
  } else {
    console.error('无法渲染全部书籍分类，容器不存在');
  }
  
  if (readingContent) {
    console.log('渲染阅读中分类');
    displayBooks(readingContent, readingBooks);
  }
  
  if (completedContent) {
    console.log('渲染已完成分类');
    displayBooks(completedContent, completedBooks);
  }
  
  if (toReadContent) {
    console.log('渲染未开始分类');
    displayBooks(toReadContent, toReadBooks);
  }
  
  // 添加书籍卡片事件监听器
  console.log('添加书籍卡片事件监听器');
  attachBookCardEventListeners();
  
  // 在搜索框有查询内容时添加搜索结果标题
  if (searchQuery && allContent) {
    console.log('添加搜索结果标题');
    const searchResultHeader = document.createElement('div');
    searchResultHeader.className = 'col-span-full mb-4 flex justify-between items-center';
    searchResultHeader.innerHTML = `
      <h3 class="text-lg font-semibold">搜索结果: "${searchQuery}" (${processedBooks.length}本)</h3>
      <button id="clear-search-btn" class="text-sm text-blue-600 hover:text-blue-800">
        <i class="fas fa-times-circle mr-1"></i>清除搜索
      </button>
    `;
    allContent.insertBefore(searchResultHeader, allContent.firstChild);
    
    // 添加清除搜索按钮事件
    const clearSearchBtn = searchResultHeader.querySelector('#clear-search-btn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.value = '';
          // 重新加载书架
          loadUserBookshelfData().then(data => {
            if (data) {
              currentBookshelfData = data;
              updateBookshelfDisplay(currentBookshelfData);
            }
          });
        }
      });
    }
  }
  
  console.log('updateBookshelfDisplay 函数执行完成');
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
    const cover = book.cover || book.coverUrl || book.coverImage || '/assets/images/default-cover.png';
    
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
    
    // 创建卡片元素
    const card = document.createElement('div');
    card.className = 'book-card bg-white rounded-xl overflow-hidden shadow transition-all duration-300 hover:shadow-md';
    card.dataset.id = id;
    card.dataset.bookshelfId = bookshelfId;
    
    // 构建卡片HTML
    card.innerHTML = `
      <div class="relative overflow-hidden rounded-t-xl bg-gray-100" style="aspect-ratio: 2/3;">
        <img src="${cover}" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105" onerror="this.src='/assets/images/default-cover.png';">
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
      let cover = '/assets/images/default-cover.png';
      
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
      
      fallbackCard.innerHTML = `
        <div class="relative overflow-hidden rounded-t-xl bg-gray-100" style="aspect-ratio: 2/3;">
          <img src="${cover}" alt="${title}" class="absolute top-0 left-0 w-full h-full object-cover" onerror="this.src='/assets/images/default-cover.png';">
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
  const allBooksContainer = document.querySelector('.category-content[data-category="all"] .grid');
  const emptyState = document.getElementById('empty-state');
  
  if (allBooksContainer && emptyState) {
    if (allBooksContainer.children.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
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