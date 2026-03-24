# 开发指南

## 环境要求

- Node.js 18+
- MySQL 8+
- npm

## 项目结构

```text
BookStore/
├── web/
│   ├── .env.development
│   ├── .env.production
│   ├── src/js/config.js
│   └── vite.config.js
├── server/
│   ├── .env
│   ├── .env.example
│   └── src/config/config.js
├── README.md
├── DEVELOPMENT_GUIDE.md
├── DEPLOYMENT.md
└── API_DOCUMENTATION.md
```

## 开发启动

### 后端

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### 前端

```bash
cd web
npm install
npm run dev
```

## 配置原则

当前仓库的配置规则是：

- 后端业务代码统一从 `server/src/config/config.js` 取配置
- 前端业务代码统一从 `web/src/js/config.js` 取配置
- 不在业务文件里直接写死端口、密钥、数据库地址、AI 地址

## 后端配置

后端环境变量文件：`server/.env`

常用项：

```env
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001
BODY_LIMIT=20mb

DB_HOST=localhost
DB_PORT=3306
DB_NAME=versatile_bookstore
DB_USER=root
DB_PASSWORD=your_password
DB_LOGGING=true
DB_SYNC_ALTER=true

JWT_SECRET=replace_me
JWT_EXPIRES_IN=7d

SKIP_AUTH=true
AUTH_TEST_TOKEN=test-token

CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### Qwen / 阿里百炼 AI 配置

```env
AI_PROVIDER=qwen
AI_API_KEY=your_dashscope_api_key
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_CHAT_PATH=/chat/completions
AI_MODEL_ID=qwen-plus
AI_TIMEOUT_MS=180000
AI_REQUEST_TIMEOUT_MS=30000
DEBUG_MODE=false
USE_MOCK_DATA=false
```

说明：

- `AI_BASE_URL` 配 OpenAI 兼容模式的基础地址
- `AI_CHAT_PATH` 默认是 `/chat/completions`
- `AI_MODEL_ID` 直接填写模型名，例如 `qwen-plus`、`qwen-turbo`、`qwen-max`
- `AI_API_KEY` 填你的百炼 API Key

## 前端配置

开发环境：`web/.env.development`

生产环境：`web/.env.production`

常用项：

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:3001
VITE_DEV_SERVER_PORT=3000
VITE_DEV_SERVER_HOST=0.0.0.0
VITE_DEV_SERVER_OPEN=true
```

其他配置：

- `VITE_API_TIMEOUT_MS`
- `VITE_API_RETRIES`
- `VITE_IMAGE_PROXY_*`
- `VITE_FEATURE_*`
- `VITE_STORAGE_*`

## 数据库初始化

```bash
cd server
npm run init-db
```

## 当前文档分工

- `README.md`：项目概览与快速启动
- `DEVELOPMENT_GUIDE.md`：开发和配置说明
- `DEPLOYMENT.md`：部署说明
- `API_DOCUMENTATION.md`：接口说明
