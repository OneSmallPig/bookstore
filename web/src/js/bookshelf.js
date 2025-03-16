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
  
  // 初始化页面功能
  console.log('初始化页面功能');
  
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
  window.performBookshelfSearch = performBookshelfSearch;
  
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
    console.error('搜索元素未找到:', { searchInput, searchButton });
    return;
  }
  
  console.log('初始化搜索功能');
  
  // 移除可能存在的旧事件监听器
  const newSearchButton = searchButton.cloneNode(true);
  searchButton.parentNode.replaceChild(newSearchButton, searchButton);
  
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  
  // 搜索函数
  function searchBooks() {
    const query = newSearchInput.value.trim();
    console.log('执行搜索，关键词:', query);
    
    if (query) {
      performBookshelfSearch(query);
    } else {
      // 如果搜索框为空，显示所有书籍
      applyFiltersAndSort();
    }
  }
  
  // 搜索按钮点击事件
  newSearchButton.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('搜索按钮被点击');
    searchBooks();
  });
  
  // 输入框回车事件
  newSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      console.log('搜索框回车键被按下');
      e.preventDefault();
      searchBooks();
    }
  });
  
  // 添加输入框变化事件（用于实时搜索）
  newSearchInput.addEventListener('input', () => {
    // 使用防抖函数避免频繁搜索
    clearTimeout(newSearchInput.debounceTimer);
    if (newSearchInput.value.trim() === '') {
      // 如果输入框为空，恢复显示所有书籍
      applyFiltersAndSort();
    } else {
      // 延迟搜索，避免每次按键都触发
      newSearchInput.debounceTimer = setTimeout(() => {
        if (newSearchInput.value.trim().length >= 2) { // 至少输入2个字符才搜索
          searchBooks();
        }
      }, 500);
    }
  });
  
  // 将搜索函数添加到window对象，以便可以从HTML中调用
  window.performSearch = searchBooks;
}

// 应用筛选和排序
function applyFiltersAndSort() {
  console.log('应用筛选和排序');
  console.log('当前筛选条件:', currentFilter);
  console.log('当前排序方式:', currentSort);
  
  // 获取搜索框中的查询内容
  const searchQuery = document.getElementById('search-input')?.value.trim() || '';
  
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
      }
      
      console.log('获取到的书籍数量:', books.length);
      
      // 更新书架显示
      updateBookshelfDisplay(books, searchQuery);
      
      // 更新统计数据
      updateBookshelfStats(currentBookshelfData);
    })
    .catch(error => {
      console.error('获取书架书籍失败:', error);
      
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
  console.log('执行书架搜索，关键词:', query);
  
  if (!query) {
    console.log('搜索关键词为空，显示所有书籍');
    applyFiltersAndSort();
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
  }
  
  try {
    console.log('开始调用API搜索书架');
    // 调用API搜索书架，使用新的接口
    const searchResult = await bookshelfApi.getBookshelfBooks({ query });
    console.log('搜索API返回结果:', searchResult);
    
    // 处理搜索结果
    let searchBooks = [];
    if (searchResult && searchResult.data && searchResult.data.bookshelf) {
      searchBooks = searchResult.data.bookshelf;
    } else if (searchResult && searchResult.bookshelf) {
      searchBooks = searchResult.bookshelf;
    } else if (Array.isArray(searchResult)) {
      searchBooks = searchResult;
    }
    
    console.log('处理后的搜索结果:', searchBooks);
    
    // 更新书架显示
    updateBookshelfDisplay(searchBooks, query);
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
    
    // 显示错误提示
    showToast('搜索失败，请稍后再试', 'error');
  }
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
  
  // 应用筛选和排序
  applyFiltersAndSort();
  
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
  
  // 应用筛选和排序
  applyFiltersAndSort();
  
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
    // 使用新的接口获取所有书架书籍
    const bookshelfData = await bookshelfApi.getBookshelfBooks();
    console.log('书架数据加载成功:', bookshelfData);
    
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
    
    window.currentBookshelfData = [];
    return [];
  } catch (error) {
    console.error('加载用户书架数据失败:', error);
    showToast('加载书架失败，请稍后再试', 'error');
    return null;
  }
}

