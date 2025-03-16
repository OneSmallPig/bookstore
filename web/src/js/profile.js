/**
 * profile.js
 * 处理个人资料页面的功能
 */

import { isLoggedIn, getCurrentUser, logout } from './auth.js';
import { showToast } from './utils.js';

// 当前用户数据
let currentUser = null;

// 初始化个人资料页面
function initProfilePage() {
  console.log('初始化个人资料页面');
  
  // 检查用户是否已登录
  if (!isLoggedIn()) {
    console.log('用户未登录，重定向到登录页面');
    window.location.href = 'login.html';
    return;
  }
  
  // 获取当前用户信息
  currentUser = getCurrentUser();
  console.log('当前用户信息:', currentUser);
  
  if (!currentUser) {
    console.log('无法获取用户信息，重定向到登录页面');
    window.location.href = 'login.html';
    return;
  }
  
  // 更新页面上的用户信息
  updateProfileUI();
  
  // 绑定退出登录按钮事件
  bindLogoutButton();
  
  // 绑定其他按钮事件
  bindOtherButtons();
}

// 更新个人资料页面UI
function updateProfileUI() {
  if (!currentUser) return;
  
  // 更新用户名
  const usernameElements = document.querySelectorAll('.profile-username');
  usernameElements.forEach(element => {
    if (element) element.textContent = currentUser.username || '未知用户';
  });
  
  // 更新用户头像
  const avatarElements = document.querySelectorAll('.profile-avatar');
  avatarElements.forEach(element => {
    if (element && currentUser.avatar) {
      element.style.backgroundImage = `url(${currentUser.avatar})`;
    }
  });
  
  // 更新其他用户信息
  // 这里可以根据实际需求添加更多的信息更新
}

// 绑定退出登录按钮事件
function bindLogoutButton() {
  console.log('绑定退出登录按钮事件');
  
  // 查找退出登录按钮
  const logoutButton = document.getElementById('logout-button');
  
  if (logoutButton) {
    console.log('找到退出登录按钮');
    
    // 移除可能已存在的事件监听器
    const newLogoutButton = logoutButton.cloneNode(true);
    logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
    
    // 添加点击事件
    newLogoutButton.addEventListener('click', (e) => {
      console.log('退出登录按钮被点击');
      e.preventDefault();
      
      // 显示确认对话框
      if (confirm('确定要退出登录吗？')) {
        // 调用登出函数
        logout();
        
        // 显示提示
        showToast('已成功退出登录', 'success');
        
        // 重定向到登录页面
        setTimeout(() => {
          // 检查当前路径，确定正确的登录页面路径
          const currentPath = window.location.pathname;
          
          if (currentPath.includes('/src/pages/')) {
            // 如果当前在pages目录下，使用相对路径
            window.location.href = 'login.html';
          } else {
            // 如果不在pages目录下，使用带目录的路径
            window.location.href = '/src/pages/login.html';
          }
        }, 1000);
      }
    });
  } else {
    console.error('未找到退出登录按钮');
  }
}

// 绑定其他按钮事件
function bindOtherButtons() {
  // 编辑资料按钮
  const editProfileButton = document.querySelector('button.btn-primary');
  if (editProfileButton) {
    editProfileButton.addEventListener('click', () => {
      // 显示编辑资料表单或跳转到编辑页面
      alert('编辑资料功能正在开发中...');
    });
  }
  
  // 设置选项按钮
  const settingItems = document.querySelectorAll('.divide-y > div:not(:last-child)');
  settingItems.forEach(item => {
    item.addEventListener('click', () => {
      const settingName = item.querySelector('span').textContent;
      alert(`${settingName}功能正在开发中...`);
    });
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initProfilePage);

// 导出函数
export {
  initProfilePage,
  updateProfileUI,
  bindLogoutButton
}; 