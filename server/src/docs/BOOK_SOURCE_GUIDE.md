# 书源功能使用指南

本文档介绍如何使用智能图书馆的书源功能，包括书源配置、搜索书籍、获取内容以及阅读记录等功能。

## 1. 书源系统概述

书源系统是一套基于网络爬虫的图书内容获取解决方案，通过配置书源规则，可以从各个网络小说网站抓取内容，为用户提供统一的阅读体验。系统的主要组件包括：

- **书源模型**：定义书源的数据结构和规则
- **书源管理器**：负责加载、保存和管理书源
- **解析引擎**：根据书源规则解析网页内容
- **搜索服务**：在多个书源中搜索书籍
- **API接口**：提供RESTful API供前端调用

## 2. 书源配置格式

书源使用JSON格式配置，包含以下主要字段：

```json
{
  "name": "书源名称",
  "url": "书源网址",
  "version": 1,
  "icon": "图标URL",
  "group": "分组名称",
  "enabled": true,
  
  "searchUrl": "搜索URL，可包含{keyword}占位符",
  "searchList": "搜索结果列表选择器",
  "searchName": "书名选择器",
  "searchAuthor": "作者选择器",
  "searchDetail": "详情页链接选择器",
  
  "detailName": "详情页书名选择器",
  "detailAuthor": "详情页作者选择器",
  "detailCover": "封面图片选择器",
  "detailIntro": "简介选择器",
  "detailChapterUrl": "章节列表URL选择器",
  
  "chapterList": "章节列表选择器",
  "chapterName": "章节名选择器",
  "chapterLink": "章节链接选择器",
  
  "contentRule": "内容选择器",
  "contentFilter": ["内容过滤规则1", "内容过滤规则2"]
}
```

### 2.1 选择器说明

系统支持多种选择器格式：

- **CSS选择器**：如 `.book-title`、`#content`、`div.chapter p`
- **XPath选择器**：以 `//` 开头，如 `//div[@class="book-title"]`
- **属性选择**：在选择器后添加 `@属性名`，如 `a@href`、`img@src`

## 3. API接口说明

### 3.1 书源管理API

- `GET /api/booksource/sources` - 获取所有书源
- `GET /api/booksource/sources/groups` - 获取所有书源分组
- `GET /api/booksource/sources/group/:group` - 获取指定分组的书源
- `GET /api/booksource/sources/:name` - 获取指定名称的书源
- `POST /api/booksource/sources` - 添加或更新书源
- `DELETE /api/booksource/sources/:name` - 删除书源
- `PUT /api/booksource/sources/:name/enabled` - 启用或禁用书源
- `POST /api/booksource/sources/import` - 导入书源
- `POST /api/booksource/sources/export` - 导出书源
- `POST /api/booksource/sources/test` - 测试书源

### 3.2 书籍搜索与内容获取API

- `GET /api/booksource/search` - 搜索书籍
  - 参数：keyword, sourceNames, timeout, fetchDetails, maxResults
- `GET /api/booksource/book/detail` - 获取书籍详情
  - 参数：url, sourceName
- `GET /api/booksource/book/chapters` - 获取章节列表
  - 参数：url, sourceName
- `GET /api/booksource/book/content` - 获取章节内容
  - 参数：url, sourceName

## 4. 测试工具使用

项目提供了命令行测试工具，位于 `server/src/scripts/testBookSource.js`，用于测试书源功能。

### 4.1 基本使用

```bash
# 进入server目录
cd server

# 列出所有书源
node src/scripts/testBookSource.js list

# 搜索书籍
node src/scripts/testBookSource.js search "关键词" [书源名称]

# 获取书籍详情
node src/scripts/testBookSource.js detail "URL" "书源名称"

# 获取章节列表
node src/scripts/testBookSource.js chapters "URL" "书源名称"

# 获取章节内容
node src/scripts/testBookSource.js content "URL" "书源名称"

# 测试指定书源
node src/scripts/testBookSource.js test "书源名称"
```

### 4.2 测试流程示例

以下是一个完整的测试流程示例：

1. 列出所有书源：

