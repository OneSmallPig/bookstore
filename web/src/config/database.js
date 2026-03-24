// 数据库配置
const env = import.meta.env;

const sharedConfig = {
  dialect: 'mysql',
  port: Number(env.VITE_DB_PORT || 3306),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
};

export const dbConfig = {
  development: {
    username: env.VITE_DB_USER || '',
    password: env.VITE_DB_PASSWORD || '',
    database: env.VITE_DB_NAME || '',
    host: env.VITE_DB_HOST || '',
    ...sharedConfig
  },
  test: {
    username: env.VITE_DB_USER || '',
    password: env.VITE_DB_PASSWORD || '',
    database: env.VITE_DB_TEST_NAME || env.VITE_DB_NAME || '',
    host: env.VITE_DB_HOST || '',
    ...sharedConfig
  },
  production: {
    username: env.VITE_DB_USER || '',
    password: env.VITE_DB_PASSWORD || '',
    database: env.VITE_DB_NAME || '',
    host: env.VITE_DB_HOST || '',
    ...sharedConfig
  }
};
