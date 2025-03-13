/**
 * API服务
 * 用于与后端API进行交互
 */

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 通用请求函数
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 默认请求头
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // 如果有token，添加到请求头
  const token = localStorage.getItem('token');
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
  getBookshelf: () => {
    return request('/bookshelf');
  },
  
  // 添加书籍到书架
  addToBookshelf: (bookId) => {
    return request('/bookshelf/books', {
      method: 'POST',
      body: JSON.stringify({ bookId })
    });
  },
  
  // 从书架移除书籍
  removeFromBookshelf: (bookId) => {
    return request(`/bookshelf/books/${bookId}`, {
      method: 'DELETE'
    });
  },
  
  // 更新阅读进度
  updateReadingProgress: (bookId, progress) => {
    return request(`/bookshelf/books/${bookId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress })
    });
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