```bash
node src/scripts/testBookSource.js list
```

2. 选择一个书源进行搜索：

```bash
node src/scripts/testBookSource.js search "天才" "笔趣阁"
```

3. 获取书籍详情（使用搜索结果中的URL）：

```bash
node src/scripts/testBookSource.js detail "https://www.xbiquge.la/10/10489/" "笔趣阁"
```

4. 获取章节列表（使用详情结果中的chapterUrl）：

```bash
node src/scripts/testBookSource.js chapters "https://www.xbiquge.la/10/10489/" "笔趣阁"
```

5. 获取章节内容（使用章节列表中的URL）：

```bash
node src/scripts/testBookSource.js content "https://www.xbiquge.la/10/10489/4534454.html" "笔趣阁"
```

## 5. 前端集成

### 5.1 搜索与展示书籍

前端可以通过调用API接口搜索书籍并展示结果：

```javascript
// 搜索书籍
async function searchBooks(keyword) {
  const response = await fetch(`/api/booksource/search?keyword=${encodeURIComponent(keyword)}`);
  const data = await response.json();
  
  if (data.success) {
    // 展示搜索结果
    displaySearchResults(data.data);
  } else {
    // 处理错误
    console.error('搜索失败:', data.message);
  }
}

// 展示搜索结果
function displaySearchResults(books) {
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '';
  
  books.forEach(book => {
    const bookElement = document.createElement('div');
    bookElement.className = 'book-item';
    bookElement.innerHTML = `
      <img src="${book.cover || '/images/default-cover.jpg'}" alt="${book.name}" class="book-cover">
      <div class="book-info">
        <h3 class="book-title">${book.name}</h3>
        <p class="book-author">作者: ${book.author || '未知'}</p>
        <p class="book-source">来源: ${book.source}</p>
        <button class="read-button" data-url="${book.detail}" data-source="${book.source}">阅读</button>
      </div>
    `;
    
    // 添加点击事件
    const readButton = bookElement.querySelector('.read-button');
    readButton.addEventListener('click', () => {
      openBookDetail(book.detail, book.source);
    });
    
    resultsContainer.appendChild(bookElement);
  });
}

// 打开书籍详情
async function openBookDetail(url, sourceName) {
  const response = await fetch(`/api/booksource/book/detail?url=${encodeURIComponent(url)}&sourceName=${encodeURIComponent(sourceName)}`);
  const data = await response.json();
  
  if (data.success) {
    // 存储书籍信息到本地
    localStorage.setItem('currentBook', JSON.stringify(data.data));
    // 跳转到阅读页面
    window.location.href = `/reader.html?url=${encodeURIComponent(data.data.chapterUrl)}&source=${encodeURIComponent(sourceName)}`;
  } else {
    // 处理错误
    console.error('获取书籍详情失败:', data.message);
  }
}
```

### 5.2 阅读页面实现

阅读页面需要获取章节列表和章节内容，并提供翻页、设置等功能：

