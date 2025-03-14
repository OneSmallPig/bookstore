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
  
  // 加载用户书架数据
  const bookshelfData = await loadUserBookshelf();
  if (bookshelfData) {
    currentBookshelfData = bookshelfData;
    console.log('书架数据已加载:', currentBookshelfData);
  } else {
    console.log('书架数据加载失败或用户未登录');
    currentBookshelfData = window.currentBookshelfData || [];
  }
  
  // 初始化过滤下拉菜单
  initFilterDropdown();
  
  // 初始化排序下拉菜单
  initSortDropdown();
  
  // 初始化添加书籍按钮
  initAddBookButton();
  
  // 初始化分类标签
  initCategoryTabs();
});

// 初始化筛选下拉菜单
function initFilterDropdown() {
  const filterBtn = document.getElementById('filter-btn');
  const filterMenu = document.getElementById('filter-menu');
  const applyFilterBtn = document.getElementById('apply-filter');
  
  if (!filterBtn || !filterMenu) return;
  
  // 点击筛选按钮显示/隐藏下拉菜单
  filterBtn.addEventListener('click', () => {
    filterMenu.classList.toggle('show');
    // 隐藏排序下拉菜单
    document.getElementById('sort-menu')?.classList.remove('show');
  });
  
  // 点击应用筛选按钮
  applyFilterBtn?.addEventListener('click', () => {
    // 获取选中的筛选条件
    const checkedFilters = document.querySelectorAll('input[name="filter-status"]:checked');
    const statusFilters = Array.from(checkedFilters).map(input => input.value);
    
    // 更新当前筛选条件
    currentFilter = statusFilters.length > 0 ? statusFilters[0] : 'all';
    
    // 应用筛选
    applyFiltersAndSort();
    
    // 隐藏下拉菜单
    filterMenu.classList.remove('show');
  });
  
  // 点击页面其他地方关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!filterBtn.contains(e.target) && !filterMenu.contains(e.target)) {
      filterMenu.classList.remove('show');
    }
  });
}

// 初始化排序下拉菜单
function initSortDropdown() {
  const sortBtn = document.getElementById('sort-btn');
  const sortMenu = document.getElementById('sort-menu');
  const sortOptions = document.querySelectorAll('.sort-option');
  
  if (!sortBtn || !sortMenu) return;
  
  // 点击排序按钮显示/隐藏下拉菜单
  sortBtn.addEventListener('click', () => {
    sortMenu.classList.toggle('show');
    // 隐藏筛选下拉菜单
    document.getElementById('filter-menu')?.classList.remove('show');
  });
  
  // 点击排序选项
  sortOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 获取排序方式
      const sortValue = option.getAttribute('data-sort');
      if (sortValue) {
        // 更新当前排序方式
        currentSort = sortValue;
        
        // 应用排序
        applyFiltersAndSort();
        
        // 隐藏下拉菜单
        sortMenu.classList.remove('show');
      }
    });
  });
  
  // 点击页面其他地方关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!sortBtn.contains(e.target) && !sortMenu.contains(e.target)) {
      sortMenu.classList.remove('show');
    }
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

// 应用筛选和排序
function applyFiltersAndSort() {
  // 获取当前书架数据
  const books = [...currentBookshelfData];
  
  // 如果没有书籍数据，尝试从页面获取
  if (books.length === 0) {
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
      const bookId = card.getAttribute('data-book-id');
      const title = card.querySelector('h3')?.textContent || '';
      const author = card.querySelector('p')?.textContent || '';
      const progressText = card.querySelector('.flex.justify-between span:last-child')?.textContent || '0%';
      const progress = parseInt(progressText) || 0;
      
      books.push({
        id: bookId,
        title,
        author,
        readingProgress: progress
      });
    });
    
    // 更新当前书架数据
    currentBookshelfData = books;
  }
  
  // 应用筛选
  let filteredBooks = books;
  
  if (currentFilter !== 'all') {
    if (currentFilter === 'reading') {
      filteredBooks = books.filter(book => book.readingProgress > 0 && book.readingProgress < 100);
    } else if (currentFilter === 'finished') {
      filteredBooks = books.filter(book => book.readingProgress === 100);
    } else if (currentFilter === 'unread') {
      filteredBooks = books.filter(book => book.readingProgress === 0);
    }
  }
  
  // 应用排序
  if (currentSort === 'date-desc') {
    // 默认排序，不做处理
  } else if (currentSort === 'date-asc') {
    filteredBooks.reverse();
  } else if (currentSort === 'title-asc') {
    filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
  } else if (currentSort === 'title-desc') {
    filteredBooks.sort((a, b) => b.title.localeCompare(a.title));
  } else if (currentSort === 'progress') {
    filteredBooks.sort((a, b) => b.readingProgress - a.readingProgress);
  }
  
  // 更新显示
  updateBookshelfDisplay(filteredBooks);
}

// 更新书架显示
function updateBookshelfDisplay(books) {
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (!bookshelfContent) return;
  
  console.log('更新书架显示，书籍数量:', books.length);
  
  // 检查书架数据
  if (!Array.isArray(books) || books.length === 0) {
    bookshelfContent.innerHTML = `
      <div class="text-center py-8">
        您的书架还没有书籍
      </div>
    `;
    return;
  }
  
  // 更新书架内容
  bookshelfContent.innerHTML = `
    <div class="grid">
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

// 生成书架卡片HTML
function generateBookshelfCard(book) {
  // 确保我们有正确的书籍ID
  const bookId = book.id || book.bookId || book.book_id || '';
  
  // 处理阅读进度
  const progress = book.readingProgress || 0;
  const statusClass = progress === 100 ? 'bg-green-100 text-green-800' : 
                      progress > 0 ? 'bg-blue-100 text-blue-800' : 
                      'bg-yellow-100 text-yellow-800';
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

// 导出函数
export {
  initFilterDropdown,
  initSortDropdown,
  initAddBookButton,
  initCategoryTabs,
  applyFiltersAndSort
}; 