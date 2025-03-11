# 百变书屋 - 私人智能图书馆

一个基于AI技术的智能图书推荐和阅读平台，为用户提供个性化的阅读体验。

## 技术栈

### 前端
- **HTML5/CSS3/JavaScript**：基础技术栈
- **Tailwind CSS**：原子化CSS框架，用于快速构建现代化UI
- **Alpine.js**：轻量级JavaScript框架，用于简单交互
- **Font Awesome**：图标库

### 后端
- **Node.js + Express**：轻量级后端框架
- **MySQL**：关系型数据库，存储用户和书籍数据
- **Sequelize**：ORM框架，简化数据库操作
- **JWT**：用户认证
- **OpenAI API**：AI推荐功能

### 开发工具
- **Vite**：现代前端构建工具
- **ESLint**：代码质量检查
- **Prettier**：代码格式化
- **nodemon**：后端开发热重载

## 项目结构

```
bookstore/
├── web/                    # 前端代码
│   ├── public/            # 静态资源
│   │   ├── images/       # 图片资源
│   │   └── data/         # 示例数据
│   ├── src/              # 源代码
│   │   ├── js/          # JavaScript文件
│   │   │   ├── components/  # 组件
│   │   │   ├── pages/      # 页面逻辑
│   │   │   ├── services/   # API服务
│   │   │   └── utils/      # 工具函数
│   │   ├── css/         # CSS样式
│   │   │   ├── components/ # 组件样式
│   │   │   └── pages/     # 页面样式
│   │   └── pages/       # HTML页面
│   ├── .eslintrc.js     # ESLint配置
│   ├── .prettierrc      # Prettier配置
│   ├── package.json     # 前端依赖
│   └── vite.config.js   # Vite配置
│
├── server/               # 后端代码
│   ├── src/
│   │   ├── config/      # 配置文件
│   │   ├── controllers/ # 控制器
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # 路由
│   │   ├── services/    # 业务逻辑
│   │   ├── utils/       # 工具函数
│   │   └── app.js       # 应用入口
│   ├── .env.example     # 环境变量示例
│   └── package.json     # 后端依赖
│
└── README.md            # 项目说明

```

## 数据库设计

### 主要表结构
- users：用户信息
- books：书籍信息
- bookshelf：用户书架
- reading_progress：阅读进度
- comments：评论
- tags：标签
- book_tags：书籍标签关联

## API架构

采用RESTful API设计，主要模块：

1. **认证模块**
   - 用户注册
   - 用户登录
   - 密码重置

2. **书籍模块**
   - 书籍列表
   - 书籍详情
   - 书籍搜索
   - AI推荐

3. **用户模块**
   - 个人信息
   - 书架管理
   - 阅读进度
   - 收藏管理

4. **社区模块**
   - 评论
   - 点赞
   - 分享

## 当前阶段完成情况

### 第一阶段（基础框架搭建）

#### 前端部分
✅ 完成基础页面开发
- 创建了主页面布局和样式
- 实现了响应式设计
- 配置了Tailwind CSS和Alpine.js
- 解决了样式编译问题，确保CSS正确加载

#### 后端部分
✅ 搭建基础API
- 创建了完整的后端API架构
- 实现了用户认证API（注册、登录、获取当前用户）
- 实现了用户管理API（个人资料、修改密码）
- 实现了书籍管理API（获取书籍列表、书籍详情）
- 实现了书架管理API（添加书籍、移除书籍、更新阅读进度）

✅ 实现用户认证
- 实现了JWT令牌生成和验证
- 实现了密码加密和验证
- 创建了认证中间件
- 实现了权限控制

✅ 数据库模型设计
- 设计并实现了用户模型（User）
- 设计并实现了书籍模型（Book）
- 设计并实现了书架模型（Bookshelf）
- 配置了模型间的关联关系

### 下一阶段计划
1. 前后端集成
   - 将前端页面与API集成
   - 实现用户认证界面
   - 实现书籍展示和书架管理界面

2. 数据初始化
   - 创建初始化脚本，导入示例书籍数据
   - 实现数据迁移和种子数据

3. 功能测试
   - 编写API测试
   - 进行集成测试

## 本地开发环境搭建

### 前置要求
- Node.js >= 18
- MySQL >= 8.0
- Git

### 启动步骤

1. **克隆项目**
```bash
git clone https://github.com/OneSmallPig/bookstore.git
cd bookstore
```

2. **前端环境配置**
```bash
cd web
npm install
npm run build:css  # 编译Tailwind CSS
npm run dev  # 启动前端开发服务器
```

3. **后端环境配置**
```bash
cd ../server
npm install
cp .env.example .env  # 复制环境变量文件并修改配置
```

4. **数据库配置**
```bash
# 在MySQL中创建数据库
mysql -u root -p
CREATE DATABASE bookstore;
```

5. **启动服务**

前端开发服务器：
```bash
cd web
npm run dev  # 访问 http://localhost:3000
```

后端服务器：
```bash
cd server
npm run dev  # API服务运行在 http://localhost:3001
```

## 开发建议

1. **代码规范**
   - 使用ESLint和Prettier保持代码风格一致
   - 遵循组件化开发原则
   - 保持代码注释完整

