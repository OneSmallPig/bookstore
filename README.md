# 百变书屋

百变书屋是一个前后端分离的在线阅读与图书推荐项目，当前包含：

- 前端站点：Vite + 原生 HTML/CSS/JavaScript
- 后端服务：Node.js + Express
- 数据存储：MySQL
- AI 接入：OpenAI 兼容接口，当前默认配置为阿里云百炼 DashScope 的 Qwen
- 书源管理：JSON 书源导入、测试与管理

## 当前目录

```text
BookStore/
├── web/                     # 前端项目
├── server/                  # 后端项目
├── API_DOCUMENTATION.md     # API 文档
├── DEVELOPMENT_GUIDE.md     # 开发与配置说明
└── DEPLOYMENT.md            # 部署说明
```

## 本地启动

### 1. 启动后端

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

默认监听：`http://localhost:3001`

### 2. 启动前端

```bash
cd web
npm install
npm run dev
```

默认访问：`http://localhost:3000`

前端开发服务器会把 `/api` 代理到后端。

## 配置入口

### 后端

- 环境变量文件：`server/.env`
- 配置汇总：`server/src/config/config.js`

主要配置项：

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL_ID`

### 前端

- 开发环境：`web/.env.development`
- 生产环境：`web/.env.production`
- 运行时配置：`web/src/js/config.js`
- Vite 开发配置：`web/vite.config.js`

主要配置项：

- `VITE_API_BASE_URL`
- `VITE_API_PROXY_TARGET`
- `VITE_DEV_SERVER_PORT`
- `VITE_FEATURE_*`
- `VITE_IMAGE_PROXY_*`
- `VITE_STORAGE_*`

## AI 配置

项目当前默认采用阿里云百炼 DashScope 的 OpenAI 兼容模式，后端只保留一套统一 AI 配置：

```env
AI_PROVIDER=qwen
AI_API_KEY=your_dashscope_api_key
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_CHAT_PATH=/chat/completions
AI_MODEL_ID=qwen-plus
```

完整说明见 [DEVELOPMENT_GUIDE.md](/Users/onesmallpig/Documents/AIWorkSpace/BookStore/DEVELOPMENT_GUIDE.md) 和 [DEPLOYMENT.md](/Users/onesmallpig/Documents/AIWorkSpace/BookStore/DEPLOYMENT.md)。

## 备注

- 当前项目仍有部分历史页面和内联脚本，已经开始统一到模块化加载。
- MongoDB 代码目前未作为主运行依赖，核心业务以 MySQL 为主。
