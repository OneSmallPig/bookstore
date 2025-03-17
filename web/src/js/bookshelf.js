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
  // 首先将关键函数添加到window对象，确保它们在整个页面中可用
  window.performBookshelfSearch = performBookshelfSearch;
  window.applyFilter = applyFilter;
  window.applySorting = applySorting;
  window.showAddBookDialog = showAddBookDialog;

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
    const bookshelfData = await loadUserBookshelf();
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
  
  // 移除可能存在的旧事件监听器
  const newFilterBtn = filterBtn.cloneNode(true);
  filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);
  
  // 点击筛选按钮显示/隐藏下拉菜单
  newFilterBtn.onclick = function(e) {
    e.stopPropagation(); // 阻止事件冒泡
    filterMenu.classList.toggle('show');
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
  
  // 移除可能存在的旧事件监听器
  const newSortBtn = sortBtn.cloneNode(true);
  sortBtn.parentNode.replaceChild(newSortBtn, sortBtn);
  
  // 点击排序按钮显示/隐藏下拉菜单
  newSortBtn.onclick = function(e) {
    e.stopPropagation(); // 阻止事件冒泡
    sortMenu.classList.toggle('show');
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
    // 跳转到智能搜索页面，使用相对路径
    window.location.href = '../pages/search.html';
  });
  
  // 同样修改空书架状态下的添加书籍按钮
  const emptyStateAddBtn = document.getElementById('add-book-btn-empty');
  if (emptyStateAddBtn) {
    emptyStateAddBtn.addEventListener('click', () => {
      // 跳转到智能搜索页面，使用相对路径
      window.location.href = '../pages/search.html';
    });
  }
  
  // 修改空状态下的添加第一本书按钮
  const addFirstBookBtn = document.getElementById('add-first-book-btn');
  if (addFirstBookBtn) {
    addFirstBookBtn.addEventListener('click', () => {
      // 跳转到智能搜索页面，使用相对路径
      window.location.href = '../pages/search.html';
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
            const newBookshelfData = await loadUserBookshelf();
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
async function loadUserBookshelf() {
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
  // 确保books是数组
  if (!Array.isArray(books)) {
    console.error('updateBookshelfDisplay: books不是数组', books);
    books = [];
  }
  
  // 获取书架内容容器
  const bookshelfContent = document.querySelector('.category-content[data-category="all"]');
  if (!bookshelfContent) {
    console.error('书架内容容器未找到 (.category-content[data-category="all"])');
    return;
  }
  
  // 清除任何加载状态或之前的内容
  bookshelfContent.innerHTML = '';
  
  // 获取或创建书籍容器
  let booksContainer = document.createElement('div');
  booksContainer.className = 'grid'; // 使用HTML中定义的grid类，不添加额外的grid-cols类
  bookshelfContent.appendChild(booksContainer);
  
  // 如果没有书籍，显示空状态
  if (!books || books.length === 0) {
    if (searchQuery) {
      // 如果是搜索结果为空
      booksContainer.innerHTML = `
        <div class="w-full text-center py-8">
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
      booksContainer.innerHTML = `
        <div class="w-full text-center py-8">
          <div class="text-gray-500 mb-4">
            <i class="fas fa-book-open fa-3x mb-3"></i>
            <p class="text-xl font-medium">您的书架还没有书籍</p>
          </div>
          <button id="add-book-btn-empty" class="bg-blue-500 text-white px-4 py-2 rounded-lg">
            <i class="fas fa-plus mr-2"></i>添加书籍
          </button>
        </div>
      `;
      
      // 添加添加书籍按钮事件
      const addBookBtn = booksContainer.querySelector('#add-book-btn-empty');
      if (addBookBtn) {
        addBookBtn.addEventListener('click', () => {
          showAddBookDialog();
        });
      }
    }
    return;
  }
  
  // 如果是搜索结果，显示搜索结果提示
  if (searchQuery) {
    const searchResultHeader = document.createElement('div');
    searchResultHeader.className = 'w-full mb-4 flex justify-between items-center';
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
  books.forEach((book, index) => {
    const bookCard = generateBookshelfCard(book);
    booksContainer.appendChild(bookCard);
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
  
  // 书籍选项按钮
  const optionsButtons = document.querySelectorAll('.book-options-btn');
  
  optionsButtons.forEach((btn, index) => {
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
  
  bookCards.forEach((card, index) => {
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮，不处理
      if (e.target.closest('button')) {
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

// 显示用户书架
function displayBookshelf(bookshelfData) {
  // 确保我们正确处理bookshelf数据
  const books = bookshelfData.bookshelf || bookshelfData || [];
  
  // 使用updateBookshelfDisplay函数来保持一致的布局
  updateBookshelfDisplay(books);
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