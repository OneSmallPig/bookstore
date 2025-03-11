// 导入样式
import '../css/styles.css';

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
});

// 智能搜索功能模拟
const searchForm = document.querySelector('.search-form');
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchForm.querySelector('input').value.trim();
    if (query) {
      // 模拟搜索延迟
      showLoadingState();
      setTimeout(() => {
        window.location.href = `/src/pages/search.html?q=${encodeURIComponent(query)}`;
      }, 1000);
    }
  });
}

// 显示加载状态
function showLoadingState() {
  const searchButton = document.querySelector('.search-button');
  if (searchButton) {
    const originalText = searchButton.innerHTML;
    searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 搜索中...';
    searchButton.disabled = true;
    
    // 恢复按钮状态
    setTimeout(() => {
      searchButton.innerHTML = originalText;
      searchButton.disabled = false;
    }, 1000);
  }
}

// 书籍卡片点击事件
const bookCards = document.querySelectorAll('.card');
bookCards.forEach(card => {
  card.addEventListener('click', () => {
    const bookTitle = card.querySelector('h3')?.textContent || '未知书籍';
    window.location.href = `/src/pages/book-detail.html?title=${encodeURIComponent(bookTitle)}`;
  });
});

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