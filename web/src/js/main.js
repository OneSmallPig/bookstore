// 导入样式
import '../css/styles.css';

// 导入API服务
import { userApi, bookApi, bookshelfApi, communityApi } from './api.js';

// 导入Alpine.js
import Alpine from 'alpinejs';

// 设置Alpine全局变量
window.Alpine = Alpine;

// 初始化Alpine
Alpine.start();

// 导航栏活跃链接处理
document.addEventListener('DOMContentLoaded', () => {
  // 获取当前页面路径
  const currentPath = window.location.pathname;
  
  // 获取所有导航链接
  const navLinks = document.querySelectorAll('.navbar-link');
  
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
  
  // 加载推荐书籍
  loadRecommendedBooks();
}

// 加载推荐书籍
async function loadRecommendedBooks() {
  try {
    // 调用API获取推荐书籍
    const books = await bookApi.getBooks({ limit: 6, sort: 'popular' });
    // 这里可以添加更新DOM的代码
  } catch (error) {
    console.error('加载推荐书籍失败:', error);
  }
}

// 书架页面初始化
function initBookshelfPage() {
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (bookshelfContainer) {
    loadUserBookshelf();
  }
}

// 加载用户书架
async function loadUserBookshelf() {
  try {
    // 检查用户是否登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 未登录，显示登录提示
      showLoginPrompt();
      return;
    }
    
    // 显示加载状态
    showLoadingState();
    
    // 调用API获取用户书架
    const bookshelf = await bookshelfApi.getBookshelf();
    displayBookshelf(bookshelf);
  } catch (error) {
    console.error('加载书架失败:', error);
    showErrorMessage('加载书架失败，请稍后再试');
  } finally {
    hideLoadingState();
  }
}

// 书籍详情页面初始化
function initBookDetailPage() {
  // 获取URL参数中的书籍ID或标题
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  const bookTitle = urlParams.get('title');
  
  if (bookId) {
    loadBookDetails(bookId);
  } else if (bookTitle) {
    // 通过标题搜索书籍
    searchBookByTitle(bookTitle);
  }
  
  // 添加到书架按钮
  const addToBookshelfBtn = document.querySelector('.add-to-bookshelf');
  if (addToBookshelfBtn) {
    addToBookshelfBtn.addEventListener('click', async () => {
      try {
        // 检查用户是否登录
        const token = localStorage.getItem('token');
        if (!token) {
          // 未登录，显示登录提示
          showLoginPrompt();
          return;
        }
        
        // 获取书籍ID
        const bookId = addToBookshelfBtn.dataset.bookId;
        if (!bookId) return;
        
        // 调用API添加到书架
        await bookshelfApi.addToBookshelf(bookId);
        showSuccessMessage('已添加到书架');
      } catch (error) {
        console.error('添加到书架失败:', error);
        showErrorMessage('添加到书架失败，请稍后再试');
      }
    });
  }
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
  // 创建登录提示元素
  const loginPrompt = document.createElement('div');
  loginPrompt.className = 'login-prompt';
  loginPrompt.innerHTML = `
    <div class="login-prompt-content">
      <h3>请先登录</h3>
      <p>您需要登录才能使用此功能</p>
      <div class="login-prompt-buttons">
        <button class="btn btn-primary login-btn">登录</button>
        <button class="btn btn-outline cancel-btn">取消</button>
      </div>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(loginPrompt);
  
  // 登录按钮点击事件
  const loginBtn = loginPrompt.querySelector('.login-btn');
  loginBtn.addEventListener('click', () => {
    window.location.href = '/src/pages/login.html';
    loginPrompt.remove();
  });
  
  // 取消按钮点击事件
  const cancelBtn = loginPrompt.querySelector('.cancel-btn');
  cancelBtn.addEventListener('click', () => {
    loginPrompt.remove();
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