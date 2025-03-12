// 数据库配置
export const dbConfig = {
  development: {
    username: 'root',
    password: 'Smallpig957172.',
    database: 'versatile_bookstore',
    host: '106.53.77.94',
    dialect: 'mysql',
    port: 3306,
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
  },
  test: {
    username: 'root',
    password: 'Smallpig957172.',
    database: 'versatile_bookstore_test',
    host: '106.53.77.94',
    dialect: 'mysql',
    port: 3306,
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  },
  production: {
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'Smallpig957172.',
    database: process.env.DB_DATABASE || 'versatile_bookstore',
    host: process.env.DB_HOST || '106.53.77.94',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
}; 