```javascript
// 初始化阅读器
async function initReader() {
  const params = new URLSearchParams(window.location.search);
  const chapterUrl = params.get('url');
  const sourceName = params.get('source');
  
  if (!chapterUrl || !sourceName) {
    showError('缺少必要参数');
    return;
  }
  
  // 获取章节列表
  await loadChapterList(chapterUrl, sourceName);
  
  // 获取上次阅读记录
  const readingRecord = getReadingRecord();
  
  if (readingRecord && readingRecord.chapterIndex !== undefined) {
    // 恢复上次阅读位置
    loadChapter(readingRecord.chapterIndex);
  } else {
    // 从第一章开始阅读
    loadChapter(0);
  }
  
  // 绑定按钮事件
  document.getElementById('prev-chapter').addEventListener('click', () => loadChapter(currentChapterIndex - 1));
  document.getElementById('next-chapter').addEventListener('click', () => loadChapter(currentChapterIndex + 1));
  document.getElementById('font-size-increase').addEventListener('click', increaseFontSize);
  document.getElementById('font-size-decrease').addEventListener('click', decreaseFontSize);
}

// 加载章节列表
async function loadChapterList(url, sourceName) {
  try {
    const response = await fetch(`/api/booksource/book/chapters?url=${encodeURIComponent(url)}&sourceName=${encodeURIComponent(sourceName)}`);
    const data = await response.json();
    
    if (data.success) {
      chapters = data.data;
      
      // 渲染章节列表
      const chapterListElement = document.getElementById('chapter-list');
      chapterListElement.innerHTML = '';
      
      chapters.forEach((chapter, index) => {
        const chapterElement = document.createElement('div');
        chapterElement.className = 'chapter-item';
        chapterElement.textContent = chapter.title;
        chapterElement.addEventListener('click', () => loadChapter(index));
        chapterListElement.appendChild(chapterElement);
      });
    } else {
      showError('获取章节列表失败: ' + data.message);
    }
  } catch (error) {
    showError('获取章节列表出错: ' + error.message);
  }
}

// 加载章节内容
async function loadChapter(index) {
  if (index < 0 || index >= chapters.length) {
    return;
  }
  
  currentChapterIndex = index;
  const chapter = chapters[index];
  
  try {
    const params = new URLSearchParams(window.location.search);
    const sourceName = params.get('source');
    
    const response = await fetch(`/api/booksource/book/content?url=${encodeURIComponent(chapter.url)}&sourceName=${encodeURIComponent(sourceName)}`);
    const data = await response.json();
    
    if (data.success) {
      // 显示章节内容
      const contentElement = document.getElementById('chapter-content');
      contentElement.innerHTML = `<h2>${chapter.title}</h2>`;
      
      // 将内容按段落分割并添加
      const paragraphs = data.data.content.split('\n')
        .filter(p => p.trim().length > 0)
        .map(p => `<p>${p}</p>`)
        .join('');
      
      contentElement.innerHTML += paragraphs;
      
      // 更新阅读记录
      saveReadingRecord({
        chapterIndex: currentChapterIndex,
        chapterTitle: chapter.title,
        position: 0, // 页面顶部
        lastReadTime: new Date().toISOString()
      });
      
      // 滚动到顶部
      window.scrollTo(0, 0);
      
      // 更新章节标题
      document.getElementById('current-chapter').textContent = chapter.title;
      
      // 更新导航按钮状态
      document.getElementById('prev-chapter').disabled = (index === 0);
      document.getElementById('next-chapter').disabled = (index === chapters.length - 1);
    } else {
      showError('获取章节内容失败: ' + data.message);
    }
  } catch (error) {
    showError('获取章节内容出错: ' + error.message);
  }
}
```

## 6. 注意事项

### 6.1 性能优化

- 启用缓存以减少网络请求
- 预加载下一章内容
- 实现分页加载长章节
- 限制并发请求数量

### 6.2 合法合规

- 遵守网站的robots.txt规则
- 控制爬取频率，避免对目标网站造成压力
- 明确内容版权声明
- 仅作为个人学习和阅读使用

### 6.3 书源维护

- 定期检查和更新书源
- 添加书源测试机制
- 实现书源自动修复功能
- 允许用户贡献和分享书源

## 7. 故障排除

### 7.1 常见问题

1. **搜索结果为空**
   - 检查书源是否可用
   - 验证搜索关键词是否合适
   - 查看书源配置中的选择器是否正确

2. **无法获取章节列表**
   - 确认章节列表URL是否正确
   - 检查章节列表选择器配置

3. **章节内容获取失败**
   - 验证章节URL是否正确
   - 检查内容选择器配置
   - 网站可能有反爬虫措施

### 7.2 调试方法

1. 使用测试脚本验证书源配置
2. 检查网络请求和响应
3. 查看服务器日志以获取详细错误信息
4. 使用浏览器开发工具分析目标网页结构

## 8. 后续改进

- 添加更多网站的书源配置
- 实现内容缓存和离线阅读
- 开发书源编辑器UI
- 添加更多个性化阅读设置
- 实现多线程并发抓取
- 支持图片内容的解析和展示
- 集成AI推荐功能 