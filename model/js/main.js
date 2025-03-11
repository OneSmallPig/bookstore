/**
 * 百变书屋 - 主脚本文件
 * 处理页面交互和功能
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  // 初始化导航栏交互
  initNavigation();
  
  // 初始化搜索功能
  initSearch();
  
  // 初始化书籍卡片交互
  initBookCards();
  
  // 初始化阅读器功能
  initReader();
  
  // 初始化个人书架功能
  initBookshelf();
  
  // 初始化社区功能
  initCommunity();
});

/**
 * 初始化导航栏交互
 */
function initNavigation() {
  // 获取导航菜单按钮和导航菜单
  const menuButton = document.querySelector('.menu-button');
  const navMenu = document.querySelector('.nav-menu');
  
  // 如果存在菜单按钮，添加点击事件
  if (menuButton && navMenu) {
    menuButton.addEventListener('click', function() {
      navMenu.classList.toggle('hidden');
    });
  }
  
  // 处理导航项的活动状态
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      // 移除所有导航项的活动状态
      navItems.forEach(i => i.classList.remove('active'));
      // 添加当前项的活动状态
      this.classList.add('active');
    });
  });
}

/**
 * 初始化搜索功能
 */
function initSearch() {
  const searchForm = document.querySelector('.search-form');
  const searchInput = document.querySelector('.search-input');
  
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const query = searchInput.value.trim();
      if (query) {
        // 模拟AI搜索处理
        simulateAISearch(query);
      }
    });
  }
}

/**
 * 模拟AI搜索处理
 * @param {string} query - 搜索查询
 */
function simulateAISearch(query) {
  const resultsContainer = document.querySelector('.search-results');
  
  if (resultsContainer) {
    // 显示加载状态
    resultsContainer.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i><p class="mt-4">AI正在分析您的需求，请稍候...</p></div>';
    
    // 模拟API请求延迟
    setTimeout(() => {
      // 这里应该是实际的API请求
      // 现在使用模拟数据
      const mockResults = [
        {
          id: 1,
          title: '深度学习',
          author: '伊恩·古德费洛',
          cover: 'https://via.placeholder.com/150x225',
          rating: 4.8,
          tags: ['人工智能', '计算机科学', '数学'],
          summary: '这本书是人工智能领域的经典之作，详细介绍了深度学习的基本原理和应用。'
        },
        {
          id: 2,
          title: '人类简史',
          author: '尤瓦尔·赫拉利',
          cover: 'https://via.placeholder.com/150x225',
          rating: 4.7,
          tags: ['历史', '人类学', '科普'],
          summary: '从认知革命到人工智能时代，讲述了人类如何征服世界的历史。'
        },
        {
          id: 3,
          title: '未来简史',
          author: '尤瓦尔·赫拉利',
          cover: 'https://via.placeholder.com/150x225',
          rating: 4.6,
          tags: ['未来学', '科技', '哲学'],
          summary: '探讨了生物技术和人工智能如何改变人类社会的未来图景。'
        }
      ];
      
      // 渲染搜索结果
      renderSearchResults(mockResults);
    }, 2000);
  }
}

/**
 * 渲染搜索结果
 * @param {Array} results - 搜索结果数组
 */