// 更新书架显示
function updateBookshelfDisplay(books, searchQuery = '') {
  console.log('更新书架显示，书籍数量:', books.length, '搜索关键词:', searchQuery);
  
  // 获取书架内容容器
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (!bookshelfContent) {
    console.error('书架内容容器未找到');
    return;
  }
  
  // 获取或创建书籍容器
  let booksContainer = bookshelfContent.querySelector('.grid');
  if (!booksContainer) {
    console.log('创建新的书籍容器');
    booksContainer = document.createElement('div');
    booksContainer.className = 'grid';
    bookshelfContent.appendChild(booksContainer);
  }
  
  // 清空容器
  booksContainer.innerHTML = '';
  
  // 如果没有书籍，显示空状态
  if (!books || books.length === 0) {
    console.log('没有书籍可显示');
    
    if (searchQuery) {
      // 如果是搜索结果为空
      booksContainer.innerHTML = `
        <div class="col-span-full text-center py-8">
          <div class="text-gray-500 mb-4">
            <i class="fas fa-search fa-3x mb-3"></i>
            <p class="text-xl font-medium">没有找到匹配 "${searchQuery}" 的书籍</p>
          </div>
          <button id="clear-search-btn" class="bg-blue-500 text-white px-4 py-2 rounded-lg">
            <i class="fas fa-times mr-2"></i>清除搜索
          </button>
        </div>
      `;
      
      // 添加清除搜索按钮事件
      const clearSearchBtn = booksContainer.querySelector('#clear-search-btn');
      if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.value = '';
            applyFiltersAndSort();
          }
        });
      }
    } else {
      // 显示空书架状态
      const emptyState = document.getElementById('empty-state');
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
    }
    return;
  }
  
  // 隐藏空状态
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    emptyState.classList.add('hidden');
  }
  
  // 如果是搜索结果，显示搜索结果提示
  if (searchQuery) {
    const searchResultHeader = document.createElement('div');
    searchResultHeader.className = 'col-span-full mb-4 flex justify-between items-center';
    searchResultHeader.innerHTML = `
      <div class="text-gray-700">
        找到 <span class="font-medium">${books.length}</span> 本匹配 "${searchQuery}" 的书籍
      </div>
      <button id="clear-search-btn" class="text-blue-500 hover:text-blue-700">
        <i class="fas fa-times mr-1"></i>清除搜索
      </button>
    `;
    booksContainer.appendChild(searchResultHeader);
    
    // 添加清除搜索按钮事件
    const clearSearchBtn = searchResultHeader.querySelector('#clear-search-btn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.value = '';
          applyFiltersAndSort();
        }
      });
    }
  }
  
  // 添加书籍卡片
  books.forEach(book => {
    try {
      const bookCard = generateBookshelfCard(book);
      booksContainer.appendChild(bookCard);
    } catch (error) {
      console.error('生成书籍卡片失败:', error, book);
    }
  });
  
  // 添加书籍卡片事件监听器
  attachBookCardEventListeners();
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
    <div class="absolute top-4 right-4 flex space-x-2">
      <button class="text-gray-400 hover:text-gray-600 book-options-btn">
        <i class="fas fa-ellipsis-h"></i>
      </button>
    </div>
    
    <div class="flex flex-col items-center mb-4">
      <img src="${cover}" alt="${title}" class="book-cover w-32 h-48 mb-3 object-cover rounded">
      <div class="text-center">
        <h3 class="font-bold">${title}</h3>
        <p class="text-gray-600 text-sm">${author}</p>
      </div>
    </div>
    
    <div class="mt-2">
      <div class="flex justify-between text-sm text-gray-500 mb-1">
        <span>阅读进度</span>
        <span>${progress}%</span>
      </div>
      <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
        <div class="bg-blue-500 h-full" style="width: ${progress}%"></div>
      </div>
    </div>
    
    <div class="mt-4 flex justify-between items-center">
      <span class="inline-block ${statusClass} text-xs px-2 py-1 rounded-full">${statusLabel}</span>
      <button class="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded continue-reading-btn">
        ${status === 'reading' ? '继续阅读' : status === 'completed' ? '重新阅读' : '开始阅读'}
      </button>
    </div>
  `;
  
  return cardElement;
}

// 添加书架卡片事件监听器
function attachBookCardEventListeners() {
  // 继续阅读按钮
  const readingButtons = document.querySelectorAll('.continue-reading-btn');
  readingButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bookCard = btn.closest('.book-card');
      const bookId = bookCard ? bookCard.dataset.bookId : null;
      
      if (bookId) {
        // 跳转到阅读页面
        window.location.href = `reader.html?id=${bookId}`;
      }
    });
  });
  
  // 书籍选项按钮
  const optionsButtons = document.querySelectorAll('.book-options-btn');
  optionsButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookCard = btn.closest('.book-card');
      const bookId = bookCard ? bookCard.dataset.bookId : null;
      
      if (bookId) {
        // 显示选项菜单
        showBookOptionsMenu(btn, bookId);
      }
    });
  });
  
  // 书籍卡片点击
  const bookCards = document.querySelectorAll('.book-card');
  bookCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮，不处理
      if (e.target.closest('button')) return;
      
      const bookId = card.dataset.bookId;
      if (bookId) {
        // 跳转到书籍详情页
        window.location.href = `book-detail.html?id=${bookId}`;
      }
    });
  });
}

// 显示书籍选项菜单
function showBookOptionsMenu(button, bookId) {
  // 移除可能存在的旧菜单
  const oldMenu = document.getElementById('book-options-menu');
  if (oldMenu) oldMenu.remove();
  
  // 创建菜单
  const menu = document.createElement('div');
  menu.id = 'book-options-menu';
  menu.className = 'absolute right-0 top-8 bg-white shadow-lg rounded-lg z-50 w-40 py-1';
  menu.style.zIndex = '1000';
  
  // 菜单选项
  menu.innerHTML = `
    <a href="book-detail.html?id=${bookId}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
      <i class="fas fa-info-circle mr-2"></i>查看详情
    </a>
    <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 remove-book-btn">
      <i class="fas fa-trash mr-2"></i>从书架移除
    </button>
  `;
  
  // 添加到DOM
  button.parentNode.appendChild(menu);
  
  // 添加移除书籍事件
  const removeBtn = menu.querySelector('.remove-book-btn');
  removeBtn.addEventListener('click', async () => {
    if (confirm('确定要从书架中移除这本书吗？')) {
      try {
        await bookshelfApi.removeFromBookshelf(bookId);
        showToast('书籍已从书架移除', 'success');
        
        // 重新加载书架
        const bookshelfData = await loadUserBookshelf();
        if (bookshelfData) {
          currentBookshelfData = bookshelfData;
          applyFiltersAndSort();
        }
      } catch (error) {
        console.error('移除书籍失败:', error);
        showToast('移除失败，请稍后再试', 'error');
      }
    }
    menu.remove();
  });
  
  // 点击其他地方关闭菜单
  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target) && !button.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
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
  loadUserBookshelf,
  updateBookshelfDisplay,
  generateBookshelfCard,
  attachBookCardEventListeners,
  showBookOptionsMenu
}; 