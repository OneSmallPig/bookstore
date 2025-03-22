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

// 基础URL配置（用于部署在Vercel等平台）
const BASE_URL = getEnv('BASE_URL', isProd ? 'https://your-vercel-app.vercel.app' : 'http://localhost:3000');

// 统一配置对象
const config = {
  // 基础配置
  env: NODE_ENV,
  isProd,
  isDev,
  isTest,
  baseUrl: BASE_URL,
  port: parseNumber(getEnv('PORT', 3000), 3000),
  skipAuth: parseBool(getEnv('SKIP_AUTH', isDev.toString())),
  
  // 数据库配置
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: parseNumber(getEnv('DB_PORT', 3306), 3306),
    name: getEnv('DB_NAME', 'versatile_bookstore'),
    user: getEnv('DB_USER', 'root'),
    password: getEnv('DB_PASSWORD', ''),
    logging: parseBool(getEnv('DB_LOGGING', isDev.toString())),
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
  
  // API配置
  api: {
    rateLimit: parseNumber(getEnv('API_RATE_LIMIT', 100), 100),
    rateWindow: getEnv('API_RATE_WINDOW', '15m')
  },
  
  // 书源测试配置
  bookSourceTest: {
    concurrency: parseNumber(getEnv('BOOK_SOURCE_TEST_CONCURRENCY', 5), 5),
    timeout: parseNumber(getEnv('BOOK_SOURCE_TEST_TIMEOUT', 10000), 10000),
  },
  
  // 跨域配置
  cors: {
    origin: getEnv('CORS_ORIGIN', isProd ? '*' : 'http://localhost:5173'),
    credentials: true
  },
  
  // 日志配置
  logger: {
    level: getEnv('LOG_LEVEL', isDev ? 'debug' : 'info'),
    filePath: getEnv('LOG_FILE_PATH', './logs/app.log')
  },
  
  // OpenAI配置
  openai: {
    apiKey: getEnv('OPENAI_API_KEY', ''),
    baseUrl: getEnv('OPENAI_API_BASE_URL', 'https://api.openai.com/v1')
  },
  
  // DeepSeek配置
  deepseek: {
    apiKey: getEnv('DEEPSEEK_API_KEY', ''),
    baseUrl: getEnv('DEEPSEEK_API_BASE_URL', 'https://api.deepseek.com/v1')
  },
  
  // 火山引擎配置
  volc: {
    apiKey: getEnv('VOLC_API_KEY', '')
  },
  
  // 其他配置
  useMockData: parseBool(getEnv('USE_MOCK_DATA', 'false'))
};

module.exports = config; 