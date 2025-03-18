/**
 * 图片代理服务模块
 * 解决跨域图片加载问题，特别是针对豆瓣等有防盗链的图片源
 */

// 可用的图片代理服务列表
const PROXY_SERVICES = [
  // 这些是可以用于代理图片的公共服务
  'https://images.weserv.nl/?url=',
  'https://wsrv.nl/?url=',
];

// 当前使用的代理服务索引
let currentProxyIndex = 0;

/**
 * 获取代理后的图片URL
 * @param {string} originalUrl - 原始图片URL
 * @returns {string} - 代理后的URL
 */
function getProxiedImageUrl(originalUrl) {
  if (!originalUrl) return '';
  
  try {
    // 确保URL是完整的
    if (originalUrl.startsWith('//')) {
      originalUrl = 'https:' + originalUrl;
    }
    
    // 编码原始URL
    const encodedUrl = encodeURIComponent(originalUrl);
    
    // 使用当前选中的代理服务
    return PROXY_SERVICES[currentProxyIndex] + encodedUrl;
  } catch (error) {
    console.error('创建代理URL失败:', error);
    return originalUrl; // 出错时返回原始URL
  }
}

/**
 * 切换到下一个代理服务
 * 当一个代理服务不可用时，可以尝试切换到另一个
 */
function switchProxyService() {
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_SERVICES.length;
  console.log('切换到下一个图片代理服务:', PROXY_SERVICES[currentProxyIndex]);
}

/**
 * 处理图片加载错误，尝试使用代理服务重新加载
 * @param {HTMLImageElement} imgElement - 图片元素
 * @param {string} originalUrl - 原始图片URL
 * @param {number} retryCount - 重试次数计数
 */
function handleImageWithProxy(imgElement, originalUrl, retryCount = 0) {
  // 最大重试次数
  const MAX_RETRIES = PROXY_SERVICES.length;
  
  // 如果已经重试了所有代理服务，则放弃并使用占位符
  if (retryCount >= MAX_RETRIES) {
    console.warn('所有图片代理服务均失败，使用占位符显示');
    // 这里会调用homepage.js中定义的handleImageError函数
    if (typeof handleImageError === 'function') {
      handleImageError(imgElement);
    }
    return;
  }
  
  console.log(`尝试使用图片代理服务 #${retryCount + 1} 加载:`, originalUrl);
  
  // 切换代理服务（如果这不是第一次尝试）
  if (retryCount > 0) {
    switchProxyService();
  }
  
  // 获取代理URL
  const proxiedUrl = getProxiedImageUrl(originalUrl);
  
  // 保存原始URL
  if (!imgElement.dataset.originalSrc) {
    imgElement.dataset.originalSrc = originalUrl;
  }
  
  // 设置代理URL
  imgElement.src = proxiedUrl;
  
  // 处理加载错误
  imgElement.onerror = function() {
    console.warn(`代理服务 #${retryCount + 1} 加载失败:`, proxiedUrl);
    // 递归尝试下一个代理服务
    handleImageWithProxy(imgElement, originalUrl, retryCount + 1);
  };
  
  // 处理加载成功
  imgElement.onload = function() {
    console.log('图片通过代理服务成功加载:', proxiedUrl);
  };
}

// 导出模块函数
window.ImageProxy = {
  getProxiedImageUrl,
  switchProxyService,
  handleImageWithProxy
}; 