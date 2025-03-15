/**
 * bookshelf.js
 * 书架页面专用脚本，处理书架页面的筛选、排序和添加书籍功能
 */

import { bookApi, bookshelfApi } from './api.js';
import { showToast } from './utils.js';
import { isLoggedIn } from './auth.js';
import { 
  loadUserBookshelf, 
  displayBookshelf, 
  generateBookshelfCard, 
  updateBookshelfStats, 
  addBookshelfCardListeners 
} from './main.js';

// 当前书架数据
let currentBookshelfData = [];
// 当前过滤器
let currentFilter = 'all';
// 当前排序方式
let currentSort = 'date-desc';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 检查是否在书架页面
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (!bookshelfContainer) return;
  
  console.log('初始化书架页面');
  
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
    const bookshelfData = await loadUserBookshelf();
    if (bookshelfData) {
      currentBookshelfData = bookshelfData;
      console.log('书架数据已加载:', currentBookshelfData);
      
      // 更新书架显示
      updateBookshelfDisplay(currentBookshelfData);
      
      // 更新统计数据
      updateBookshelfStats(currentBookshelfData);
    } else {
      console.log('书架数据加载失败或用户未登录');
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
    console.error('加载书架数据失败:', error);
    
    // 显示错误信息
    if (bookshelfContent) {
      bookshelfContent.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-circle mr-2"></i> 加载书架失败，请稍后再试
        </div>
      `;
    }
  }
  
  // 确保在页面完全加载后初始化这些功能
  setTimeout(() => {
    console.log('延迟初始化筛选和排序功能');
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
    
    // 添加全局函数，以便HTML中的内联事件能够调用
    window.applyFilter = applyFilter;
    window.applySorting = applySorting;
    window.showAddBookDialog = showAddBookDialog;
    
    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', (e) => {
      const filterMenu = document.getElementById('filter-menu');
      const sortMenu = document.getElementById('sort-menu');
      const filterBtn = document.getElementById('filter-btn');
      const sortBtn = document.getElementById('sort-btn');
      
      if (filterMenu && !filterBtn.contains(e.target) && !filterMenu.contains(e.target)) {
        filterMenu.classList.remove('show');
      }
      
      if (sortMenu && !sortBtn.contains(e.target) && !sortMenu.contains(e.target)) {
        sortMenu.classList.remove('show');
      }
    });
  }, 500);
});

// 初始化筛选下拉菜单
function initFilterDropdown() {
  const filterBtn = document.getElementById('filter-btn');
  const filterMenu = document.getElementById('filter-menu');
  const applyFilterBtn = document.getElementById('apply-filter');
  
  console.log('初始化筛选下拉菜单:', { 
    filterBtn: !!filterBtn, 
    filterMenu: !!filterMenu, 
    applyFilterBtn: !!applyFilterBtn 
  });
  
  if (!filterBtn || !filterMenu) {
    console.error('筛选按钮或菜单未找到:', { 
      filterBtnId: 'filter-btn', 
      filterMenuId: 'filter-menu',
      filterBtnElement: filterBtn,
      filterMenuElement: filterMenu
    });
    return;
  }
  
  // 移除可能存在的旧事件监听器
  const newFilterBtn = filterBtn.cloneNode(true);
  filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);
  
  // 点击筛选按钮显示/隐藏下拉菜单
  newFilterBtn.onclick = function(e) {
    console.log('筛选按钮被点击 (使用onclick)');
    e.stopPropagation(); // 阻止事件冒泡
    filterMenu.classList.toggle('show');
    console.log('筛选菜单显示状态:', filterMenu.classList.contains('show'));
    // 隐藏排序下拉菜单
    const sortMenu = document.getElementById('sort-menu');
    if (sortMenu) sortMenu.classList.remove('show');
  };
  
  // 点击应用筛选按钮
  if (applyFilterBtn) {
    const newApplyFilterBtn = applyFilterBtn.cloneNode(true);
    applyFilterBtn.parentNode.replaceChild(newApplyFilterBtn, applyFilterBtn);
    
    newApplyFilterBtn.onclick = function() {
      console.log('应用筛选按钮被点击 (使用onclick)');
      // 获取选中的筛选条件
      const checkedFilters = document.querySelectorAll('input[name="filter-status"]:checked');
      const statusFilters = Array.from(checkedFilters).map(input => input.value);
      console.log('选中的筛选条件:', statusFilters);
      
      // 更新当前筛选条件
      currentFilter = statusFilters.length > 0 ? statusFilters[0] : 'all';
      console.log('更新后的筛选条件:', currentFilter);
      
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
  
  console.log('初始化排序下拉菜单:', { 
    sortBtn: !!sortBtn, 
    sortMenu: !!sortMenu, 
    sortOptionsCount: sortOptions.length 
  });
  
  if (!sortBtn || !sortMenu) {
    console.error('排序按钮或菜单未找到:', { 
      sortBtnId: 'sort-btn', 
      sortMenuId: 'sort-menu',
      sortBtnElement: sortBtn,
      sortMenuElement: sortMenu
    });
    return;
  }
  
  // 移除可能存在的旧事件监听器
  const newSortBtn = sortBtn.cloneNode(true);
  sortBtn.parentNode.replaceChild(newSortBtn, sortBtn);
  
  // 点击排序按钮显示/隐藏下拉菜单
  newSortBtn.onclick = function(e) {
    console.log('排序按钮被点击 (使用onclick)');
    e.stopPropagation(); // 阻止事件冒泡
    sortMenu.classList.toggle('show');
    console.log('排序菜单显示状态:', sortMenu.classList.contains('show'));
    // 隐藏筛选下拉菜单
    const filterMenu = document.getElementById('filter-menu');
    if (filterMenu) filterMenu.classList.remove('show');
  };
  
  // 点击排序选项
  sortOptions.forEach(option => {
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);
    
    newOption.onclick = function(e) {
      console.log('排序选项被点击 (使用onclick):', newOption.getAttribute('data-sort'));
      e.preventDefault();
      e.stopPropagation(); // 阻止事件冒泡
      
      // 获取排序方式
      const sortValue = newOption.getAttribute('data-sort');
      if (sortValue) {
        // 更新当前排序方式
        currentSort = sortValue;
        console.log('更新后的排序方式:', currentSort);
        
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
    // 显示添加书籍对话框
    showAddBookDialog();
  });
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
            const newBookshelfData = await loadUserBookshelf();
            if (newBookshelfData) {
              currentBookshelfData = newBookshelfData;
              // 应用当前的过滤和排序
              applyFiltersAndSort();
            }
          } catch (error) {
            console.error('添加到书架失败:', error);
            showToast('添加失败，请稍后再试', 'error');
            
            // 恢复按钮状态
            button.innerHTML = '添加到书架';
            button.disabled = false;
          }
        });
      });
      
    } catch (error) {
      console.error('搜索书籍失败:', error);
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
  
  if (!categoryTabs.length) return;
  
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
    console.error('搜索元素未找到');
    return;
  }
  
  // 搜索按钮点击事件
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      performBookshelfSearch(query);
    }
  });
  
  // 输入框回车事件
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        performBookshelfSearch(query);
      }
    }
  });
}

// 执行书架搜索
async function performBookshelfSearch(query) {
  console.log('执行书架搜索:', query);
  
  // 显示加载状态
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (bookshelfContent) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-spinner fa-spin mr-2"></i> 搜索中...
      </div>
    `;
  }
  
  try {
    // 调用API搜索书架
    const searchResult = await bookshelfApi.searchBookshelf(query);
    
    // 处理搜索结果 - 确保正确处理API响应结构
    let searchBooks = [];
    if (searchResult && searchResult.data && searchResult.data.books) {
      searchBooks = searchResult.data.books;
    } else if (searchResult && searchResult.books) {
      searchBooks = searchResult.books;
    } else if (Array.isArray(searchResult)) {
      searchBooks = searchResult;
    }
    
    console.log('搜索结果:', searchBooks);
    
    // 更新书架显示
    if (searchBooks.length > 0) {
      updateBookshelfDisplay(searchBooks);
    } else {
      // 显示无结果提示
      if (bookshelfContent) {
        bookshelfContent.innerHTML = `
          <div class="text-center py-8">
            没有找到匹配 "${query}" 的书籍
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('搜索书架失败:', error);
    
    // 显示错误信息
    if (bookshelfContent) {
      bookshelfContent.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-circle mr-2"></i> 搜索失败，请稍后再试
        </div>
      `;
    }
    
    showToast('搜索失败，请稍后再试', 'error');
  }
}

// 应用筛选和排序
function applyFiltersAndSort() {
  console.log('应用筛选和排序');
  console.log('当前筛选条件:', currentFilter);
  console.log('当前排序方式:', currentSort);
  
  // 确保有数据可以处理
  if (!currentBookshelfData || !Array.isArray(currentBookshelfData) || currentBookshelfData.length === 0) {
    console.log('没有书架数据可以筛选和排序');
    updateBookshelfDisplay([]);
    return;
  }
  
  // 创建一个副本以避免修改原始数据
  let filteredBooks = [...currentBookshelfData];
  console.log('筛选前的书籍数量:', filteredBooks.length);
  
  // 应用筛选
  if (currentFilter !== 'all') {
    if (currentFilter === 'reading') {
      // 阅读中：进度大于0且小于100
      filteredBooks = filteredBooks.filter(book => {
        const bookInfo = book.Book || book;
        const progress = bookInfo.readingProgress || bookInfo.progress || 0;
        const status = bookInfo.status || bookInfo.readingStatus || '';
        
        return (progress > 0 && progress < 100) || status === 'reading';
      });
    } else if (currentFilter === 'finished') {
      // 已读完：进度等于100或状态为completed
      filteredBooks = filteredBooks.filter(book => {
        const bookInfo = book.Book || book;
        const progress = bookInfo.readingProgress || bookInfo.progress || 0;
        const status = bookInfo.status || bookInfo.readingStatus || '';
        
        return progress === 100 || status === 'completed';
      });
    } else if (currentFilter === 'unread' || currentFilter === 'wishlist') {
      // 未读/想读：进度等于0或状态为toRead
      filteredBooks = filteredBooks.filter(book => {
        const bookInfo = book.Book || book;
        const progress = bookInfo.readingProgress || bookInfo.progress || 0;
        const status = bookInfo.status || bookInfo.readingStatus || '';
        
        return progress === 0 || status === 'toRead';
      });
    }
  }
  
  // 应用排序
  if (currentSort === 'date-desc') {
    // 按添加时间降序（最新的在前面）
    filteredBooks.sort((a, b) => {
      const dateA = new Date(a.addedAt || a.lastReadAt || 0);
      const dateB = new Date(b.addedAt || b.lastReadAt || 0);
      return dateB - dateA;
    });
  } else if (currentSort === 'date-asc') {
    // 按添加时间升序（最早的在前面）
    filteredBooks.sort((a, b) => {
      const dateA = new Date(a.addedAt || a.lastReadAt || 0);
      const dateB = new Date(b.addedAt || b.lastReadAt || 0);
      return dateA - dateB;
    });
  } else if (currentSort === 'title-asc') {
    // 按书名升序（A-Z）
    filteredBooks.sort((a, b) => {
      const bookInfoA = a.Book || a;
      const bookInfoB = b.Book || b;
      return (bookInfoA.title || '').localeCompare(bookInfoB.title || '');
    });
  } else if (currentSort === 'title-desc') {
    // 按书名降序（Z-A）
    filteredBooks.sort((a, b) => {
      const bookInfoA = a.Book || a;
      const bookInfoB = b.Book || b;
      return (bookInfoB.title || '').localeCompare(bookInfoA.title || '');
    });
  } else if (currentSort === 'progress') {
    // 按阅读进度降序
    filteredBooks.sort((a, b) => {
      const bookInfoA = a.Book || a;
      const bookInfoB = b.Book || b;
      const progressA = bookInfoA.readingProgress || bookInfoA.progress || 0;
      const progressB = bookInfoB.readingProgress || bookInfoB.progress || 0;
      return progressB - progressA;
    });
  }
  
  // 更新书架显示
  updateBookshelfDisplay(filteredBooks);
  
  // 更新统计数据
  updateBookshelfStats(currentBookshelfData);
}

// 更新书架显示
function updateBookshelfDisplay(books) {
  console.log('更新书架显示，书籍数量:', books.length);
  
  // 获取书架内容容器
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (!bookshelfContent) {
    console.error('书架内容容器未找到');
    return;
  }
  
  // 如果没有书籍，显示空提示
  if (!books || books.length === 0) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        您的书架还没有书籍
      </div>
    `;
    return;
  }
  
  // 生成书架卡片HTML
  let cardsHtml = '';
  books.forEach(book => {
    cardsHtml += generateBookshelfCard(book);
  });
  
  // 更新DOM
  bookshelfContent.innerHTML = `
    <div class="grid">
      ${cardsHtml}
    </div>
  `;
  
  // 添加事件监听器
  attachBookCardEventListeners();
}

// 生成书架卡片HTML
function generateBookshelfCard(bookData) {
  // 确保我们有正确的书籍数据结构
  const book = bookData.Book || bookData;
  const progress = bookData.progress || 0;
  const status = bookData.status || 'toRead';
  
  // 获取书籍信息
  const bookId = book.id || bookData.bookId || '';
  const title = book.title || '未知标题';
  const author = book.author || '未知作者';
  const cover = book.coverUrl || book.cover || '/images/default-cover.jpg';
  
  // 根据状态设置标签
  let statusLabel = '';
  let statusClass = '';
  
  if (status === 'reading') {
    statusLabel = '阅读中';
    statusClass = 'bg-blue-500';
  } else if (status === 'completed' || status === 'finished') {
    statusLabel = '已完成';
    statusClass = 'bg-green-500';
  } else {
    statusLabel = '未读';
    statusClass = 'bg-gray-500';
  }
  
  // 生成进度条HTML
  const progressHtml = `
    <div class="progress-bar mt-2">
      <div class="progress-bar-inner" style="width: ${progress}%"></div>
    </div>
    <div class="text-xs text-right mt-1">${progress}%</div>
  `;
  
  // 返回卡片HTML
  return `
    <div class="book-card" data-book-id="${bookId}">
      <div class="book-card-inner">
        <div class="book-cover">
          <img src="${cover}" alt="${title}" onerror="this.src='/images/default-cover.jpg'">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="book-info">
          <h3 class="book-title">${title}</h3>
          <p class="book-author">${author}</p>
          ${status === 'reading' ? progressHtml : ''}
        </div>
        <div class="book-actions">
          <button class="action-btn view-btn" data-book-id="${bookId}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn remove-btn" data-book-id="${bookId}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// 添加书架卡片事件监听器
function attachBookCardEventListeners() {
  // 查看书籍按钮
  const viewButtons = document.querySelectorAll('.view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bookId = btn.getAttribute('data-book-id');
      if (bookId) {
        window.location.href = `/book-detail.html?id=${bookId}`;
      }
    });
  });
  
  // 移除书籍按钮
  const removeButtons = document.querySelectorAll('.remove-btn');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const bookId = btn.getAttribute('data-book-id');
      if (bookId && confirm('确定要从书架中移除这本书吗？')) {
        try {
          await bookshelfApi.removeFromBookshelf(bookId);
          showToast('书籍已从书架中移除', 'success');
          
          // 重新加载书架数据
          const bookshelfData = await loadUserBookshelf();
          if (bookshelfData) {
            currentBookshelfData = bookshelfData;
            updateBookshelfDisplay(currentBookshelfData);
            updateBookshelfStats(currentBookshelfData);
          }
        } catch (error) {
          console.error('移除书籍失败:', error);
          showToast('移除书籍失败，请稍后再试', 'error');
        }
      }
    });
  });
}

