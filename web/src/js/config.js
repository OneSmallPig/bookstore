/**
 * 前端统一配置文件
 * 自动检测环境并应用相应配置
 */

const env = import.meta.env;

const parseBool = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1' || value === true;
};

const parseNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

// 环境检测
const isProduction = env.PROD;
const isDevelopment = !isProduction;

// 获取当前基础URL
const getCurrentBaseUrl = () => {
  if (env.VITE_API_BASE_URL) {
    return env.VITE_API_BASE_URL;
  }

  return '/api';
};

// 缓存键值
const CACHE_KEYS = {
  AUTH_TOKEN: env.VITE_STORAGE_AUTH_TOKEN_KEY || 'bookstore_auth',
  HOMEPAGE_DATA: env.VITE_STORAGE_HOMEPAGE_DATA_KEY || 'bookstore_homepage_data',
  RECOMMENDED_BOOKS: env.VITE_STORAGE_RECOMMENDED_BOOKS_KEY || 'bookstore_recommended_books',
  POPULAR_BOOKS: env.VITE_STORAGE_POPULAR_BOOKS_KEY || 'bookstore_popular_books',
  POPULAR_SEARCHES: env.VITE_STORAGE_POPULAR_SEARCHES_KEY || 'bookstore_popular_searches',
  CACHE_TIMESTAMP: env.VITE_STORAGE_CACHE_TIMESTAMP_KEY || 'bookstore_cache_timestamp',
  USER_PREFERENCES: env.VITE_STORAGE_USER_PREFERENCES_KEY || 'bookstore_user_preferences',
  SEARCH_HISTORY: env.VITE_STORAGE_SEARCH_HISTORY_KEY || 'bookstore_search_history',
  USER_BOOKSHELF: env.VITE_STORAGE_USER_BOOKSHELF_KEY || 'bookstore_user_bookshelf',
  CACHED_TOKEN: env.VITE_STORAGE_CACHED_TOKEN_KEY || 'cachedToken'
};

const apiBaseUrl = getCurrentBaseUrl();
const imageProxyPath = env.VITE_IMAGE_PROXY_PATH || '/api/proxy/image?url=';
const configuredImageProxyUrl = env.VITE_IMAGE_PROXY_URL || imageProxyPath;

// 导出配置对象
const config = {
  // 环境信息
  env: env.MODE,
  isProduction,
  isDevelopment,
  
  // API配置
  api: {
    baseUrl: apiBaseUrl,
    timeout: parseNumber(env.VITE_API_TIMEOUT_MS, 40000),
    retries: parseNumber(env.VITE_API_RETRIES, 1),
  },
  
  // 缓存配置
  cache: {
    keys: CACHE_KEYS,
    duration: parseNumber(env.VITE_CACHE_DURATION_MS, 60 * 60 * 1000),
  },
  
  // 图片配置
  images: {
    fallbackCover: env.VITE_IMAGE_FALLBACK_COVER || '../images/default-cover.jpg',
    placeholderImage: env.VITE_IMAGE_PLACEHOLDER || '../images/placeholder.svg',
    proxyEnabled: parseBool(env.VITE_IMAGE_PROXY_ENABLED, true),
    proxyUrl: configuredImageProxyUrl
  },
  
  // 分页设置
  pagination: {
    defaultLimit: parseNumber(env.VITE_PAGINATION_DEFAULT_LIMIT, 20),
    maxLimit: parseNumber(env.VITE_PAGINATION_MAX_LIMIT, 100),
  },
  
  // 功能开关
  features: {
    offlineMode: parseBool(env.VITE_FEATURE_OFFLINE_MODE, false),
    darkMode: parseBool(env.VITE_FEATURE_DARK_MODE, false),
    aiRecommendations: parseBool(env.VITE_FEATURE_AI_RECOMMENDATIONS, true),
  },
  
  // 书源设置
  bookSource: {
    importBatchSize: parseNumber(env.VITE_BOOK_SOURCE_IMPORT_BATCH_SIZE, 10),
    maxSourcesToSearch: parseNumber(env.VITE_BOOK_SOURCE_MAX_SOURCES, 5),
  }
};

window.BOOKSTORE_CONFIG = config;

// 导出配置对象
export default config; 