2. **Git工作流**
   - 主分支：main
   - 开发分支：dev
   - 功能分支：feature/*
   - 修复分支：hotfix/*

3. **性能优化**
   - 使用图片懒加载
   - 实现组件懒加载
   - 优化API请求
   - 使用缓存策略

4. **安全考虑**
   - 实现完整的用户认证
   - 防止SQL注入
   - 实现CSRF保护
   - 数据加密传输

## 后续开发计划

1. **第二阶段**（1-2周）
   - 实现书籍管理功能
   - 完成个人书架功能
   - 开发阅读器功能

2. **第三阶段**（1-2周）
   - 集成AI推荐系统
   - 实现搜索功能
   - 添加数据分析

3. **第四阶段**（1-2周）
   - 开发社区功能
   - 添加用户互动
   - 实现分享功能

4. **第五阶段**（1周）
   - 性能优化
   - 用户体验改进
   - 部署上线

## 部署说明

### Vercel 部署

#### 前端部署

1. **准备工作**
   - 确保项目已经推送到 GitHub 仓库
   - 注册 [Vercel](https://vercel.com) 账号
   - 在 Vercel 中连接你的 GitHub 账号

2. **配置前端部署**
   ```bash
   # 在 web 目录下安装 Vercel CLI
   npm install -g vercel

   # 登录 Vercel
   vercel login

   # 在 web 目录下创建 vercel.json
   touch vercel.json
   ```

   在 `web/vercel.json` 中添加以下配置：
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/"
       }
     ],
     "env": {
       "VITE_API_URL": "你的后端API地址"
     }
   }
   ```

3. **修改前端配置**
   
   在 `web/vite.config.js` 中添加构建配置：
   ```javascript
   export default defineConfig({
     // ... 其他配置 ...
     build: {
       outDir: 'dist',
       rollupOptions: {
         // ... 现有配置 ...
       }
     }
   });
   ```

4. **部署命令**
   ```bash
   # 在 web 目录下执行
   vercel
   ```

#### 后端部署

1. **准备工作**
   - 在 `server` 目录下创建 `vercel.json`
   ```bash
   cd server
   touch vercel.json
   ```

2. **配置后端部署**
   
   在 `server/vercel.json` 中添加以下配置：
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/app.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/app.js"
       }
     ],
     "env": {
       "NODE_ENV": "production",
       "DATABASE_URL": "你的MySQL数据库连接URL",
       "JWT_SECRET": "你的JWT密钥",
       "OPENAI_API_KEY": "你的OpenAI API密钥"
     }
   }
   ```

3. **数据库配置**
   - 使用 [PlanetScale](https://planetscale.com/) 或 [Amazon RDS](https://aws.amazon.com/rds/) 等云数据库服务
   - 获取数据库连接URL并配置到 Vercel 环境变量中

4. **部署命令**
   ```bash
   # 在 server 目录下执行
   vercel
   ```

### 部署注意事项

1. **环境变量**
   - 在 Vercel 项目设置中配置所有必要的环境变量
   - 确保生产环境的环境变量与开发环境区分

2. **数据库连接**
   - 使用连接池管理数据库连接
   - 设置适当的连接超时和重试策略
   - 确保数据库连接URL包含SSL配置

3. **安全配置**
   - 配置适当的 CORS 策略
   - 启用 HTTPS
   - 设置安全的响应头
   - 配置 API 速率限制

4. **监控和日志**
   - 在 Vercel 仪表板中监控应用性能
   - 配置错误报警
   - 使用 Vercel Analytics 跟踪用户体验

5. **域名配置**
   - 在 Vercel 中添加自定义域名
   - 配置 DNS 记录
   - 启用 SSL 证书

### 自动部署

1. **配置 GitHub Actions**
   
   在项目根目录创建 `.github/workflows/deploy.yml`：
   ```yaml
   name: Deploy
   on:
     push:
       branches:
         - main
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         
         - name: Deploy Frontend
           uses: amondnet/vercel-action@v20
           with:
             vercel-token: ${{ secrets.VERCEL_TOKEN }}
             vercel-org-id: ${{ secrets.ORG_ID }}
             vercel-project-id: ${{ secrets.PROJECT_ID_FRONTEND }}
             working-directory: ./web
             
         - name: Deploy Backend
           uses: amondnet/vercel-action@v20
           with:
             vercel-token: ${{ secrets.VERCEL_TOKEN }}
             vercel-org-id: ${{ secrets.ORG_ID }}
             vercel-project-id: ${{ secrets.PROJECT_ID_BACKEND }}
             working-directory: ./server
   ```

2. **配置 Vercel 集成**
   - 在 GitHub 仓库设置中添加 Vercel 部署钩子
   - 配置自动预览部署
   - 设置部署环境变量

### 部署检查清单

- [ ] 所有环境变量已正确配置
- [ ] 数据库连接已测试
- [ ] API 端点已更新为生产环境 URL
- [ ] CORS 策略已配置
- [ ] SSL 证书已启用
- [ ] 自动部署已测试
- [ ] 监控告警已设置
- [ ] 数据库备份策略已确认
- [ ] 性能测试已完成
- [ ] 安全扫描已执行 