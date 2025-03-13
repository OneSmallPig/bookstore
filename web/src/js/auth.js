/**
 * 认证相关功能模块
 * 处理用户登录、注册、登出等认证相关功能
 */

import { userApi } from './api.js';
import { showToast } from './utils.js';

// 用户认证状态
const AUTH_KEY = 'bookstore_auth';

/**
 * 获取当前登录用户信息
 * @returns {Object|null} 用户信息或null（未登录）
 */
export function getCurrentUser() {
  try {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return null;
    
    const { user, token, expiry } = JSON.parse(authData);
    
    // 检查token是否过期
    if (expiry && new Date(expiry) < new Date()) {
      logout();
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 获取认证令牌
 * @returns {string|null} 认证令牌或null
 */
export function getAuthToken() {
  try {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return null;
    
    const { token, expiry } = JSON.parse(authData);
    
    // 检查token是否过期
    if (expiry && new Date(expiry) < new Date()) {
      logout();
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('获取认证令牌失败:', error);
    return null;
  }
}

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
export function isLoggedIn() {
  return !!getAuthToken();
}

/**
 * 保存认证信息到本地存储
 * @param {Object} user 用户信息
 * @param {string} token 认证令牌
 * @param {number} expiresIn 过期时间（秒）
 */
export function saveAuth(user, token, expiresIn = 86400) {
  try {
    // 计算过期时间
    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + expiresIn);
    
    // 保存认证信息
    const authData = {
      user,
      token,
      expiry: expiry.toISOString()
    };
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    
    // 触发登录事件
    window.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));
  } catch (error) {
    console.error('保存认证信息失败:', error);
  }
}

/**
 * 用户登录
 * @param {string} username 用户名或邮箱
 * @param {string} password 密码
 * @returns {Promise<Object>} 登录结果
 */
export async function login(username, password) {
  try {
    // 将username作为email传递给API
    const response = await userApi.login({ email: username, password });
    
    // 保存认证信息
    saveAuth(response.user, response.token, response.expiresIn);
    
    return response;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

/**
 * 用户注册
 * @param {string} username 用户名
 * @param {string} email 邮箱
 * @param {string} password 密码
 * @returns {Promise<Object>} 注册结果
 */
export async function register(username, email, password) {
  try {
    const response = await userApi.register({ username, email, password });
    return response;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}

/**
 * 用户登出
 */
export function logout() {
  try {
    // 清除本地存储中的认证信息
    localStorage.removeItem(AUTH_KEY);
    
    // 触发登出事件
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    // 重定向到登录页面
    window.location.href = '/src/pages/login.html';
  } catch (error) {
    console.error('登出失败:', error);
  }
}

/**
 * 检查是否需要登录，如果未登录则重定向到登录页面
 * @param {boolean} redirect 是否重定向到登录页面
 * @returns {boolean} 是否已登录
 */
export function requireAuth(redirect = true) {
  const loggedIn = isLoggedIn();
  
  if (!loggedIn && redirect) {
    // 保存当前URL，登录后可以返回
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('auth_redirect', currentPath);
    
    // 重定向到登录页面
    window.location.href = '/src/pages/login.html';
  }
  
  return loggedIn;
}

/**
 * 登录后重定向到之前的页面
 */
export function redirectAfterLogin() {
  try {
    const redirectPath = sessionStorage.getItem('auth_redirect');
    sessionStorage.removeItem('auth_redirect');
    
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      // 直接重定向到首页
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('重定向失败:', error);
    window.location.href = 'index.html';
  }
}

/**
 * 初始化认证监听器
 */
export function initAuthListeners() {
  // 监听登录事件
  window.addEventListener('auth:login', (event) => {
    const user = event.detail.user;
    console.log('用户已登录:', user.username);
    
    // 更新UI显示
    updateAuthUI();
  });
  
  // 监听登出事件
  window.addEventListener('auth:logout', () => {
    console.log('用户已登出');
    
    // 更新UI显示
    updateAuthUI();
  });
  
  // 初始化时更新UI
  updateAuthUI();
}

/**
 * 更新认证相关UI元素
 */
export function updateAuthUI() {
  try {
    const user = getCurrentUser();
    const isLoggedIn = !!user;
    
    // 更新个人信息按钮
    const profileButtons = document.querySelectorAll('.profile-button');
    profileButtons.forEach(button => {
      if (isLoggedIn) {
        button.setAttribute('data-logged-in', 'true');
        button.setAttribute('data-username', user.username);
        
        // 设置href
        button.setAttribute('href', '/src/pages/profile.html');
      } else {
        button.setAttribute('data-logged-in', 'false');
        button.removeAttribute('data-username');
        
        // 设置href
        button.setAttribute('href', '/src/pages/login.html');
      }
    });
    
    // 更新登录/登出按钮
    const loginButtons = document.querySelectorAll('.login-button');
    const logoutButtons = document.querySelectorAll('.logout-button');
    
    loginButtons.forEach(button => {
      button.style.display = isLoggedIn ? 'none' : 'inline-flex';
    });
    
    logoutButtons.forEach(button => {
      button.style.display = isLoggedIn ? 'inline-flex' : 'none';
      
      // 添加登出事件
      if (!button.hasAttribute('data-logout-initialized')) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          logout();
          showToast('您已成功登出');
        });
        button.setAttribute('data-logout-initialized', 'true');
      }
    });
    
    // 更新用户名显示
    const usernameElements = document.querySelectorAll('.username-display');
    usernameElements.forEach(element => {
      if (isLoggedIn) {
        element.textContent = user.username;
        element.classList.remove('hidden');
      } else {
        element.classList.add('hidden');
      }
    });
    
  } catch (error) {
    console.error('更新认证UI失败:', error);
  }
}

// 导出默认对象
export default {
  getCurrentUser,
  getAuthToken,
  isLoggedIn,
  login,
  register,
  logout,
  requireAuth,
  redirectAfterLogin,
  initAuthListeners,
  updateAuthUI
}; 