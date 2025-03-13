// profile-button.js
// 处理个人资料按钮的点击事件

import { isLoggedIn, getCurrentUser } from './auth.js';

console.log('profile-button.js 文件已加载');

// 导出初始化函数
export function initProfileButton() {
  console.log('开始初始化个人资料按钮处理程序');
  
  // 使用更精确的选择器，确保能找到正确的按钮
  // 1. 首先尝试找到导航栏中的个人资料按钮
  const navProfileButton = document.querySelector('.navbar .profile-button');
  console.log('导航栏中的个人资料按钮:', navProfileButton);
  
  // 2. 尝试找到所有可能的个人资料按钮
  const allProfileButtons = document.querySelectorAll('.profile-button');
  console.log('所有可能的个人资料按钮数量:', allProfileButtons.length);
  
  // 如果找到导航栏中的按钮，为其添加点击事件
  if (navProfileButton) {
    console.log('为导航栏中的个人资料按钮添加点击事件');
    
    // 移除可能已存在的事件监听器
    navProfileButton.removeEventListener('click', profileButtonClickHandler);
    
    // 添加新的事件监听器
    navProfileButton.addEventListener('click', profileButtonClickHandler);
    
    // 更新按钮状态
    updateProfileButton(navProfileButton);
  } else {
    console.warn('未找到导航栏中的个人资料按钮');
  }
  
  // 为所有可能的个人资料按钮添加点击事件
  allProfileButtons.forEach((button, index) => {
    console.log(`为第 ${index + 1} 个可能的个人资料按钮添加点击事件`);
    
    // 移除可能已存在的事件监听器
    button.removeEventListener('click', profileButtonClickHandler);
    
    // 添加新的事件监听器
    button.addEventListener('click', profileButtonClickHandler);
    
    // 更新按钮状态
    updateProfileButton(button);
  });
  
  // 监听登录状态变化
  window.addEventListener('auth:login', () => {
    console.log('检测到登录事件，更新所有个人资料按钮');
    allProfileButtons.forEach(button => updateProfileButton(button));
  });
  
  window.addEventListener('auth:logout', () => {
    console.log('检测到登出事件，更新所有个人资料按钮');
    allProfileButtons.forEach(button => updateProfileButton(button));
  });
}

// 更新个人资料按钮状态
function updateProfileButton(button) {
  if (!button) return;
  
  const loggedIn = isLoggedIn();
  const user = getCurrentUser();
  
  console.log('更新个人资料按钮状态:', { loggedIn, user: user ? user.username : null });
  
  if (loggedIn && user) {
    // 用户已登录
    button.setAttribute('data-logged-in', 'true');
    button.setAttribute('data-username', user.username);
    
    // 设置href
    button.setAttribute('href', '/src/pages/profile.html');
    
    // 如果按钮有头像元素，可以更新头像
    const avatar = button.querySelector('.avatar');
    if (avatar) {
      // 如果用户有头像，可以设置头像图片
      if (user.avatar) {
        avatar.style.backgroundImage = `url(${user.avatar})`;
      } else {
        // 否则显示用户名首字母
        const initial = user.username.charAt(0).toUpperCase();
        avatar.textContent = initial;
      }
    }
  } else {
    // 用户未登录
    button.setAttribute('data-logged-in', 'false');
    button.removeAttribute('data-username');
    
    // 设置href
    button.setAttribute('href', '/src/pages/login.html');
    
    // 重置头像
    const avatar = button.querySelector('.avatar');
    if (avatar) {
      avatar.textContent = '';
      avatar.style.backgroundImage = '';
    }
  }
}

// 个人资料按钮点击事件处理函数
function profileButtonClickHandler(e) {
  console.log('个人资料按钮被点击');
  e.preventDefault();
  
  // 检查用户是否已登录
  const loggedIn = isLoggedIn();
  console.log('用户登录状态:', loggedIn);
  
  if (loggedIn) {
    // 用户已登录，跳转到个人资料页面
    console.log('跳转到个人资料页面');
    window.location.href = '/src/pages/profile.html';
  } else {
    // 用户未登录，跳转到登录页面
    console.log('跳转到登录页面');
    
    // 保存当前URL，登录后可以返回
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('auth_redirect', currentPath);
    
    // 跳转到登录页面
    window.location.href = '/src/pages/login.html';
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', initProfileButton);

// 导出默认对象
export default {
  initProfileButton,
  updateProfileButton
}; 