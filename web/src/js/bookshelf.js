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
  // 获取搜索框中的查询内容
  const searchInput = document.getElementById('search-input');
  const searchQuery = searchInput ? searchInput.value.trim() : '';
  
  // 构建API请求参数
  const params = {
    query: searchQuery,
    status: currentFilter !== 'all' ? currentFilter : null
  };
  
  // 添加排序参数
  if (currentSort === 'date-desc') {
    params.sort = 'addedAt';
    params.order = 'desc';
  } else if (currentSort === 'date-asc') {
    params.sort = 'addedAt';
    params.order = 'asc';
  } else if (currentSort === 'title-asc') {
    params.sort = 'title';
    params.order = 'asc';
  } else if (currentSort === 'title-desc') {
    params.sort = 'title';
    params.order = 'desc';
  } else if (currentSort === 'progress') {
    params.sort = 'progress';
    params.order = 'desc';
  }
  
  // 显示加载状态
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (bookshelfContent) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
    `;
  } else {
    return;
  }
  
  // 调用API获取书架书籍
  bookshelfApi.getBookshelfBooks(params)
    .then(response => {
      // 处理API响应
      let books = [];
      if (response && response.data && response.data.bookshelf) {
        books = response.data.bookshelf;
      } else if (response && response.bookshelf) {
        books = response.bookshelf;
      } else if (Array.isArray(response)) {
        books = response;
      } else {
        console.warn('API返回的数据格式不符合预期:', response);
      }
      
      // 清除加载状态
      if (bookshelfContent) {
        bookshelfContent.innerHTML = '';
      }
      
      // 更新书架显示
      updateBookshelfDisplay(books, searchQuery);
      
      // 更新统计数据
      updateBookshelfStats(currentBookshelfData);
    })
    .catch(error => {
      // 显示错误信息
      if (bookshelfContent) {
        bookshelfContent.innerHTML = `
          <div class="text-center py-8 text-red-500">
            <i class="fas fa-exclamation-circle mr-2"></i> 加载失败，请稍后再试
          </div>
        `;
      }
      
      // 显示错误提示
      showToast('加载书架失败，请稍后再试', 'error');
    });
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
    // 首先尝试从API获取数据
    if (isLoggedIn()) {
      // 使用新的接口获取所有书架书籍
      const bookshelfData = await bookshelfApi.getBookshelfBooks();
      
      // 处理不同的API响应结构
      if (bookshelfData && bookshelfData.data && bookshelfData.data.bookshelf) {
        // 保存到全局变量，以便客户端过滤使用
        window.currentBookshelfData = bookshelfData.data.bookshelf;
        return bookshelfData.data.bookshelf;
      } else if (bookshelfData && bookshelfData.bookshelf) {
        window.currentBookshelfData = bookshelfData.bookshelf;
        return bookshelfData.bookshelf;
      } else if (Array.isArray(bookshelfData)) {
        window.currentBookshelfData = bookshelfData;
        return bookshelfData;
      }
    } else {
      console.log('用户未登录，无法从API获取书架数据');
    }
    
    // 如果API调用失败或用户未登录，使用模拟数据
    console.log('使用模拟数据');
    window.currentBookshelfData = mockBooks;
    return mockBooks;
  } catch (error) {
    console.error('加载用户书架数据失败:', error);
    
    // 出现错误时，使用模拟数据
    console.log('出现错误，使用模拟数据');
    window.currentBookshelfData = mockBooks;
    return mockBooks;
  }
}

// 更新书架显示
function updateBookshelfDisplay(books, searchQuery = '') {
  console.log('updateBookshelfDisplay 函数被调用:', { 
    booksLength: books ? books.length : 0, 
    searchQuery,
    isFunction: typeof updateBookshelfDisplay === 'function',
    isWindowFunction: typeof window.updateBookshelfDisplay === 'function'
  });
  
  // 获取所有分类内容容器
  const allContent = document.querySelector('.category-content[data-category="all"] .grid');
  const readingContent = document.querySelector('.category-content[data-category="reading"] .grid');
  const completedContent = document.querySelector('.category-content[data-category="completed"] .grid');
  const toReadContent = document.querySelector('.category-content[data-category="toRead"] .grid');
  
  // 清空所有容器
  if (allContent) allContent.innerHTML = '';
  if (readingContent) readingContent.innerHTML = '';
  if (completedContent) completedContent.innerHTML = '';
  if (toReadContent) toReadContent.innerHTML = '';
  
  // 如果没有书籍
  if (!books || books.length === 0) {
    // 显示空状态
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.classList.remove('hidden');
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
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    emptyState.classList.add('hidden');
  }
  
  // 分类书籍
  const allBooks = [];
  const readingBooks = [];
  const completedBooks = [];
  const toReadBooks = [];
  
  books.forEach(book => {
    // 确保我们有正确的书籍数据结构
    const bookData = book.Book || book;
    const status = book.status || 'toRead';
    
    // 添加到所有书籍
    allBooks.push(book);
    
    // 根据状态分类
    if (status === 'reading') {
      readingBooks.push(book);
    } else if (status === 'completed' || status === 'finished') {
      completedBooks.push(book);
    } else {
      toReadBooks.push(book);
    }
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
    if (!container) return;
    
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
    
    booksArray.forEach(book => {
      const bookCard = generateBookshelfCard(book);
      container.appendChild(bookCard);
    });
  }
  
  // 显示各分类的书籍
  displayBooks(allContent, allBooks);
  displayBooks(readingContent, readingBooks);
  displayBooks(completedContent, completedBooks);
  displayBooks(toReadContent, toReadBooks);
  
  // 添加书籍卡片事件监听器
  attachBookCardEventListeners();
  
  // 如果是搜索结果，显示搜索结果标题
  if (searchQuery && allContent) {
    const searchResultHeader = document.createElement('div');
    searchResultHeader.className = 'col-span-full mb-4';
    searchResultHeader.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="text-gray-700">
          找到 <span class="font-medium">${allBooks.length}</span> 本匹配 "${searchQuery}" 的书籍
        </div>
        <button id="clear-search-btn" class="text-blue-500 hover:text-blue-700 flex items-center">
          <i class="fas fa-times mr-1"></i>清除搜索
        </button>
      </div>
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
}

// 生成书架卡片
function generateBookshelfCard(bookData) {
  // 确保我们有正确的书籍数据结构
  const book = bookData.Book || bookData;
  const progress = bookData.progress || 0;
  const status = bookData.status || 'toRead';
  
  // 获取书籍信息
  const bookId = book.id || bookData.bookId || '';
  const title = book.title || '未知标题';
  const author = book.author || '未知作者';
  const cover = book.coverUrl || book.cover || '../images/default-cover.jpg';
  
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
  
  // 创建卡片元素
  const cardElement = document.createElement('div');
  cardElement.className = 'book-card bg-white p-4 relative rounded-lg';
  cardElement.dataset.bookId = bookId;
  
  // 设置卡片内容
  cardElement.innerHTML = `
    <div class="absolute top-2 right-2 dropdown-container" style="position: relative;">
      <button class="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 card-menu-btn">
        <i class="fas fa-ellipsis-v"></i>
      </button>
      <div class="dropdown-menu hidden" style="position: absolute; right: 0; left: auto; top: 100%; z-index: 100; background-color: white; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 150px; padding: 0.5rem 0;">
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
  `;
  
  return cardElement;
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