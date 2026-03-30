/**
 * 统一配置文件
 * 用于管理所有服务配置，支持不同环境
 */
require('dotenv').config();

// 环境变量处理函数
const getEnv = (key, defaultValue = undefined) => {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
};

// 解析布尔值
const parseBool = (value) => {
  return value === 'true' || value === true || value === '1' || value === 1;
};

// 解析数字
const parseNumber = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// 环境设置
const NODE_ENV = getEnv('NODE_ENV', 'development');
const isProd = NODE_ENV === 'production';
const isDev = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

// 统一配置对象
const config = {
  // 基础配置
  env: NODE_ENV,
  isProd,
  isDev,
  isTest,
  app: {
    baseUrl: getEnv('BASE_URL', isProd ? '' : 'http://localhost:3001'),
    port: parseNumber(getEnv('PORT', 3001), 3001),
    bodyLimit: getEnv('BODY_LIMIT', '20mb')
  },
  
  // 数据库配置
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: parseNumber(getEnv('DB_PORT', 3306), 3306),
    name: getEnv('DB_NAME', 'versatile_bookstore'),
    user: getEnv('DB_USER', 'root'),
    password: getEnv('DB_PASSWORD', ''),
    logging: parseBool(getEnv('DB_LOGGING', isDev.toString())),
    syncAlter: parseBool(getEnv('DB_SYNC_ALTER', isDev.toString())),
  },
  
  // MongoDB配置
  mongodb: {
    uri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/bookstore'),
    allowFailover: parseBool(getEnv('ALLOW_MONGODB_FAILOVER', 'true')),
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    }
  },
  
  // JWT配置
  jwt: {
    secret: getEnv('JWT_SECRET', 'your-default-secret-key-for-development-only'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '7d')
  },

  auth: {
    skip: parseBool(getEnv('SKIP_AUTH', isDev.toString())),
    testToken: getEnv('AUTH_TEST_TOKEN', 'test-token')
  },
  
  // API配置
  api: {
    rateLimit: parseNumber(getEnv('API_RATE_LIMIT', 100), 100),
    rateWindow: parseNumber(getEnv('API_RATE_WINDOW_MS', 15 * 60 * 1000), 15 * 60 * 1000),
    timeout: parseNumber(getEnv('API_TIMEOUT_MS', 30000), 30000)
  },
  
  // 书源测试配置
  bookSourceTest: {
    concurrency: parseNumber(getEnv('BOOK_SOURCE_TEST_CONCURRENCY', 5), 5),
    timeout: parseNumber(getEnv('BOOK_SOURCE_TEST_TIMEOUT', 10000), 10000),
  },
  
  // 跨域配置
  cors: {
    origin: getEnv('CORS_ORIGIN', isProd ? '*' : 'http://localhost:3000'),
    credentials: true
  },
  
  // 日志配置
  logger: {
    level: getEnv('LOG_LEVEL', isDev ? 'debug' : 'info'),
    filePath: getEnv('LOG_FILE_PATH', './logs/app.log')
  },
  
  ai: {
    provider: getEnv('AI_PROVIDER', 'qwen'),
    apiKey: getEnv('AI_API_KEY', getEnv('DASHSCOPE_API_KEY', '')),
    baseUrl: getEnv('AI_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
    chatPath: getEnv('AI_CHAT_PATH', '/chat/completions'),
    modelId: getEnv('AI_MODEL_ID', 'qwen-plus'),
    useMockData: parseBool(getEnv('USE_MOCK_DATA', 'false')),
    disableProxy: parseBool(getEnv('AI_DISABLE_PROXY', 'true')),
    debugMode: parseBool(getEnv('DEBUG_MODE', 'false')),
    timeout: parseNumber(getEnv('AI_TIMEOUT_MS', 180000), 180000),
    requestTimeout: parseNumber(getEnv('AI_REQUEST_TIMEOUT_MS', 30000), 30000),
  },
  
  // 其他配置
  useMockData: parseBool(getEnv('USE_MOCK_DATA', 'false'))
};

config.ai.apiUrl = getEnv(
  'AI_API_URL',
  `${config.ai.baseUrl.replace(/\/$/, '')}${config.ai.chatPath.startsWith('/') ? config.ai.chatPath : `/${config.ai.chatPath}`}`
);
config.ai.model = config.ai.modelId;

config.baseUrl = config.app.baseUrl;
config.port = config.app.port;
config.skipAuth = config.auth.skip;

module.exports = config;
