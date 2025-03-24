# 百变书屋前端源代码

本目录包含百变书屋的前端源代码，使用HTML、CSS和原生JavaScript构建，以确保最佳的可理解性和易维护性。

## 目录结构

- `css/`: 样式文件
- `images/`: 图像资源
- `js/`: JavaScript脚本
- `pages/`: HTML页面
- `models/`: 数据模型
- `config/`: 配置文件
- `scripts/`: 构建和辅助脚本

## 主要功能

### 智能搜索页面

智能搜索页面(`pages/search.html`)允许用户通过自然语言描述获取AI推荐的书籍。

#### 功能特点：

1. **AI推荐书籍**：
   - 页面加载时自动请求AI推荐书籍(`/api/ai/recommended`)
   - 显示带有书籍封面、标题、作者和标签的结果

2. **搜索功能**：
   - 支持自然语言搜索
   - 提供搜索示例快速填充搜索框
   - 记录搜索历史

3. **加载动画**：
   - 使用统一的加载动画样式，与首页一致
   - 以小弹窗形式显示加载状态

#### 技术实现：

- `main.js`中的`initSearchPage()`函数初始化搜索页面
- `loadInitialAIRecommendations()`函数在页面加载时请求AI推荐书籍
- `initSearchExamples()`函数处理搜索示例按钮
- `renderBooks()`函数负责渲染书籍卡片

### API请求

前端通过`api.js`文件封装的API服务与后端通信：

- `aiApi.getRecommendations()`: 获取AI推荐书籍
- `aiApi.getPopularSearches()`: 获取热门搜索
- `bookApi.searchBooks()`: 搜索书籍

## 开发指南

### 添加新功能

1. 在适当的目录创建新文件
2. 在`main.js`中添加相应的初始化函数
3. 确保在页面加载时调用初始化函数

### 调试技巧

- 开发环境会在右下角显示"清除缓存数据"按钮
- 控制台日志详细记录API请求和响应
- 使用`config.js`切换生产/开发环境

## 缓存策略

为提高性能，前端实现了缓存策略：

- 书籍数据缓存在localStorage中
- 缓存有效期为1小时
- 用户登录状态变化时自动清除缓存 