# 百变书屋 - 开发指南

本文档为百变书屋项目的开发指南，旨在帮助开发团队成员理解项目架构、开发流程和规范，确保代码质量和一致性。

## 目录

1. [开发环境设置](#开发环境设置)
2. [代码仓库结构](#代码仓库结构)
3. [开发流程](#开发流程)
4. [编码规范](#编码规范)
5. [前端开发指南](#前端开发指南)
6. [后端开发指南](#后端开发指南)
7. [测试指南](#测试指南)
8. [部署流程](#部署流程)
9. [常见问题与解决方案](#常见问题与解决方案)

## 开发环境设置

### 系统要求

- Node.js 18.x 或更高版本
- MySQL 8.0 或更高版本
- Git

### 初始环境设置

1. **克隆仓库**

```bash
git clone https://github.com/OneSmallPig/bookstore.git
cd bookstore
```

2. **安装前端依赖**

```bash
cd web
npm install
```

3. **安装后端依赖**

```bash
cd ../server
npm install
```

4. **配置环境变量**

在`server`目录下复制`.env.example`文件并重命名为`.env`，然后根据本地环境修改相应的配置：

```bash
cp .env.example .env
```

`.env`文件内容示例：

```
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=versatile_bookstore

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=86400

# OpenAI配置（可选）
OPENAI_API_KEY=your_openai_api_key
```

5. **初始化数据库**

```bash
cd server
npm run db:init
```

6. **启动开发服务器**

前端：

```bash
cd web
npm run dev
```

后端：

```bash
cd server
npm run dev
```

访问地址：
- 前端: http://localhost:3000
- 后端API: http://localhost:3001

## 代码仓库结构

```
bookstore/
├── web/                    # 前端项目
│   ├── public/             # 静态资源
│   │   ├── assets/         # 资源文件(图片、字体等)
│   │   ├── src/                # 源代码
│   │   │   ├── components/     # 可复用组件
│   │   │   ├── pages/          # 页面组件
│   │   │   ├── utils/          # 工具函数
│   │   │   ├── styles/         # 样式文件
│   │   │   ├── main.js         # 入口文件
│   │   │   └── router.js       # 路由配置
│   │   ├── package.json        # 依赖配置
│   │   └── tailwind.config.js  # Tailwind配置
│   │
│   ├── server/                 # 后端项目
│   │   ├── src/                # 源代码
│   │   │   ├── controllers/    # 控制器
│   │   │   ├── models/         # 数据模型
│   │   │   ├── routes/         # 路由定义
│   │   │   ├── services/       # 业务逻辑
│   │   │   ├── utils/          # 工具函数
│   │   │   ├── middlewares/    # 中间件
│   │   │   └── app.js          # 应用入口
│   │   ├── package.json        # 依赖配置
│   │   └── .env                # 环境变量
│   │
│   ├── docs/                   # 文档
│   ├── tests/                  # 测试文件
│   ├── model/                  # UI原型和模型
│   └── README.md               # 项目说明
```

## 开发流程

### Git工作流

我们采用基于功能分支的工作流：

1. **分支命名规范**
   - `main`: 主分支，保存稳定可发布的代码
   - `dev`: 开发分支，所有功能开发完成后合并到这里
   - `feature/xxx`: 功能分支，用于开发具体功能
   - `bugfix/xxx`: 问题修复分支
   - `hotfix/xxx`: 紧急修复分支

2. **开发新功能的流程**

```bash
# 从最新的dev分支创建功能分支
git checkout dev
git pull
git checkout -b feature/your-feature-name

# 开发完成后提交代码
git add .
git commit -m "feat: 添加xxx功能"
git push origin feature/your-feature-name

# 然后在GitHub上创建Pull Request到dev分支
```

3. **提交规范**

遵循[Conventional Commits](https://www.conventionalcommits.org/)规范：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化、样式调整等不影响代码逻辑的更改
- `refactor`: 代码重构
- `test`: 添加或修改测试
- `chore`: 其他改动，如构建过程、辅助工具等

示例：
```
feat: 添加用户登录页面
fix: 修复书籍列表分页问题
docs: 更新API文档
```

### 迭代周期

- 每个迭代周期为2周
- 迭代开始时进行计划会议，确定本次迭代的任务
- 每日进行简短站会，同步进度和问题
- 迭代结束时进行回顾会议，总结经验教训

## 编码规范

### 通用规范

- 使用2个空格缩进
- 文件末尾保留一个空行
- 行尾不留空格
- 使用UTF-8编码

### 命名规范

- **变量和函数**：使用小驼峰命名法(camelCase)
- **类和组件**：使用大驼峰命名法(PascalCase)
- **常量**：使用全大写加下划线(UPPER_SNAKE_CASE)
- **文件名**：
  - 组件文件使用大驼峰(PascalCase)
  - 其他JS/TS文件使用小驼峰(camelCase)
  - 样式文件与对应的组件同名

## 前端开发指南

### 技术栈

- HTML5 / CSS3
- JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - 原子化CSS框架
- [Alpine.js](https://alpinejs.dev/) - 轻量级JavaScript框架

### 组件开发规范

1. **组件结构**

```html
<!-- 示例组件结构 -->
<div class="book-card">
  <img src="..." alt="..." class="book-cover">
  <div class="book-info">
    <h3 class="book-title">...</h3>
    <p class="book-author">...</p>
    <!-- 其他内容 -->
  </div>
  <div class="book-actions">
    <!-- 按钮等交互元素 -->
  </div>
</div>
```

2. **样式指南**

- 尽可能使用Tailwind CSS类名
- 对于复杂的样式，可以创建自定义类
- 保持视觉一致性，遵循设计规范

3. **交互设计**

- 所有可交互元素应有悬停和点击状态反馈
- 表单应有适当的验证反馈
- 异步操作应有加载状态提示

### 页面性能优化

- 使用懒加载图片
- 按需加载组件
- 减少DOM操作
- 优化渲染性能

## 后端开发指南

### 技术栈

- Node.js + Express.js
- MySQL + Sequelize ORM
- JWT认证
- OpenAI API

### API设计原则

1. **RESTful API设计**

- 使用合适的HTTP方法(GET, POST, PUT, DELETE)
- 使用资源为中心的URL路径
- 使用统一的响应格式
- 适当使用HTTP状态码

2. **API响应格式**

```json
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功描述"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

3. **错误处理**

- 使用一致的错误处理中间件
- 记录错误日志
- 返回有意义的错误信息和代码

### 数据库操作

- 使用Sequelize ORM进行数据库操作
- 定义清晰的数据模型和关联关系
- 使用事务确保数据一致性
- 编写数据库迁移脚本管理表结构变更

### 安全性指南

- 使用环境变量存储敏感信息
- 实现适当的访问控制
- 防止SQL注入、XSS攻击
- 使用HTTPS保护API通信
- 对敏感数据如密码进行加密存储

## 测试指南

参见[TEST_PLAN.md](./TEST_PLAN.md)文档获取详细的测试指南。

### 单元测试

- 使用Jest进行前端和后端单元测试
- 测试覆盖率目标：70%以上
- 关注核心业务逻辑和边界条件

### 集成测试

- 测试API端点的完整功能
- 测试组件之间的交互
- 模拟真实用户场景

### 端到端测试

- 使用Cypress进行端到端测试
- 测试关键用户流程
- 验证UI和功能的正确性

## 部署流程

### 开发环境

- 本地开发后推送到开发分支
- 自动化构建和测试

### 测试环境

- 从dev分支部署到测试服务器
- 进行QA测试和验收测试

### 生产环境

- 从main分支部署到生产服务器
- 进行分步部署和验证

### 部署清单

1. 前端构建
```bash
cd web
npm run build
```

2. 后端部署
```bash
cd server
npm run build
```

3. 数据库迁移
```bash
cd server
npm run db:migrate
```

4. 服务启动
```bash
cd server
npm run start
```

## 常见问题与解决方案

### 本地开发问题

**问题**: 启动前端开发服务器时出现"Module not found"错误

**解决方案**:
- 确保已运行`npm install`安装所有依赖
- 检查import路径是否正确
- 清除node_modules并重新安装: `rm -rf node_modules && npm install`

**问题**: 数据库连接失败

**解决方案**:
- 检查.env文件中的数据库配置
- 确认MySQL服务是否正在运行
- 验证数据库用户名和密码是否正确

### 代码协作问题

**问题**: Git合并冲突

**解决方案**:
- 先拉取最新代码: `git pull origin dev`
- 解决冲突并标记为已解决
- 提交更改: `git add . && git commit -m "fix: resolve merge conflicts"`

**问题**: 代码审查反馈问题

**解决方案**:
- 认真查看PR评论
- 针对性地修改代码
- 提交新的更改并@提出问题的审查者

### API问题

**问题**: 接收到401 Unauthorized错误

**解决方案**:
- 检查JWT令牌是否包含在请求头中
- 确认令牌是否过期
- 验证用户权限是否正确

**问题**: API返回500错误

**解决方案**:
- 检查服务器日志了解详细错误信息
- 调试对应的API处理逻辑
- 修复服务器端错误并重新部署

## 附录

### 有用的命令

```bash
# 前端
npm run dev        # 启动开发服务器
npm run build      # 构建生产版本
npm run lint       # 运行代码检查
npm run test       # 运行测试

# 后端
npm run dev        # 以开发模式启动服务器
npm run start      # 以生产模式启动服务器
npm run db:migrate # 运行数据库迁移
npm run db:seed    # 填充种子数据
```

### 推荐阅读

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Alpine.js 文档](https://alpinejs.dev/start-here)
- [Express.js 文档](https://expressjs.com/)
- [Sequelize 文档](https://sequelize.org/)
- [JWT 认证指南](https://jwt.io/introduction)

---

本文档将根据项目发展持续更新。如有问题或建议，请联系项目负责人。 