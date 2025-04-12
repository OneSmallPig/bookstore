/**
 * 图片代理服务模块
 * 解决跨域图片加载问题，特别是针对豆瓣等有防盗链的图片源
 */

import config from './config.js';

// 可用的图片代理服务列表
const PROXY_SERVICES = [
  // 直接尝试原始URL
  '',
  // 豆瓣专用代理服务（针对doubanio.com域名）- 使用正确的代理服务格式
  'https://images.weserv.nl/?url=',
  'https://wsrv.nl/?url=',
  // 备用无防盗链代理
  'https://cors-anywhere.herokuapp.com/',
  // 本地代理（确保路径正确）
  'http://localhost:3000/api/img-proxy?url=',  // 开发环境
  '/api/img-proxy?url=',  // 生产环境
  // 默认图片作为最后的备选
  '/images/default-book-cover.svg'
];

// 根据环境选择合适的API基础URL - 使用模块内私有变量避免全局冲突
const _proxyBaseUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1') 
  ? 'http://localhost:3000' 
  : '';

// 记录每个图片URL使用的代理服务索引
const urlProxyIndexMap = new Map();
// 记录正在加载的URL，避免重复处理
const loadingUrls = new Set();

// 默认图片路径
const DEFAULT_IMAGE = '../images/default-cover.jpg';

/**
 * 获取代理后的图片URL
 * @param {string} originalUrl - 原始图片URL
 * @param {number} proxyIndex - 代理服务索引
 * @returns {string} - 代理后的URL
 */
