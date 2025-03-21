# 万能书屋部署指南

本文档详细说明了万能书屋项目的本地开发和Vercel部署流程。

## 目录结构

项目分为两个主要部分：
- `web/` - 前端项目（Vite + JavaScript）
- `server/` - 后端项目（Express + MySQL + MongoDB）

## 环境变量配置

### 前端环境变量

前端项目使用Vite的环境变量系统，配置文件位于：
- `web/.env.development` - 开发环境配置
- `web/.env.production` - 生产环境配置

关键环境变量：
- `VITE_API_BASE_URL` - API基础URL，生产环境留空（会自动使用相同域名）
- `VITE_FEATURE_*` - 功能开关
- `VITE_IMAGE_PROXY_*` - 图片代理配置
- `VITE_BOOK_SOURCE_*` - 书源相关配置

### 后端环境变量

后端项目使用dotenv管理环境变量，配置文件：
- `server/.env` - 开发环境配置
- `server/.env.production` - 生产环境配置（在Vercel部署时使用）

关键环境变量：
- `NODE_ENV` - 环境名称（development, production）
- `PORT` - 服务端口
- `MYSQL_*` - MySQL数据库配置
- `MONGODB_*` - MongoDB数据库配置
- `JWT_SECRET` - JWT密钥
- `API_RATE_LIMIT` - API速率限制
- `CORS_ORIGIN` - CORS配置
- `LOG_LEVEL` - 日志级别

## 本地开发

### 前端开发

```bash
cd web
npm install
npm run dev
```

前端将在 http://localhost:5173 上运行，API请求会自动代理到后端。

### 后端开发

```bash
cd server
npm install
npm run dev
```

后端将在 http://localhost:3000 上运行。

## Vercel部署

### 后端部署

1. 在Vercel创建新项目，选择导入从GitHub仓库
2. 设置根目录为 `server`
3. 构建命令保持默认：`npm run build`
4. 输出目录保持默认：`.`
5. 在环境变量部分，添加所有必要的环境变量（如数据库连接、API密钥等）
6. 点击"部署"

### 前端部署

1. 在Vercel创建新项目，选择导入从GitHub仓库
2. 设置根目录为 `web`
3. 构建命令：`npm run build`
4. 输出目录：`dist`
5. 添加环境变量`VERCEL_API_ENDPOINT`，设置为后端API的完整URL（如`https://api.yourdomain.com`）
6. 点击"部署"

## 数据库配置

### MySQL

本项目使用MySQL存储用户、书籍和书架数据。确保在部署前：
1. 创建数据库（默认名称：`versatile_bookstore`）
2. 正确配置数据库连接信息在环境变量中
3. 部署时，确保数据库可以从Vercel服务器访问（通常需要配置允许的IP地址）

### MongoDB

本项目使用MongoDB存储书源数据。确保：
1. 创建MongoDB数据库
2. 正确配置MongoDB连接信息在环境变量中
3. 如不需要MongoDB，可以设置`MONGODB_FAILOVER_ENABLED=true`来允许系统在无法连接MongoDB时继续运行

## 配置管理

项目使用统一的配置管理模式：
- 前端：`web/src/js/config.js`
- 后端：`server/src/config/config.js`

两者都会自动适应不同的部署环境。

## 常见问题

### 跨域问题
如果遇到CORS错误，确保已在后端`.env`文件的`CORS_ORIGIN`变量中设置了正确的前端域名。

### 数据库连接失败
检查数据库连接字符串是否正确，以及数据库服务器是否允许来自Vercel的连接。

### 部署后无法正常工作
检查Vercel日志以查看详细错误信息。通常问题可能是环境变量配置错误或数据库连接问题。 