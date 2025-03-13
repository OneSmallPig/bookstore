/**
 * BookCard.js
 * 书籍卡片组件，完全按照原型图设计实现
 */

// 导入必要的依赖
import { isLoggedIn } from '../auth.js';
import { showToast } from '../utils.js';
import { bookshelfApi } from '../api.js';

/**
 * 创建书籍卡片HTML
 * @param {Object} book - 书籍对象
 * @param {string} [tagType='推荐'] - 标签类型，如'推荐'、'AI推荐'等
 * @returns {string} 书籍卡片的HTML字符串
 */
export function createBookCard(book, tagType = '推荐') {
  // 处理rating可能为空的情况
  const rating = book.rating || 0;
  
  // 获取背景色
  const bgColor = getBgColorByCategory(book.categories);
  
  // 处理简介，增加字数限制
  const description = truncateText(book.description || '暂无简介', 100);
  
  // 保存完整简介用于浮窗显示
  const fullDescription = book.description || '暂无简介';
  
  // 获取封面图片URL，如果没有则使用默认图标
  const coverImage = book.coverImage || '';
  
  return `
    <div class="book-card-wrapper">
      <!-- 书籍卡片 -->
      <div class="book-card">
        <!-- 书籍封面 -->
        <div class="book-cover-container">
          <!-- 标签 -->
          <div class="book-tag">
            ${tagType.includes('AI') ? 'AI推荐' : tagType}
          </div>
          
          <!-- 书籍封面 -->
          <div class="book-cover" style="background-color: ${bgColor}">
            ${coverImage 
              ? `<img src="${coverImage}" alt="${book.title}" class="cover-image">` 
              : getIconByCategory(book.categories)}
          </div>
        </div>
        
        <!-- 书籍信息区域 -->
        <div class="book-info">
          <h4 class="info-title">${book.title}</h4>
          <p class="info-author">${book.author}</p>
          
          <!-- 评分星星 -->
          <div class="info-rating">
            ${generateStarRating(rating)}
            <span class="rating-value">${rating.toFixed(1)}</span>
          </div>
          
          <!-- 分类标签 -->
          <div class="info-categories">
            ${getCategoryLabels(book.categories)}
          </div>
        </div>
        
        <!-- 书籍简介 -->
        <div class="book-description" data-description="${encodeURIComponent(fullDescription)}" data-title="${encodeURIComponent(book.title)}">
          <p>${description}</p>
        </div>
        
        <!-- 操作按钮 -->
        <div class="book-actions">
          <button class="read-btn" data-book-id="${book.id}">阅读</button>
          <button class="add-btn" data-book-id="${book.id}">加入书架</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 截断文本
 * @param {string} text - 要截断的文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * 根据分类获取背景色
 */
function getBgColorByCategory(categories) {
  let mainCategory = getMainCategory(categories);
  
  const colorMap = {
    '人工智能': '#3B82F6', // 蓝色
    '计算机科学': '#3B82F6', // 蓝色
    '科幻': '#8B5CF6', // 紫色
    '未来学': '#8B5CF6', // 紫色
    '历史': '#F59E0B', // 琥珀色
    '人类学': '#F59E0B', // 琥珀色
    '心理学': '#22C55E', // 绿色
    '哲学': '#22C55E', // 绿色
    '文学': '#EF4444', // 红色
    '经济学': '#06B6D4', // 青色
    '默认': '#3B82F6' // 默认蓝色
  };
  
  return colorMap[mainCategory] || colorMap['默认'];
}

/**
 * 根据分类获取图标
 */
function getIconByCategory(categories) {
  let mainCategory = getMainCategory(categories);
  
  const iconMap = {
    '人工智能': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" width="60" height="60"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 0 19.5v-15A2.5 2.5 0 0 1 2.5 2h7z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 2.5 2.5h7a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 21.5 2h-7z"/></svg>',
    '计算机科学': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" width="60" height="60"><path d="M6 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M16 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M14.5 13.5l-4-3"/><path d="M18 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/><path d="M9.5 9L14 6"/></svg>',
    '历史': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" width="60" height="60"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    '未来学': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" width="60" height="60"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    '心理学': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" width="60" height="60"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 0 19.5v-15A2.5 2.5 0 0 1 2.5 2h7z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 2.5 2.5h7a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 21.5 2h-7z"/></svg>',
    '默认': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" width="60" height="60"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  };
  
  return iconMap[mainCategory] || iconMap['默认'];
}

/**
 * 获取主分类
 */
function getMainCategory(categories) {
  if (!categories) return '默认';
  
  if (Array.isArray(categories) && categories.length > 0) {
    return categories[0];
  } else if (typeof categories === 'string') {
    try {
      const parsedCategories = JSON.parse(categories);
      if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
        return parsedCategories[0];
      }
    } catch (e) {
      return categories;
    }
  }
  
  return '默认';
}

/**
 * 获取分类标签
 */
function getCategoryTags(categories) {
  if (!categories) return '';
  
  if (Array.isArray(categories) && categories.length > 0) {
    return categories.slice(0, 2).map(cat => `"${cat}"`).join(',');
  } else if (typeof categories === 'string') {
    try {
      const parsedCategories = JSON.parse(categories);
      if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
        return parsedCategories.slice(0, 2).map(cat => `"${cat}"`).join(',');
      }
    } catch (e) {
      return `"${categories}"`;
    }
  }
  
  return '';
}

/**
 * 获取分类标签（用于信息区域显示）
 */
function getCategoryLabels(categories) {
  if (!categories) return '';
  
  let categoryArray = [];
  
  if (Array.isArray(categories)) {
    categoryArray = categories.slice(0, 2);
  } else if (typeof categories === 'string') {
    try {
      const parsedCategories = JSON.parse(categories);
      if (Array.isArray(parsedCategories)) {
        categoryArray = parsedCategories.slice(0, 2);
      } else {
        categoryArray = [categories];
      }
    } catch (e) {
      categoryArray = [categories];
    }
  }
  
  return categoryArray.map(cat => `<span class="category-label">${cat}</span>`).join('');
}

/**
 * 生成星级评分HTML
 */
function generateStarRating(rating) {
  let starsHtml = '';
  
  for (let i = 1; i <= 5; i++) {
    const starClass = i <= rating ? 'star-filled' : 'star-empty';
    starsHtml += `<span class="${starClass}"></span>`;
  }
  
  return starsHtml;
}

/**
 * 添加书籍卡片事件监听器
 * @param {HTMLElement} container - 包含书籍卡片的容器元素
 */
export function addBookCardListeners(container) {
  if (!container) return;
  
  // 创建浮窗元素（如果不存在）
  let tooltip = document.getElementById('description-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'description-tooltip';
    tooltip.className = 'description-tooltip';
    document.body.appendChild(tooltip);
  }
  
  // 简介区域鼠标事件
  container.querySelectorAll('.book-description').forEach(descElement => {
    // 鼠标进入显示浮窗
    descElement.addEventListener('mouseenter', (e) => {
      const title = decodeURIComponent(descElement.getAttribute('data-title') || '');
      const fullDescription = decodeURIComponent(descElement.getAttribute('data-description') || '');
      
      // 设置浮窗内容
      tooltip.innerHTML = `
        <h4 class="font-bold text-lg mb-2">${title}</h4>
        <p>${fullDescription}</p>
      `;
      
      // 计算位置
      const rect = descElement.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top - 320}px`; // 显示在元素上方
      
      // 显示浮窗
      tooltip.classList.add('show');
    });
    
    // 鼠标离开隐藏浮窗
    descElement.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  });
  
  // 阅读按钮点击事件
  container.querySelectorAll('.read-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const bookId = button.getAttribute('data-book-id');
      window.location.href = `/src/pages/book-detail.html?id=${bookId}`;
    });
  });
  
  // 加入书架按钮点击事件
  container.querySelectorAll('.add-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 检查用户是否已登录
      if (!isLoggedIn()) {
        showLoginPrompt();
        return;
      }
      
      const bookId = button.getAttribute('data-book-id');
      try {
        // 显示加载状态
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        // 调用API添加到书架
        await bookshelfApi.addToBookshelf(bookId);
        
        // 显示成功消息
        showToast('书籍已添加到书架', 'success');
        
        // 恢复按钮状态
        button.innerHTML = '已加入书架';
        button.classList.add('added');
      } catch (error) {
        console.error('添加到书架失败:', error);
        showToast('添加到书架失败', 'error');
        
        // 恢复按钮状态
        button.innerHTML = '加入书架';
        button.disabled = false;
      }
    });
  });
  
  // 卡片点击事件（跳转到详情页）
  container.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
      const bookId = card.querySelector('.read-btn').getAttribute('data-book-id');
      window.location.href = `/src/pages/book-detail.html?id=${bookId}`;
    });
  });
}

// 显示登录提示
function showLoginPrompt() {
  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md mx-4">
      <h3 class="text-xl font-bold mb-4">需要登录</h3>
      <p class="mb-6">请先登录后再进行此操作</p>
      <div class="flex justify-end space-x-3">
        <button class="px-4 py-2 bg-gray-200 rounded-lg cancel-btn">取消</button>
        <a href="/src/pages/login.html" class="px-4 py-2 bg-blue-500 text-white rounded-lg">去登录</a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 添加取消按钮事件
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// 默认导出
export default {
  createBookCard,
  addBookCardListeners
}; 