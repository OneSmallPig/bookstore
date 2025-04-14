/**
 * ImageProxy 模块
 * 用于解决跨域图片加载问题，特别是豆瓣图片
 */

// 全局日志控制变量，默认不显示详细日志
window.APP_VERBOSE_LOGGING = window.APP_VERBOSE_LOGGING || false;

// 默认图片路径
const DEFAULT_IMAGE = '../images/default-cover.jpg';

// 用于追踪正在加载的URL，避免重复加载
const loadingUrls = new Set();

// 记录每个URL已经尝试的代理索引
const urlProxyIndexMap = new Map();

// 代理服务列表
const PROXY_SERVICES = [
  // 直接使用原始URL的函数（主要用于非跨域图片）
  (url) => url,
  // 使用自定义代理接口
  (url) => `/api/proxy/image?url=${encodeURIComponent(url)}`,
  // 使用免费代理服务
  (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
  // 备用代理服务
  (url) => `https://wsrv.nl/?url=${encodeURIComponent(url)}`
];

// 获取代理后的图片URL
function getProxiedImageUrl(originalUrl, proxyIndex) {
  if (proxyIndex >= PROXY_SERVICES.length) {
    return DEFAULT_IMAGE;
  }
  
  try {
    return PROXY_SERVICES[proxyIndex](originalUrl);
  } catch (error) {
    if (window.APP_VERBOSE_LOGGING) {
      console.error(`代理服务 #${proxyIndex} 处理URL时发生错误:`, error);
    }
    return DEFAULT_IMAGE;
  }
}

/**
 * 使用代理处理图片加载
 * @param {HTMLImageElement} imgElement - 图片元素
 * @param {string} originalUrl - 原始图片URL
 */
function handleImageWithProxy(imgElement, originalUrl) {
  // 检查是否已经加载过默认图片
  if (imgElement.dataset.defaultLoaded === 'true') {
    imgElement.onerror = null; // 防止无限循环
    return;
  }
  
  // 保存原始URL
  imgElement.dataset.originalSrc = originalUrl;
  
  // 检查URL是否正在处理中，避免重复处理
  const cacheKey = `${originalUrl}_${imgElement.id || Math.random()}`;
  if (loadingUrls.has(cacheKey)) {
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
    currentIndex = 1; // 从代理服务1开始
  }
  
  // 如果已经尝试过所有代理服务，使用默认图片
  if (currentIndex >= PROXY_SERVICES.length) {
    if (window.APP_VERBOSE_LOGGING) {
      console.log('已尝试所有代理服务，使用默认图片');
    }
    
    imgElement.dataset.defaultLoaded = 'true';
    imgElement.dataset.triedAllProxies = 'true';
    imgElement.src = DEFAULT_IMAGE;
    imgElement.onerror = null; // 防止无限循环
    loadingUrls.delete(cacheKey);
    return;
  }
  
  // 更新代理索引
  urlProxyIndexMap.set(originalUrl, currentIndex + 1);
  
  if (window.APP_VERBOSE_LOGGING) {
    console.log(`使用代理服务 #${currentIndex} 加载图片:`, originalUrl);
  }
  
  // 获取新的代理URL
  const proxiedUrl = getProxiedImageUrl(originalUrl, currentIndex);
  
  if (window.APP_VERBOSE_LOGGING) {
    console.log('代理后的URL:', proxiedUrl);
  }
  
  // 设置新的src前先移除事件处理器，避免触发错误事件
  imgElement.onerror = null;
  
  // 设置新的代理URL
  imgElement.src = proxiedUrl;
  
  // 处理加载错误 - 尝试下一个代理
  imgElement.onerror = function() {
    if (window.APP_VERBOSE_LOGGING) {
      console.log(`代理服务 #${currentIndex} 加载失败，尝试下一个`);
    }
    
    loadingUrls.delete(cacheKey);
    
    // 尝试下一个代理服务，递归调用
    handleImageWithProxy(imgElement, originalUrl);
  };
  
  // 处理加载成功
  imgElement.onload = function() {
    if (window.APP_VERBOSE_LOGGING) {
      console.log('图片成功加载:', proxiedUrl);
    }
    imgElement.onerror = null; // 清除错误处理器
    loadingUrls.delete(cacheKey);
    imgElement.dataset.processed = 'true'; // 标记图片已处理成功
  };
}

/**
 * 处理图片加载错误
 * @param {Event} event - 错误事件
 */
function handleImageError(event) {
  const imgElement = event.target;
  
  // 检查是否已经加载过默认图片
  if (imgElement.dataset.defaultLoaded === 'true') {
    imgElement.onerror = null; // 防止无限循环
    return;
  }
  
  // 获取原始URL
  const originalUrl = imgElement.dataset.originalSrc || imgElement.src;
  
  // 如果原始URL已经是默认图片，避免循环
  if (originalUrl.includes('default-cover') || originalUrl.includes('default-book-cover')) {
    imgElement.dataset.defaultLoaded = 'true';
    imgElement.onerror = null;
    return;
  }
  
  // 使用代理处理图片
  handleImageWithProxy(imgElement, originalUrl);
}

/**
 * 为指定选择器的所有图片应用代理
 * @param {string} selector - 图片选择器
 */
function applyImageProxy(selector = 'img[data-needs-proxy="true"]') {
  const images = document.querySelectorAll(selector);
  
  if (window.APP_VERBOSE_LOGGING) {
    console.log(`应用图片代理到 ${images.length} 张图片`);
  }
  
  images.forEach(img => {
    const originalUrl = img.dataset.originalSrc || img.src;
    
    // 如果图片还未加载或已加载失败，应用代理
    if (!img.complete || img.naturalWidth === 0) {
      handleImageWithProxy(img, originalUrl);
    } else {
      // 图片已成功加载，不需要代理
      img.dataset.processed = 'true';
    }
  });
}

// 将函数导出到全局作用域
window.ImageProxy = {
  getProxiedImageUrl,
  handleImageWithProxy,
  handleImageError,
  applyImageProxy
};

if (window.APP_VERBOSE_LOGGING) {
  console.log('ImageProxy模块已加载');
} 