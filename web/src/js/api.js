/**
 * API服务
 * 用于与后端API进行交互
 */

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 获取认证令牌函数
function getToken() {
  return localStorage.getItem('bookstore_auth') ? 
    JSON.parse(localStorage.getItem('bookstore_auth')).token : null;
}

// 通用请求函数
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 默认请求头
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // 如果有token，添加到请求头
  // 使用auth.js中的getAuthToken函数获取认证令牌
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // 检查响应状态
    if (!response.ok) {
      // 如果是401错误，可能是token过期
      if (response.status === 401) {
        localStorage.removeItem('token');
        // 可以在这里添加重定向到登录页面的逻辑
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || '请求失败');
    }
    
    // 如果响应是204 No Content，直接返回true
    if (response.status === 204) {
      return true;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
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
      const url = `${API_BASE_URL}/users/bookshelf${queryString ? `?${queryString}` : ''}`;
      
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
  
  // 添加书籍到书架
  async addToBookshelf(bookId, status = 'toRead') {
    try {
      const response = await fetch(`${API_BASE_URL}/books/${bookId}/bookshelf`, {
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
      const response = await fetch(`${API_BASE_URL}/books/${bookId}/bookshelf`, {
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
      const response = await fetch(`${API_BASE_URL}/books/${bookId}/reading-progress`, {
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
      // 构建查询参数
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      
      const url = `${API_BASE_URL}/users/bookshelf/search?${queryParams.toString()}`;
      
      console.log('搜索书架API请求URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`搜索书架失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('搜索书架API响应:', data);
      return data;
    } catch (error) {
      console.error('搜索书架错误:', error);
      throw error;
    }
  }
};

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

// 导出API
export {
  userApi,
  bookApi,
  bookshelfApi,
  communityApi
}; 