/**
 * API服务
 * 用于与后端API进行交互
 */

// 导入统一配置
import config from './config.js';

// 获取认证令牌函数
function getToken() {
  return localStorage.getItem(config.cache.keys.AUTH_TOKEN) ? 
    JSON.parse(localStorage.getItem(config.cache.keys.AUTH_TOKEN)).token : null;
}

// 通用请求函数
async function request(endpoint, options = {}) {
  const url = `${config.api.baseUrl}${endpoint}`;
  console.log(`开始请求: ${url}`, options);
  
  // 默认请求头
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // 如果有token，添加到请求头
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  console.log(`请求头:`, headers);
  
  try {
    console.log(`执行fetch: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    console.log(`收到响应: ${url}, 状态:`, response.status);
    
    // 检查响应状态
    if (!response.ok) {
      // 如果是401错误，可能是token过期
      if (response.status === 401) {
        localStorage.removeItem(config.cache.keys.AUTH_TOKEN);
        // 可以在这里添加重定向到登录页面的逻辑
      }
      
      const errorData = await response.json();
      console.error(`请求失败: ${url}`, errorData);
      throw new Error(errorData.message || '请求失败');
    }
    
    // 如果响应是204 No Content，直接返回true
    if (response.status === 204) {
      console.log(`请求成功(无内容): ${url}`);
      return true;
    }
    
    const data = await response.json();
    console.log(`请求成功: ${url}`, data);
    return data;
  } catch (error) {
    console.error('API请求错误:', url, error);
    throw error;
  }
}

// 用户相关API
const userApi = {
  // 用户注册
  register: (userData) => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  // 用户登录
  login: (credentials) => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  
  // 获取当前用户信息
  getCurrentUser: () => {
    return request('/users/me');
  },
  
  // 更新用户信息
  updateProfile: (userData) => {
    return request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },
  
  // 保存搜索历史
  saveSearchHistory: (searchData) => {
    return request('/users/search-history', {
      method: 'POST',
      body: JSON.stringify(searchData)
    });
  },
  
  // 获取搜索历史
  getSearchHistory: () => {
    return request('/users/search-history');
  },
  
  // 删除搜索历史
  deleteSearchHistory: (searchId) => {
    return request(`/users/search-history/${searchId}`, {
      method: 'DELETE'
    });
  },
  
  // 清空所有搜索历史
  clearSearchHistory: () => {
    return request('/users/search-history', {
      method: 'DELETE'
    });
  },
  
  // 修改密码
  changePassword: (passwordData) => {
    return request('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  },
  
  // 发送密码重置验证码
  sendResetCode: (data) => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // 验证重置密码验证码
  verifyResetCode: (data) => {
    return request('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // 重置密码
  resetPassword: (data) => {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// 书籍相关API
const bookApi = {
  // 获取书籍列表
  getBooks: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return request(`/books?${queryParams}`);
  },
  
  // 获取书籍详情
  getBookById: (bookId) => {
    return request(`/books/${bookId}`);
  },
  
  // 搜索书籍
  searchBooks: (query) => {
    return request(`/books/search?q=${encodeURIComponent(query)}`);
  },
  
  // AI推荐书籍
  getRecommendations: (preferences) => {
    return request('/books/recommendations', {
      method: 'POST',
      body: JSON.stringify(preferences)
    });
  }
};

// 书架相关API
const bookshelfApi = {
  // 获取用户书架
  async getBookshelf(status = null, sort = null, order = null) {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      if (sort) queryParams.append('sort', sort);
      if (order) queryParams.append('order', order);
      
      const queryString = queryParams.toString();
      const url = `${config.api.baseUrl}/users/bookshelf${queryString ? `?${queryString}` : ''}`;
      
      console.log('获取书架API请求URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取书架失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('获取书架API响应:', data);
      return data;
    } catch (error) {
      console.error('获取书架错误:', error);
      throw error;
    }
  },
  
  // 获取书架书籍信息（新接口）
  async getBookshelfBooks(params = {}) {
    try {
      console.log('调用getBookshelfBooks API，参数:', params);
      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      
      // 添加搜索参数
      if (params.query) queryParams.append('query', params.query);
      
      // 添加阅读状态参数
      if (params.status) queryParams.append('status', params.status);
      
      // 添加排序参数
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.order) queryParams.append('order', params.order);
      
      // 添加用户ID参数（如果需要查看其他用户的书架）
      if (params.userId) queryParams.append('userId', params.userId);
      
      // 添加分页参数
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      
      const queryString = queryParams.toString();
      const url = `${config.api.baseUrl}/bookshelf/books${queryString ? `?${queryString}` : ''}`;
      
      console.log('获取书架书籍API请求URL:', url);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          }
        });
        
        if (!response.ok) {
          console.log('API响应不成功，状态码:', response.status);
          throw new Error(`获取书架书籍失败: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('获取书架书籍API响应:', data);
        
        // 如果服务器端API尚未实现，在客户端进行过滤
        if ((!data.success || !data.data) && window.currentBookshelfData) {
          console.log('服务器API未实现或返回数据格式不正确，使用客户端过滤');
          return clientSideFilterBooks(window.currentBookshelfData, params);
        }
        
        return data;
      } catch (error) {
        console.error('API请求失败:', error);
        // 如果API请求失败，尝试在客户端进行过滤
        if (window.currentBookshelfData) {
          console.log('API请求失败，使用客户端过滤');
          return clientSideFilterBooks(window.currentBookshelfData, params);
        }
        throw error;
      }
    } catch (error) {
      console.error('获取书架书籍错误:', error);
      
      // 如果API请求失败，尝试在客户端进行过滤
      if (window.currentBookshelfData) {
        console.log('API请求失败，使用客户端过滤');
        return clientSideFilterBooks(window.currentBookshelfData, params);
      }
      
      throw error;
    }
  },
  
  // 添加书籍到书架
  async addToBookshelf(bookId, status = 'toRead') {
    try {
      const response = await fetch(`${config.api.baseUrl}/books/${bookId}/bookshelf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error(`添加书籍到书架失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('添加书籍到书架错误:', error);
      throw error;
    }
  },
  
  // 从书架移除书籍
  async removeFromBookshelf(bookId) {
    try {
      const response = await fetch(`${config.api.baseUrl}/books/${bookId}/bookshelf`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`从书架移除书籍失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('从书架移除书籍错误:', error);
      throw error;
    }
  },
  
  // 更新阅读进度
  async updateReadingProgress(bookId, progress) {
    try {
      const response = await fetch(`${config.api.baseUrl}/books/${bookId}/reading-progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ progress })
      });
      
      if (!response.ok) {
        throw new Error(`更新阅读进度失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('更新阅读进度错误:', error);
      throw error;
    }
  },
  
  // 搜索书架
  async searchBookshelf(query) {
    try {
      // 使用新的getBookshelfBooks接口
      return await this.getBookshelfBooks({ query });
    } catch (error) {
      console.error('搜索书架错误:', error);
      throw error;
    }
  }
};

// 客户端过滤书籍
function clientSideFilterBooks(books, params = {}) {
  console.log('执行客户端过滤，原始书籍数量:', books ? books.length : 0, '过滤参数:', params);
  
  if (!books || !Array.isArray(books)) {
    console.error('无效的书籍数据:', books);
    return {
      success: true,
      data: {
        bookshelf: [],
        total: 0,
        page: params.page || 1,
        limit: params.limit || 10
      }
    };
  }
  
  let filteredBooks = [...books];
  
  // 按搜索词过滤
  if (params.query) {
    const query = params.query.toLowerCase();
    console.log('按搜索词过滤:', query);
    
    filteredBooks = filteredBooks.filter(book => {
      // 确保book对象存在
      if (!book) return false;
      
      const bookInfo = book.Book || book;
      
      // 提取需要搜索的字段
      const title = (bookInfo.title || '').toLowerCase();
      const author = (bookInfo.author || '').toLowerCase();
      const description = (bookInfo.description || '').toLowerCase();
      
      // 检查是否匹配
      const matchTitle = title.includes(query);
      const matchAuthor = author.includes(query);
      const matchDescription = description.includes(query);
      
      return matchTitle || matchAuthor || matchDescription;
    });
    
    console.log('搜索词过滤后的书籍数量:', filteredBooks.length);
  }
  
  // 按阅读状态过滤
  if (params.status) {
    console.log('按阅读状态过滤:', params.status);
    
    filteredBooks = filteredBooks.filter(book => {
      // 确保book对象存在
      if (!book) return false;
      
      const bookInfo = book.Book || book;
      const status = bookInfo.status || bookInfo.readingStatus || '';
      const progress = bookInfo.readingProgress || bookInfo.progress || 0;
      
      if (params.status === 'reading') {
        return status === 'reading' || (progress > 0 && progress < 100);
      } else if (params.status === 'completed') {
        return status === 'completed' || progress === 100;
      } else if (params.status === 'toRead') {
        return status === 'toRead' || progress === 0;
      }
      
      return true;
    });
    
    console.log('状态过滤后的书籍数量:', filteredBooks.length);
  }
  
  // 排序
  if (params.sort) {
    console.log('按', params.sort, '排序，顺序:', params.order);
    
    filteredBooks.sort((a, b) => {
      // 确保a和b对象存在
      if (!a || !b) return 0;
      
      const bookInfoA = a.Book || a;
      const bookInfoB = b.Book || b;
      
      if (params.sort === 'title') {
        const result = (bookInfoA.title || '').localeCompare(bookInfoB.title || '');
        return params.order === 'desc' ? -result : result;
      } else if (params.sort === 'author') {
        const result = (bookInfoA.author || '').localeCompare(bookInfoB.author || '');
        return params.order === 'desc' ? -result : result;
      } else if (params.sort === 'progress') {
        const progressA = bookInfoA.readingProgress || bookInfoA.progress || 0;
        const progressB = bookInfoB.readingProgress || bookInfoB.progress || 0;
        return params.order === 'desc' ? progressB - progressA : progressA - progressB;
      } else if (params.sort === 'addedAt') {
        const dateA = new Date(a.addedAt || a.lastReadAt || 0);
        const dateB = new Date(b.addedAt || b.lastReadAt || 0);
        return params.order === 'desc' ? dateB - dateA : dateA - dateB;
      }
      
      return 0;
    });
  }
  
  console.log('最终过滤和排序后的书籍数量:', filteredBooks.length);
  
  return {
    success: true,
    data: {
      bookshelf: filteredBooks,
      total: filteredBooks.length,
      page: params.page || 1,
      limit: params.limit || filteredBooks.length
    }
  };
}

// 社区相关API
const communityApi = {
  // 获取评论
  getComments: (bookId) => {
    return request(`/books/${bookId}/comments`);
  },
  
  // 添加评论
  addComment: (bookId, content) => {
    return request(`/books/${bookId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },
  
  // 点赞评论
  likeComment: (commentId) => {
    return request(`/comments/${commentId}/like`, {
      method: 'POST'
    });
  }
};

// AI相关API
const aiApi = {
  // 获取推荐书籍
  getRecommendations(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const queryString = queryParams ? `?${queryParams}` : '';
    return request(`/ai/recommended${queryString}`);
  },
  
  // 获取热门书籍
  getPopularBooks(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const queryString = queryParams ? `?${queryParams}` : '';
    return request(`/ai/popular${queryString}`);
  },
  
  // 获取热门搜索
  getPopularSearches(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const queryString = queryParams ? `?${queryParams}` : '';
    return request(`/ai/popular-searches${queryString}`);
  },
  
  // AI智能搜索书籍
  searchBooks(query, limit = 3) {
    return request('/ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        limit
      })
    });
  },
  
  // 获取AI搜索进度
  getSearchProgress(sessionId) {
    return request(`/ai/search-progress/${sessionId}`);
  }
};

// 导出API
export {
  userApi,
  bookApi,
  bookshelfApi,
  communityApi,
  aiApi
}; 