function renderSearchResults(results) {
  const resultsContainer = document.querySelector('.search-results');
  
  if (resultsContainer) {
    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="text-center py-8"><p>没有找到相关书籍，请尝试其他关键词。</p></div>';
      return;
    }
    
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">';
    
    results.forEach(book => {
      html += `
        <div class="book-card bg-white p-4">
          <div class="flex">
            <img src="${book.cover}" alt="${book.title}" class="book-cover w-24 h-36">
            <div class="ml-4 flex-1">
              <h3 class="font-bold text-lg">${book.title}</h3>
              <p class="text-gray-600">${book.author}</p>
              <div class="rating mt-1">
                ${getRatingStars(book.rating)}
                <span class="text-gray-600 text-sm ml-1">${book.rating}</span>
              </div>
              <div class="mt-2 flex flex-wrap gap-1">
                ${book.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            </div>
          </div>
          <p class="mt-3 text-gray-700 text-sm">${book.summary}</p>
          <div class="mt-4 flex justify-between">
            <button class="btn-primary text-sm py-1 px-3">阅读</button>
            <button class="btn-secondary text-sm py-1 px-3">加入书架</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    resultsContainer.innerHTML = html;
    
    // 初始化新渲染的书籍卡片
    initBookCards();
  }
}

/**
 * 获取评分星星HTML
 * @param {number} rating - 评分（0-5）
 * @returns {string} 星星HTML
 */
function getRatingStars(rating) {
  let html = '';
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  
  // 添加实心星星
  for (let i = 0; i < fullStars; i++) {
    html += '<i class="fas fa-star"></i>';
  }
  
  // 添加半星（如果需要）
  if (halfStar) {
    html += '<i class="fas fa-star-half-alt"></i>';
  }
  
  // 添加空心星星
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="far fa-star"></i>';
  }
  
  return html;
}

/**
 * 初始化书籍卡片交互
 */
function initBookCards() {
  const bookCards = document.querySelectorAll('.book-card');
  
  bookCards.forEach(card => {
    // 阅读按钮
    const readBtn = card.querySelector('.btn-primary');
    if (readBtn) {
      readBtn.addEventListener('click', function() {
        const bookId = this.closest('.book-card').dataset.id;
        // 跳转到阅读页面或打开阅读模态框
        console.log('打开阅读页面，书籍ID:', bookId);
      });
    }
    
    // 加入书架按钮
    const addBtn = card.querySelector('.btn-secondary');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        const bookId = this.closest('.book-card').dataset.id;
        // 添加到书架
        console.log('添加到书架，书籍ID:', bookId);
        // 显示成功提示
        showToast('已添加到书架');
      });
    }
  });
}

/**
 * 显示提示消息
 * @param {string} message - 提示消息
 * @param {string} type - 提示类型（success, error, info）
 */
function showToast(message, type = 'success') {
  // 创建提示元素
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    'bg-blue-500'
  } shadow-lg z-50 transition-opacity duration-300`;
  toast.textContent = message;
  
  // 添加到页面
  document.body.appendChild(toast);
  
  // 2秒后淡出
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

/**
 * 初始化阅读器功能
 */
function initReader() {
  const reader = document.querySelector('.reader-container');
  
  if (reader) {
    // 字体大小调整
    const fontSizeButtons = reader.querySelectorAll('.font-size-btn');
    const readerText = reader.querySelector('.reader-text');
    
    if (fontSizeButtons.length && readerText) {
      fontSizeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const size = this.dataset.size;
          const currentSize = parseInt(window.getComputedStyle(readerText).fontSize);
          
          if (size === 'increase') {
            readerText.style.fontSize = `${currentSize + 2}px`;
          } else if (size === 'decrease') {
            readerText.style.fontSize = `${Math.max(currentSize - 2, 12)}px`;
          } else if (size === 'reset') {
            readerText.style.fontSize = '18px';
          }
        });
      });
    }
    
    // 主题切换
    const themeButtons = reader.querySelectorAll('.theme-btn');
    
    if (themeButtons.length) {
      themeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const theme = this.dataset.theme;
          
          // 移除所有主题类
          reader.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
          
          // 添加选中的主题类
          reader.classList.add(`theme-${theme}`);
        });
      });
    }
  }
}

/**
 * 初始化个人书架功能
 */
function initBookshelf() {
  const bookshelf = document.querySelector('.bookshelf-container');
  
  if (bookshelf) {
    // 分类切换
    const categoryTabs = bookshelf.querySelectorAll('.category-tab');
    const categoryContents = bookshelf.querySelectorAll('.category-content');
    
    if (categoryTabs.length && categoryContents.length) {
      categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
          const category = this.dataset.category;
          
          // 更新标签活动状态
          categoryTabs.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          
          // 更新内容显示
          categoryContents.forEach(content => {
            if (content.dataset.category === category) {
              content.classList.remove('hidden');
            } else {
              content.classList.add('hidden');
            }
          });
        });
      });
    }
  }
}

/**
 * 初始化社区功能
 */
function initCommunity() {
  const community = document.querySelector('.community-container');
  
  if (community) {
    // 点赞功能
    const likeButtons = community.querySelectorAll('.like-btn');
    
    if (likeButtons.length) {
      likeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const postId = this.closest('.post-card').dataset.id;
          const likeCount = this.querySelector('.like-count');
          
          // 切换点赞状态
          this.classList.toggle('liked');
          
          // 更新点赞数
          if (likeCount) {
            let count = parseInt(likeCount.textContent);
            if (this.classList.contains('liked')) {
              likeCount.textContent = count + 1;
            } else {
              likeCount.textContent = Math.max(count - 1, 0);
            }
          }
          
          // 这里应该发送API请求更新点赞状态
          console.log('切换点赞状态，帖子ID:', postId);
        });
      });
    }
    
    // 评论功能
    const commentForms = community.querySelectorAll('.comment-form');
    
    if (commentForms.length) {
      commentForms.forEach(form => {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          
          const postId = this.closest('.post-card').dataset.id;
          const commentInput = this.querySelector('.comment-input');
          const commentsContainer = this.closest('.post-card').querySelector('.comments-container');
          
          if (commentInput && commentsContainer) {
            const comment = commentInput.value.trim();
            
            if (comment) {
              // 添加新评论
              const newComment = document.createElement('div');
              newComment.className = 'comment-item p-3 border-t border-gray-100';
              newComment.innerHTML = `
                <div class="flex items-start">
                  <div class="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>
                  <div class="ml-3 flex-1">
                    <div class="font-medium">当前用户</div>
                    <p class="text-gray-700">${comment}</p>
                    <div class="text-gray-400 text-xs mt-1">刚刚</div>
                  </div>
                </div>
              `;
              
              commentsContainer.appendChild(newComment);
              
              // 清空输入框
              commentInput.value = '';
              
              // 这里应该发送API请求保存评论
              console.log('添加评论，帖子ID:', postId, '评论内容:', comment);
            }
          }
        });
      });
    }
  }
} 