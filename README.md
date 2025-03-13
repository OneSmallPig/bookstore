# 百变书屋 - 私人智能图书馆

一个基于AI技术的智能图书推荐和阅读平台，为用户提供个性化的阅读体验。

## 项目进度

### 第一阶段（已完成）

#### 前端部分 ✅
- 创建了主页面布局和样式
- 实现了响应式设计
- 配置了Tailwind CSS和Alpine.js
- 解决了样式编译问题
- 完成了主要页面的UI设计：
  - 首页布局
  - 书籍展示卡片
  - 分类导航
  - 用户界面组件

#### 数据库部分 ✅
- 完成数据库设计
  - 用户模型（User）
  - 书籍模型（Book）
  - 书架模型（Bookshelf）
- 实现数据库配置和连接
- 创建数据库初始化脚本
- 配置模型关联关系

### 第二阶段（进行中）

#### 前后端集成 🔄
- [ ] 用户认证界面
  - [ ] 登录页面与API对接
  - [ ] 注册页面与API对接
  - [ ] 密码重置功能
- [ ] 书籍展示功能
  - [ ] 主页书籍列表数据加载
  - [ ] 书籍详情页面
  - [ ] 分类筛选功能
- [ ] 书架管理功能
  - [ ] "添加到书架"功能
  - [ ] 书架页面数据展示
  - [ ] 阅读进度管理

#### 数据初始化 🔄
- [ ] 创建示例数据
  - [ ] 书籍数据
  - [ ] 用户数据
  - [ ] 分类数据
- [ ] 实现数据迁移
- [ ] 添加数据备份机制

#### 功能测试 🔄
- [ ] API测试用例编写
- [ ] 前端单元测试
- [ ] 集成测试
- [ ] 性能测试

### 后续开发计划

#### 第三阶段（2-3周）
1. AI功能集成
   - OpenAI API集成
   - 智能推荐系统
   - 个性化阅读建议

2. 搜索功能优化
   - 高级搜索
   - 标签系统
   - 搜索结果优化

3. 用户体验提升
   - 阅读器功能
   - 进度同步
   - 笔记功能

#### 第四阶段（2-3周）
1. 社区功能
   - 评论系统
   - 用户互动
   - 读书笔记分享

2. 数据分析
   - 阅读数据统计
   - 用户行为分析
   - 推荐算法优化

#### 第五阶段（1-2周）
1. 性能优化
   - 前端性能优化
   - 数据库优化
   - API响应优化

2. 部署准备
   - 服务器配置
   - 数据备份
   - 监控系统

## 功能测试指南

### 本地测试环境搭建

1. **启动前端开发服务器**
```bash
cd web
npm run dev
# 访问 http://localhost:3000
```

2. **启动API服务器**
```bash
cd server
npm run dev
# API服务运行在 http://localhost:3001
```

3. **数据库准备**
```bash
# 确保数据库已初始化
cd web
npm run init-db
```

### 测试用户账号
- 用户名: testuser
- 密码: test123
- 邮箱: test@example.com

### 功能测试流程

#### 用户认证测试
1. 访问登录页面 `/src/pages/login.html`
2. 使用测试账号登录
3. 验证登录状态保持
4. 测试注册功能
5. 测试密码重置功能

#### 书籍展示测试
1. 访问首页，验证书籍列表加载
2. 点击书籍卡片，验证详情页面
3. 测试分类筛选功能
4. 验证推荐算法

#### 书架管理测试
1. 登录后访问书架页面
2. 测试添加书籍到书架
3. 测试移除书籍
4. 测试更新阅读状态
5. 验证阅读进度保存

#### API测试
1. 使用Postman或类似工具测试API端点
2. 验证认证流程
3. 测试书籍相关API
4. 测试用户相关API
5. 测试书架相关API

### UI设计规范

**重要提示：所有页面必须严格按照`model`文件夹下的原型文件进行实现**

1. 使用MCP工具查看原型文件样式：
```bash
# 启动开发服务器
cd model
npx serve
# 访问 http://localhost:5000
```

2. 使用MCP工具进行页面比对：
   - 截取原型页面截图
   - 截取实现页面截图
   - 对比差异并调整

3. 设计规范要点：
   - 颜色方案必须与原型一致
   - 组件间距与原型保持一致
   - 响应式布局必须符合原型设计
   - 交互效果（悬停、点击等）必须实现

## 技术栈

### 前端
- HTML5/CSS3/JavaScript
- Tailwind CSS：原子化CSS框架
- Alpine.js：轻量级JavaScript框架
- Font Awesome：图标库

### 后端
- Node.js + Express：后端框架
- MySQL：关系型数据库
- Sequelize：ORM框架
- JWT：用户认证
- OpenAI API：AI推荐功能

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

3. **数据库配置**
```bash
# 在MySQL中创建数据库
mysql -u root -p
CREATE DATABASE versatile_bookstore;
```

4. **初始化数据库**
```bash
cd web
npm run init-db
```

## 开发规范

### 代码规范
- 使用ESLint和Prettier保持代码风格一致
- 保持代码注释完整
- 遵循组件化开发原则

### Git工作流
- 主分支：main
- 开发分支：dev
- 功能分支：feature/*
- 修复分支：hotfix/*

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式化
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 联系方式

- 项目负责人：OneSmallPig
- GitHub：[https://github.com/OneSmallPig]

## 许可证

MIT License 