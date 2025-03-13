/**
 * 通用工具函数
 */

/**
 * 显示一个临时的提示消息
 * @param {string} message 消息内容
 * @param {string} type 消息类型：'success', 'error', 'info', 'warning'
 * @param {number} duration 显示时长（毫秒）
 */
export function showToast(message, type = 'info', duration = 3000) {
  // 检查是否已存在toast容器
  let toastContainer = document.getElementById('toast-container');
  
  // 如果不存在，创建一个
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }
  
  // 创建toast元素
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.minWidth = '250px';
  toast.style.margin = '0 0 10px 0';
  toast.style.padding = '12px 16px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.animation = 'fadeIn 0.3s, fadeOut 0.3s ' + (duration / 1000 - 0.3) + 's';
  toast.style.opacity = '0';
  
  // 设置不同类型的样式
  switch (type) {
    case 'success':
      toast.style.backgroundColor = '#f0fff4';
      toast.style.borderLeft = '4px solid #38a169';
      toast.style.color = '#2f855a';
      toast.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>';
      break;
    case 'error':
      toast.style.backgroundColor = '#fff5f5';
      toast.style.borderLeft = '4px solid #e53e3e';
      toast.style.color = '#c53030';
      toast.innerHTML = '<i class="fas fa-times-circle" style="margin-right: 8px;"></i>';
      break;
    case 'warning':
      toast.style.backgroundColor = '#fffaf0';
      toast.style.borderLeft = '4px solid #dd6b20';
      toast.style.color = '#c05621';
      toast.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>';
      break;
    default: // info
      toast.style.backgroundColor = '#ebf8ff';
      toast.style.borderLeft = '4px solid #3182ce';
      toast.style.color = '#2b6cb0';
      toast.innerHTML = '<i class="fas fa-info-circle" style="margin-right: 8px;"></i>';
  }
  
  // 添加消息文本
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);
  
  // 添加关闭按钮
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '<i class="fas fa-times"></i>';
  closeButton.style.marginLeft = 'auto';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = 'inherit';
  closeButton.style.cursor = 'pointer';
  closeButton.style.opacity = '0.7';
  closeButton.style.padding = '0';
  closeButton.style.fontSize = '14px';
  closeButton.onclick = () => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };
  toast.appendChild(closeButton);
  
  // 添加动画样式
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // 添加到容器
  toastContainer.appendChild(toast);
  
  // 显示toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // 设置自动消失
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // 如果容器为空，移除容器
      if (toastContainer.children.length === 0) {
        document.body.removeChild(toastContainer);
      }
    }, 300);
  }, duration);
}

/**
 * 格式化日期
 * @param {Date|string|number} date 日期对象、日期字符串或时间戳
 * @param {string} format 格式化模板，如 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  
  // 转换为Date对象
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    console.error('无效的日期:', date);
    return '';
  }
  
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  
  // 补零函数
  const pad = (num) => (num < 10 ? '0' + num : num);
  
  // 替换格式
  return format
    .replace('YYYY', year)
    .replace('MM', pad(month))
    .replace('DD', pad(day))
    .replace('HH', pad(hours))
    .replace('mm', pad(minutes))
    .replace('ss', pad(seconds));
}

/**
 * 截断文本
 * @param {string} text 原始文本
 * @param {number} length 最大长度
 * @param {string} suffix 后缀，默认为'...'
 * @returns {string} 截断后的文本
 */
export function truncateText(text, length = 100, suffix = '...') {
  if (!text) return '';
  
  if (text.length <= length) {
    return text;
  }
  
  return text.substring(0, length) + suffix;
}

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间（毫秒）
 * @returns {Function} 防抖处理后的函数
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {number} limit 限制时间（毫秒）
 * @returns {Function} 节流处理后的函数
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 生成随机ID
 * @param {number} length ID长度
 * @returns {string} 随机ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 获取URL参数
 * @param {string} name 参数名
 * @returns {string|null} 参数值
 */
export function getUrlParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * 设置URL参数
 * @param {string} name 参数名
 * @param {string} value 参数值
 * @param {boolean} replace 是否替换当前历史记录
 */
export function setUrlParam(name, value, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

/**
 * 删除URL参数
 * @param {string} name 参数名
 * @param {boolean} replace 是否替换当前历史记录
 */
export function removeUrlParam(name, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

/**
 * 检查元素是否在视口中
 * @param {HTMLElement} element 要检查的元素
 * @param {number} offset 偏移量（像素）
 * @returns {boolean} 是否在视口中
 */
export function isInViewport(element, offset = 0) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 - offset &&
    rect.left >= 0 - offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
  );
}

/**
 * 平滑滚动到指定元素
 * @param {HTMLElement|string} element 目标元素或选择器
 * @param {number} offset 偏移量（像素）
 * @param {number} duration 动画持续时间（毫秒）
 */
export function scrollToElement(element, offset = 0, duration = 500) {
  // 获取目标元素
  const targetElement = typeof element === 'string' 
    ? document.querySelector(element) 
    : element;
  
  if (!targetElement) {
    console.error('目标元素不存在:', element);
    return;
  }
  
  const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime = null;
  
  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = ease(timeElapsed, startPosition, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  }
  
  // 缓动函数
  function ease(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  }
  
  requestAnimationFrame(animation);
}

// 导出默认对象
export default {
  showToast,
  formatDate,
  truncateText,
  debounce,
  throttle,
  generateId,
  getUrlParam,
  setUrlParam,
  removeUrlParam,
  isInViewport,
  scrollToElement
}; 