function getProxiedImageUrl(originalUrl, proxyIndex = 0) {
  if (!originalUrl) return DEFAULT_IMAGE;
  
  try {
    // 确保URL是完整的
    if (originalUrl.startsWith('//')) {
      originalUrl = 'https:' + originalUrl;
    }
    
    // 如果URL已经是相对路径的默认图片，直接返回
    if (originalUrl.includes('default-cover') || 
        originalUrl.includes('/images/')) {
      return originalUrl;
    }
    
    // 检查是否为豆瓣图片URLs
    const isDoubanImage = originalUrl.includes('doubanio.com') || 
                          originalUrl.includes('douban.com') || 
                          originalUrl.includes('img9.') ||
                          originalUrl.includes('img1.') || 
                          originalUrl.includes('img2.') || 
                          originalUrl.includes('img3.');
    
    // 如果是最后一个选项（默认图片），直接返回默认图片
    if (proxyIndex === PROXY_SERVICES.length - 1) {
      return PROXY_SERVICES[proxyIndex];
    }
    
    // 豆瓣图片特殊处理：永远不使用index 0（直接访问），强制使用代理
    if (isDoubanImage) {
      // 如果proxyIndex是0（直接URL），改为使用第一个代理
      if (proxyIndex === 0) {
        console.log('豆瓣图片强制使用代理服务，而不是直接URL');
        proxyIndex = 1;
      }
      
      // 使用images.weserv.nl或wsrv.nl处理豆瓣图片
      if (proxyIndex === 1 || proxyIndex === 2) {
        // 为处理https URLs，先移除协议部分
        const urlWithoutProtocol = originalUrl.replace(/^https?:\/\//, '');
        return `${PROXY_SERVICES[proxyIndex]}${encodeURIComponent(urlWithoutProtocol)}`;
      }
    }
    
    // 如果是第一个选项（空字符串）且不是豆瓣图片，直接返回原始URL
    if (proxyIndex === 0) {
      return originalUrl;
    }
    
    // 编码原始URL
    const encodedUrl = encodeURIComponent(originalUrl);
    
    // 获取当前代理服务URL
    let proxyUrl = PROXY_SERVICES[proxyIndex];
    
    // 如果是本地代理服务，根据环境添加基础URL
    if (proxyUrl.includes('localhost:3000')) {
      return proxyUrl + encodedUrl;
    } else if (proxyUrl.startsWith('/api/')) {
      return _proxyBaseUrl + proxyUrl + encodedUrl;
    }
    
    // 使用当前选中的代理服务
    return proxyUrl + encodedUrl;
  } catch (error) {
    console.error('创建代理URL失败:', error);
    return DEFAULT_IMAGE;
  }
}

/**
 * 处理图片加载错误，尝试使用代理服务重新加载
 * @param {HTMLImageElement} imgElement - 图片元素
 * @param {string} originalUrl - 原始图片URL
 */
function handleImageWithProxy(imgElement, originalUrl) {
  // 如果在书架页面，且图片已标记为处理过，直接返回
  if (window._isBookshelfPage && (imgElement.dataset.fallbackAttempted === 'true' || imgElement.dataset.processed === 'true')) {
    console.log('在书架页面，图片已处理过，跳过代理处理:', originalUrl);
    return;
  }

  // 检查URL是否正在处理中，避免重复处理
  const cacheKey = `${originalUrl}_${imgElement.id || Math.random()}`;
  if (loadingUrls.has(cacheKey)) {
    console.log('该图片URL已在处理中，跳过:', originalUrl);
    return;
  }
  
  loadingUrls.add(cacheKey);
  
  // 检查是否为豆瓣图片
  const isDoubanImage = imgElement.dataset.doubanImage === 'true' || 
                        originalUrl.includes('doubanio.com') || 
                        originalUrl.includes('douban.com') || 
                        originalUrl.includes('img9.') ||
                        originalUrl.includes('img1.') ||
                        originalUrl.includes('img2.') ||
                        originalUrl.includes('img3.');
  
  // 获取当前代理索引
  let currentIndex = urlProxyIndexMap.get(originalUrl) || 0;
  
  // 豆瓣图片强制从代理开始，跳过直接URL请求
  if (isDoubanImage && currentIndex === 0) {
    console.log('检测到豆瓣图片，跳过直接URL请求，直接使用代理服务:', originalUrl);
    currentIndex = 1; // 从代理服务1开始
  }
  
  // 如果已经尝试过所有代理服务，使用默认图片
  if (currentIndex >= PROXY_SERVICES.length - 1) {
    console.warn('所有图片代理服务均失败，使用默认图片:', originalUrl);
    imgElement.src = DEFAULT_IMAGE;
    imgElement.onerror = null; // 防止无限循环
    imgElement.dataset.fallbackAttempted = 'true'; // 标记已尝试过回退
    imgElement.dataset.processed = 'true'; // 标记已处理
    loadingUrls.delete(cacheKey);
    return;
  }
  
  // 更新代理索引
  urlProxyIndexMap.set(originalUrl, currentIndex);
  
  console.log(`使用代理服务 #${currentIndex} 加载图片:`, originalUrl);
  
  // 获取新的代理URL
  const proxiedUrl = getProxiedImageUrl(originalUrl, currentIndex);
  console.log('代理后的URL:', proxiedUrl);
  
  // 保存原始URL（如果还没有保存）
  if (!imgElement.dataset.originalSrc) {
    imgElement.dataset.originalSrc = originalUrl;
  }
  
  // 标记为豆瓣图片（如果是）
  if (isDoubanImage) {
    imgElement.dataset.doubanImage = 'true';
  }
  
  // 设置新的src前先移除事件处理器，避免触发错误事件
  imgElement.onerror = null;
  
  // 设置新的代理URL
  imgElement.src = proxiedUrl;
  
  // 处理加载错误 - 尝试下一个代理
  imgElement.onerror = function() {
    console.warn(`代理服务 #${currentIndex} 加载失败:`, proxiedUrl);
    
    // 延迟一下再尝试下一个代理，避免快速循环
    setTimeout(() => {
      loadingUrls.delete(cacheKey);
      
      // 准备尝试下一个代理
      const nextIndex = currentIndex + 1;
      urlProxyIndexMap.set(originalUrl, nextIndex);
      
      // 如果还有下一个代理可用，则尝试
      if (nextIndex < PROXY_SERVICES.length - 1) {
        // 在书架页面，限制尝试次数
        if (window._isBookshelfPage && nextIndex >= 3) {
          console.log('在书架页面，仅尝试有限次数代理后使用默认图片');
          imgElement.src = DEFAULT_IMAGE;
          imgElement.onerror = null;
          imgElement.dataset.fallbackAttempted = 'true';
          imgElement.dataset.processed = 'true';
          return;
        }
        
        handleImageWithProxy(imgElement, originalUrl);
      } else {
        // 所有代理都尝试过了，使用默认图片
        imgElement.src = DEFAULT_IMAGE;
        imgElement.onerror = null;
        imgElement.dataset.fallbackAttempted = 'true';
        imgElement.dataset.processed = 'true';
      }
    }, 300);
  };
  
  // 处理加载成功
  imgElement.onload = function() {
    console.log('图片成功加载:', proxiedUrl);
    imgElement.onerror = null; // 清除错误处理器
    urlProxyIndexMap.delete(originalUrl); // 清除代理索引记录
    loadingUrls.delete(cacheKey);
    imgElement.dataset.processed = 'true'; // 标记图片已处理成功
  };
}

/**
 * 重置特定URL的代理状态
 * @param {string} url - 需要重置的URL
 */
function resetProxyState(url) {
  urlProxyIndexMap.delete(url);
}

/**
 * 清除所有代理状态
 */
function clearProxyStates() {
  urlProxyIndexMap.clear();
  loadingUrls.clear();
}

/**
 * 处理图片加载错误
 * @param {Event} event - 错误事件
 */
function handleImageError(event) {
  const imgElement = event.target;
  if (imgElement && imgElement.src) {
    console.warn('图片加载失败:', imgElement.src);
    // 设置为默认图片
    imgElement.src = DEFAULT_IMAGE;
  }
}

/**
 * 应用图片代理到页面上的所有图片
 */
function applyImageProxy() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    // 保存原始URL
    const originalSrc = img.getAttribute('src');
    if (!originalSrc) return;
    
    // 设置代理URL
    img.src = getProxiedImageUrl(originalSrc);
    
    // 添加错误处理
    img.onerror = handleImageError;
  });
}

// 导出模块函数
window.ImageProxy = {
  getProxiedImageUrl,
  handleImageWithProxy,
  resetProxyState,
  clearProxyStates,
  handleImageError,
  applyImageProxy
}; 