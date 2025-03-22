// 获取认证令牌函数
function getAuthToken() {
  // 首先尝试直接从token获取
  const directToken = localStorage.getItem('token');
  if (directToken) {
    return directToken;
  }
  
  // 如果没有直接的token，尝试从bookstore_auth中获取
  try {
    const authData = localStorage.getItem('bookstore_auth');
    if (authData) {
      const parsedData = JSON.parse(authData);
      if (parsedData && parsedData.token) {
        return parsedData.token;
      }
    }
  } catch (e) {
    console.error('从bookstore_auth获取token失败:', e);
  }
  
  // 尝试从cachedToken获取
  const cachedToken = localStorage.getItem('cachedToken');
  if (cachedToken) {
    return cachedToken;
  }
  
  return null;
}

// 导入书源
async function importBookSources() {
  try {
    // 获取选项
    const overwriteExisting = document.getElementById('importOverwrite').checked;
    const enableAfterImport = document.getElementById('importEnable').checked;
    let sourceData = null;
    
    // 获取导入状态元素
    const importStatus = document.getElementById('importStatus');
    
    // 确定当前导入方式（文件或文本）
    const isFileImport = document.getElementById('fileImport').style.display !== 'none';
    
    // 获取书源数据
    if (isFileImport) {
      // 从文件导入
      const fileInput = document.getElementById('fileInput');
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('请先选择书源文件');
        return;
      }
      
      const file = fileInput.files[0];
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('请选择JSON格式的书源文件');
        return;
      }
      
      importStatus.innerHTML = `
        <div class="text-blue-500 mb-2">
          <i class="fas fa-spinner fa-spin mr-2"></i>正在读取文件...
        </div>
      `;
      
      // 读取文件内容
      sourceData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });
    } else {
      // 从文本导入
      const importText = document.getElementById('importText').value.trim();
      if (!importText) {
        alert('请先输入书源数据');
        return;
      }
      sourceData = importText;
    }
    
    importStatus.innerHTML = `
      <div class="text-blue-500 mb-2">
        <i class="fas fa-spinner fa-spin mr-2"></i>正在解析书源数据...
      </div>
    `;
    
    // 解析JSON数据
    let sources;
    try {
      const parsed = JSON.parse(sourceData);
      sources = Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      throw new Error('书源数据格式不正确，请确保是有效的JSON格式');
    }
    
    if (sources.length === 0) {
      alert('没有找到可导入的书源');
      return;
    }
    
    // 标准化书源数据，支持多种格式
    const normalizedSources = [];
    const skippedSources = [];
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      let normalizedSource;
      
      // 处理飞读小说格式书源 (来自样例数据)
      if (source.bookSourceName || source.bookSourceUrl) {
        normalizedSource = {
          name: source.bookSourceName || `导入书源_${Date.now()}_${i}`,
          url: source.bookSourceUrl || '',
          group: source.bookSourceGroup || '',
          icon: '',
          enabled: (source.enable !== false) && enableAfterImport,
          
          // 搜索规则
          searchUrl: source.ruleSearchUrl || '',
          searchList: source.ruleSearchList || '',
          searchName: source.ruleSearchName || '',
          searchAuthor: source.ruleSearchAuthor || '',
          searchDetail: source.ruleSearchNoteUrl || '',
          
          // 详情页规则
          detailName: source.ruleBookName || '',
          detailAuthor: source.ruleBookAuthor || '',
          detailCover: source.ruleCoverUrl || '',
          detailIntro: source.ruleIntroduce || '',
          detailChapterUrl: source.ruleChapterUrl || '',
          
          // 章节列表规则
          chapterList: source.ruleChapterList || '',
          chapterName: source.ruleChapterName || '',
          chapterLink: source.ruleContentUrl || '',
          
          // 内容规则
          contentRule: source.ruleBookContent || '',
          contentFilter: []
        };
      } 
      // 处理常规格式
      else if (source.name || source.url) {
        normalizedSource = {
          name: source.name || `导入书源_${Date.now()}_${i}`,
          url: source.url || '',
          group: source.group || '',
          icon: source.icon || '',
          enabled: enableAfterImport,
          
          searchUrl: source.searchUrl || '',
          searchList: source.searchList || '',
          searchName: source.searchName || '',
          searchAuthor: source.searchAuthor || '',
          searchDetail: source.searchDetail || '',
          
          detailName: source.detailName || '',
          detailAuthor: source.detailAuthor || '',
          detailCover: source.detailCover || '',
          detailIntro: source.detailIntro || '',
          detailChapterUrl: source.detailChapterUrl || '',
          
          chapterList: source.chapterList || '',
          chapterName: source.chapterName || '',
          chapterLink: source.chapterLink || '',
          
          contentRule: source.contentRule || '',
          contentFilter: source.contentFilter || []
        };
      } else {
        skippedSources.push(source);
        continue;
      }
      
      // 验证必要字段
      if (!normalizedSource.url) {
        skippedSources.push(source);
        continue;
      }
      
      // 添加默认值
      if (!normalizedSource.searchUrl && normalizedSource.url) {
        normalizedSource.searchUrl = `${normalizedSource.url}/search?keyword={keyword}`;
      }
      
      normalizedSources.push(normalizedSource);
    }
    
    if (normalizedSources.length === 0) {
      throw new Error(`没有找到有效的书源数据 (已跳过 ${skippedSources.length} 个无效书源)`);
    }
    
    // 创建进度条UI
    importStatus.innerHTML = `
      <div class="mb-3">
        <div class="text-blue-500 mb-2">
          <i class="fas fa-spinner fa-spin mr-2"></i>正在提交导入请求...
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div id="importProgressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
        </div>
        <div class="text-sm text-gray-600 mt-1">
          <span id="importProgressText">准备中...</span>
          <span class="float-right" id="importProgressPercent">0%</span>
        </div>
      </div>
      <div id="importDetails" class="text-sm text-gray-600 mt-2 max-h-40 overflow-y-auto"></div>
    `;
    
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');
    const progressPercent = document.getElementById('importProgressPercent');
    const importDetails = document.getElementById('importDetails');
    
    // 获取认证令牌
    const token = getAuthToken();
    if (!token) {
      throw new Error('未找到认证令牌');
    }
    
    // 更新进度的函数
    const updateProgress = (percent, text = null) => {
      progressBar.style.width = `${percent}%`;
      progressPercent.textContent = `${percent}%`;
      if (text) {
        progressText.textContent = text;
      }
    };

    // 添加详情的函数
    const addDetail = (detail, isSuccess = true) => {
      const statusClass = isSuccess ? 'text-green-500' : 'text-red-500';
      importDetails.innerHTML = `<div class="${statusClass} my-1">${detail}</div>` + importDetails.innerHTML;
    };
    
    // 向后端发送批量导入请求
    importDetails.innerHTML = `<div class="text-blue-500 my-1">正在向服务器提交 ${normalizedSources.length} 个书源...</div>`;
    updateProgress(10, `正在提交请求...`);
    
    try {
      // 创建批量导入请求对象
      const batchImportRequest = {
        sources: normalizedSources,
        options: {
          overwriteExisting: overwriteExisting,
          enableAfterImport: enableAfterImport
        }
      };
      
      // 发送批量导入请求
      console.log(`正在批量导入 ${normalizedSources.length} 个书源...`);
      const response = await fetch('/api/booksource/sources/batch-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchImportRequest)
      });
      
      if (!response.ok) {
        let errorMessage = `状态码: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (error) {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch (e) {}
        }
        
        throw new Error(errorMessage);
      }
      
      // 处理响应
      const result = await response.json();
      const taskId = result.data.taskId;
      
      if (!taskId) {
        throw new Error('服务器未返回有效的任务ID');
      }
      
      // 更新进度状态
      updateProgress(20, `导入任务已创建，正在处理...`);
      addDetail(`导入任务已创建: 正在处理 ${normalizedSources.length} 个书源`);
      
      // 定期查询进度
      await pollImportProgress(taskId, updateProgress, addDetail, skippedSources.length);
      
    } catch (error) {
      console.error('批量导入书源失败:', error);
      importDetails.innerHTML = `<div class="text-red-500 my-1">批量导入失败: ${error.message}</div>` + importDetails.innerHTML;
      
      // 更新最终状态为失败
      importStatus.innerHTML = `
        <div class="text-red-500 mb-3">
          <i class="fas fa-exclamation-circle mr-2"></i>批量导入失败: ${error.message}
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div class="bg-red-600 h-2.5 rounded-full" style="width: 100%"></div>
        </div>
        <div class="text-sm text-gray-600 mt-1">
          <span>失败</span>
          <span class="float-right">0%</span>
        </div>
        <div class="text-sm mt-4 max-h-40 overflow-y-auto">
          ${importDetails.innerHTML}
        </div>
      `;
    }
    
    // 清除文件和文本输入
    if (isFileImport) {
      document.getElementById('fileInput').value = '';
      document.getElementById('fileInfo').classList.add('hidden');
    } else {
      document.getElementById('importText').value = '';
    }
    
  } catch (error) {
    console.error('导入书源失败:', error);
    const importStatus = document.getElementById('importStatus');
    importStatus.innerHTML = `
      <div class="text-red-500 mb-2">
        <i class="fas fa-exclamation-circle mr-2"></i>导入失败: ${error.message}
      </div>
    `;
  }
}

/**
 * 轮询导入进度
 * @param {String} taskId 任务ID
 * @param {Function} updateProgress 更新进度的函数 
 * @param {Function} addDetail 添加详情的函数
 * @param {Number} skippedCount 跳过的源数量
 */
async function pollImportProgress(taskId, updateProgress, addDetail, skippedCount) {
  const token = getAuthToken();
  const importStatus = document.getElementById('importStatus');
  const importDetails = document.getElementById('importDetails');
  const maxRetries = 60; // 最多轮询60次，约10分钟
  let retries = 0;
  
  // 已处理的详情，用于避免重复显示
  const processedDetails = new Set();
  
  // 定义轮询函数
  const poll = async () => {
    try {
      const response = await fetch(`/api/booksource/sources/import-tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取进度失败: ${response.status}`);
      }
      
      const progressData = await response.json();
      const task = progressData.data;
      
      // 更新进度条
      const progressPercent = task.progress || 0;
      updateProgress(20 + Math.min(progressPercent * 0.8, 80), // 进度范围从20%到100%
                    `处理中: ${task.processed}/${task.total}`);
      
      // 更新详情
      if (task.details && Array.isArray(task.details)) {
        task.details.forEach(detail => {
          // 创建唯一标识符
          const detailId = `${detail.name}-${detail.status}-${detail.message}`;
          
          // 如果这个详情还没处理过，则添加到UI
          if (!processedDetails.has(detailId)) {
            processedDetails.add(detailId);
            const isSuccess = detail.status === 'success';
            
            // 显示书源信息以及处理结果 - 消息中已包含书源名称
            const groupInfo = detail.group ? ` [${detail.group}]` : '';
            addDetail(`- ${detail.message}${groupInfo}`, isSuccess);
          }
        });
      }
      
      // 检查任务状态
      if (task.status === 'completed') {
        // 任务完成，更新最终状态
        updateProgress(100, `完成: ${task.processed}/${task.total}`);
        
        // 刷新书源列表
        loadBookSources();
        
        // 更新最终状态
        const statusColor = task.failed > 0 ? "text-yellow-500" : "text-green-500";
        const statusIcon = task.failed > 0 ? "fa-exclamation-triangle" : "fa-check-circle";
        
        importStatus.innerHTML = `
          <div class="${statusColor} mb-3">
            <i class="fas ${statusIcon} mr-2"></i>导入完成: 
            <span class="text-green-500">成功 ${task.success} 个</span>
            ${task.failed > 0 ? `<span class="text-red-500">，失败 ${task.failed} 个</span>` : ''}
            ${skippedCount > 0 ? `<span class="text-gray-500">，跳过 ${skippedCount} 个无效源</span>` : ''}
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-blue-600 h-2.5 rounded-full" style="width: 100%"></div>
          </div>
          <div class="text-sm text-gray-600 mt-1">
            <span>${task.processed}/${task.total}</span>
            <span class="float-right">100%</span>
          </div>
          <div class="text-sm mt-4 max-h-40 overflow-y-auto">
            ${importDetails.innerHTML}
          </div>
        `;
        
        return true; // 结束轮询
      } else if (task.status === 'failed') {
        // 任务失败
        throw new Error(task.error || '导入失败');
      }
      
      // 任务仍在进行中，继续轮询
      return false;
      
    } catch (error) {
      console.error('获取导入进度失败:', error);
      throw error;
    }
  };
  
  // 开始轮询
  while (retries < maxRetries) {
    try {
      const isDone = await poll();
      if (isDone) break;
      
      // 延迟一定时间再次轮询
      // 刚开始快速轮询，然后逐渐放慢
      const delay = Math.min(1000 + (retries * 100), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retries++;
    } catch (error) {
      // 如果轮询出错，抛出异常终止
      throw error;
    }
  }
  
  // 达到最大重试次数仍未完成
  if (retries >= maxRetries) {
    throw new Error('导入超时，请稍后检查书源列表或刷新页面查看结果');
  }
} 