// 应用筛选函数（供HTML内联事件调用）
async function applyFilter() {
  console.log('应用筛选函数被调用');
  // 获取选中的筛选条件
  const checkedFilters = document.querySelectorAll('input[name="filter-status"]:checked');
  const statusFilters = Array.from(checkedFilters).map(input => input.value);
  console.log('选中的筛选条件:', statusFilters);
  
  // 更新当前筛选条件
  currentFilter = statusFilters.length > 0 ? statusFilters[0] : 'all';
  console.log('更新后的筛选条件:', currentFilter);
  
  try {
    // 显示加载状态
    const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
    if (bookshelfContent) {
      bookshelfContent.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
      `;
    }
    
    // 调用API获取筛选后的书架数据
    let status = null;
    if (currentFilter === 'reading') {
      status = 'reading';
    } else if (currentFilter === 'finished') {
      status = 'completed';
    } else if (currentFilter === 'unread') {
      status = 'toRead';
    }
    
    // 如果有筛选条件，则调用API
    let bookshelfData;
    if (status) {
      bookshelfData = await bookshelfApi.getBookshelf(status);
    } else {
      bookshelfData = await bookshelfApi.getBookshelf();
    }
    
    // 更新当前书架数据 - 确保正确处理API响应结构
    if (bookshelfData && bookshelfData.data && bookshelfData.data.bookshelf) {
      currentBookshelfData = bookshelfData.data.bookshelf;
    } else if (bookshelfData && bookshelfData.bookshelf) {
      currentBookshelfData = bookshelfData.bookshelf;
    } else if (Array.isArray(bookshelfData)) {
      currentBookshelfData = bookshelfData;
    } else {
      currentBookshelfData = [];
    }
    
    console.log('筛选后的书架数据:', currentBookshelfData);
    
    // 应用排序
    applyFiltersAndSort();
    
  } catch (error) {
    console.error('获取筛选书架数据失败:', error);
    showToast('筛选失败，请稍后再试', 'error');
  }
  
  // 隐藏下拉菜单
  const filterMenu = document.getElementById('filter-menu');
  if (filterMenu) filterMenu.classList.remove('show');
}

// 应用排序函数（供HTML内联事件调用）
async function applySorting(sortValue) {
  console.log('应用排序函数被调用:', sortValue);
  
  // 更新当前排序方式
  currentSort = sortValue;
  console.log('更新后的排序方式:', currentSort);
  
  try {
    // 显示加载状态
    const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
    if (bookshelfContent) {
      bookshelfContent.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
      `;
    }
    
    // 将排序方式转换为API参数
    let sort, order;
    
    if (currentSort === 'date-desc') {
      sort = 'addedAt';
      order = 'desc';
    } else if (currentSort === 'date-asc') {
      sort = 'addedAt';
      order = 'asc';
    } else if (currentSort === 'title-asc') {
      sort = 'title';
      order = 'asc';
    } else if (currentSort === 'title-desc') {
      sort = 'title';
      order = 'desc';
    } else if (currentSort === 'progress') {
      sort = 'progress';
      order = 'desc';
    }
    
    // 调用API获取排序后的书架数据
    const bookshelfData = await bookshelfApi.getBookshelf(null, sort, order);
    
    // 更新当前书架数据 - 确保正确处理API响应结构
    if (bookshelfData && bookshelfData.data && bookshelfData.data.bookshelf) {
      currentBookshelfData = bookshelfData.data.bookshelf;
    } else if (bookshelfData && bookshelfData.bookshelf) {
      currentBookshelfData = bookshelfData.bookshelf;
    } else if (Array.isArray(bookshelfData)) {
      currentBookshelfData = bookshelfData;
    } else {
      currentBookshelfData = [];
    }
    
    console.log('排序后的书架数据:', currentBookshelfData);
    
    // 应用筛选和排序
    applyFiltersAndSort();
    
  } catch (error) {
    console.error('获取排序书架数据失败:', error);
    showToast('排序失败，请稍后再试', 'error');
  }
  
  // 隐藏下拉菜单
  const sortMenu = document.getElementById('sort-menu');
  if (sortMenu) sortMenu.classList.remove('show');
}

// 加载用户书架数据
async function loadUserBookshelf() {
  if (!isLoggedIn()) {
    console.log('用户未登录，无法加载书架');
    return null;
  }
  
  try {
    console.log('开始加载用户书架数据');
    const bookshelfData = await bookshelfApi.getBookshelf();
    console.log('书架数据加载成功:', bookshelfData);
    
    // 处理不同的API响应结构
    if (bookshelfData && bookshelfData.data && bookshelfData.data.bookshelf) {
      return bookshelfData.data.bookshelf;
    } else if (bookshelfData && bookshelfData.bookshelf) {
      return bookshelfData.bookshelf;
    } else if (Array.isArray(bookshelfData)) {
      return bookshelfData;
    }
    
    return [];
  } catch (error) {
    console.error('加载用户书架数据失败:', error);
    showToast('加载书架失败，请稍后再试', 'error');
    return null;
  }
}

// 导出函数
export {
  initFilterDropdown,
  initSortDropdown,
  initAddBookButton,
  initCategoryTabs,
  applyFiltersAndSort
}; 