# 部署说明

## 部署前确认

- 后端环境变量已经配置完整
- MySQL 可从部署环境访问
- 前端构建变量与后端 API 地址一致

## 前端

前端目录：`web/`

关键变量：

```env
VITE_API_BASE_URL=/api
VITE_IMAGE_PROXY_PATH=/api/proxy/image?url=
```

如果前后端同域部署，`VITE_API_BASE_URL=/api` 即可。

如果前端单独部署，建议通过网关或反向代理把 `/api` 转发到后端。

## 后端

后端目录：`server/`

关键变量：

```env
NODE_ENV=production
PORT=3001
BASE_URL=https://your-api-domain
CORS_ORIGIN=https://your-web-domain

DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=versatile_bookstore
DB_USER=your-db-user
DB_PASSWORD=your-db-password

JWT_SECRET=your-jwt-secret

AI_PROVIDER=qwen
AI_API_KEY=your_dashscope_api_key
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_CHAT_PATH=/chat/completions
AI_MODEL_ID=qwen-plus
```

## 阿里 Qwen 接入

当前项目后端使用 OpenAI 兼容模式调用 Qwen，实际请求地址会拼成：

```text
AI_BASE_URL + AI_CHAT_PATH
```

默认即：

```text
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

## 推荐部署顺序

1. 先部署后端并确认数据库连接正常
2. 配置 AI 变量并验证 `/api/ai/*` 接口
3. 再部署前端并确认 `/api` 代理可用
4. 最后验证登录、书架、搜索、AI 推荐、书源管理
