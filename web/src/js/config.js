/**
 * 前端统一配置文件
 * 自动检测环境并应用相应配置
 */

// 环境检测
const isProduction = window.location.hostname !== 'localhost' && 
                    !window.location.hostname.includes('127.0.0.1') &&
                    !window.location.hostname.includes('.local');
const isDevelopment = !isProduction;

// 获取当前基础URL
const getCurrentBaseUrl = () => {
  // 如果有显式定义的API基础URL环境变量，则使用它
  // 这在Vercel等平台上可以通过环境变量注入
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 生产环境中，尝试使用相同域名的API
  // 这假设你在Vercel上的API路由以/api开头
  if (isProduction) {
    return `${window.location.origin}/api`;
  }
  
  // 开发环境默认值
  return 'http://localhost:3000/api';
};

// 缓存键值
const CACHE_KEYS = {
  AUTH_TOKEN: 'bookstore_auth',
  RECOMMENDED_BOOKS: 'bookstore_recommended_books',
  POPULAR_BOOKS: 'bookstore_popular_books',
  POPULAR_SEARCHES: 'bookstore_popular_searches',
  CACHE_TIMESTAMP: 'bookstore_cache_timestamp',
  USER_PREFERENCES: 'bookstore_user_preferences',
  SEARCH_HISTORY: 'bookstore_search_history'
};

// 导出配置对象
const config = {
  // 环境信息
  env: isProduction ? 'production' : 'development',
  isProduction,
  isDevelopment,
  
  // API配置
  api: {
    baseUrl: getCurrentBaseUrl(),
    timeout: 40000, // 请求超时时间
    retries: 1,     // 失败重试次数
  },
  
  // 缓存配置
  cache: {
    keys: CACHE_KEYS,
    duration: 60 * 60 * 1000, // 缓存时间，默认1小时
  },
  
  // 图片配置
  images: {
    fallbackCover: '../images/default-cover.jpg',
    placeholderImage: '../images/placeholder.svg',
    proxyEnabled: true,
    proxyUrl: isProduction 
      ? `${window.location.origin}/api/proxy/image?url=` 
      : 'http://localhost:3000/api/proxy/image?url='
  },
  
  // 分页设置
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  
  // 功能开关
  features: {
    offlineMode: false,
    darkMode: false,
    aiRecommendations: true,
  },
  
  // 书源设置
  bookSource: {
    importBatchSize: 10,
    maxSourcesToSearch: 5,
  }
};

// 导出配置对象
export default config; 