/**
 * 通用功能模块
 * 包含在所有页面中共享的功能
 */

/**
 * 检查管理员权限并显示相应的菜单项
 */
function checkAndShowAdminMenu() {
  console.log('检查管理员权限...');
  try {
    // 从localStorage获取用户数据
    const authData = localStorage.getItem('bookstore_auth');
    if (authData) {
      const userData = JSON.parse(authData).user;
      console.log('当前用户信息:', userData ? userData.username : '未找到用户数据');
      
      // 检查用户是否为管理员
      if (userData && (userData.role === 'admin' || userData.roles?.includes('admin') || userData.isAdmin === true)) {
        console.log('当前用户具有管理员权限，显示管理员菜单');
        // 显示所有管理员菜单项
        const adminLinks = document.querySelectorAll('.admin-only-link');
        adminLinks.forEach(link => {
          console.log('显示管理员菜单项:', link);
          link.style.display = 'flex';
        });
      } else {
        console.log('当前用户不具有管理员权限');
      }
    } else {
      console.log('未找到用户认证数据');
    }
  } catch (error) {
    console.error('检查管理员权限失败:', error);
  }
}

/**
 * 初始化导航菜单
 */
function initNavMenu() {
  // 移动端菜单切换
  const menuButton = document.querySelector('.menu-button');
  const navMenu = document.querySelector('.nav-menu');
  
  if (menuButton && navMenu) {
    menuButton.addEventListener('click', function() {
      navMenu.classList.toggle('hidden');
    });
  }
}

// 在页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('common.js: 页面已加载，执行初始化...');
  initNavMenu();
  
  // 延迟执行，确保localStorage和DOM都已完全加载
  setTimeout(checkAndShowAdminMenu, 100);
});

// 导出函数以便在其他脚本中使用
window.commonUtils = {
  checkAndShowAdminMenu,
  initNavMenu
}; 