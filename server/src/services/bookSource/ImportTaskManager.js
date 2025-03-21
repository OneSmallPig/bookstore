/**
 * 书源导入任务管理器
 * 用于管理异步的书源导入任务和进度跟踪
 */
class ImportTaskManager {
  constructor() {
    this.tasks = new Map(); // 任务ID -> 任务状态
    this.cleanupInterval = null;
    this.startCleanupTimer();
  }

  /**
   * 创建新的导入任务
   * @param {Array} sources 要导入的书源数组
   * @param {Object} options 导入选项
   * @returns {String} 任务ID
   */
  createTask(sources, options) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.tasks.set(taskId, {
      id: taskId,
      sources,
      options,
      total: sources.length,
      processed: 0,
      success: 0,
      failed: 0,
      details: [],
      status: 'pending', // pending, processing, completed, failed
      startTime: Date.now(),
      endTime: null,
      error: null
    });
    
    return taskId;
  }

  /**
   * 获取任务信息
   * @param {String} taskId 任务ID
   * @returns {Object|null} 任务信息或null
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 更新任务进度
   * @param {String} taskId 任务ID
   * @param {Object} update 要更新的字段
   */
  updateTask(taskId, update) {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, update);
      
      // 如果任务状态变为已完成或失败，设置结束时间
      if ((update.status === 'completed' || update.status === 'failed') && !task.endTime) {
        task.endTime = Date.now();
      }
    }
  }

  /**
   * 更新源处理结果
   * @param {String} taskId 任务ID
   * @param {Object} source 处理的源
   * @param {Boolean} success 是否成功
   * @param {String} message 消息
   */
  addSourceResult(taskId, source, success, message) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // 更新进度
    task.processed++;
    
    if (success) {
      task.success++;
    } else {
      task.failed++;
    }
    
    // 添加详情 - 包含更详细的书源信息
    task.details.push({
      name: source.name || '未知',
      url: source.url || '',
      group: source.group || '默认分组',
      status: success ? 'success' : 'failed',
      message: `${source.name}: ${message}` // 在消息中包含书源名称
    });
    
    // 更新进度百分比
    task.progress = Math.floor((task.processed / task.total) * 100);
  }

  /**
   * 设置任务状态为处理中
   * @param {String} taskId 任务ID
   */
  startProcessing(taskId) {
    this.updateTask(taskId, { status: 'processing' });
  }

  /**
   * 设置任务状态为已完成
   * @param {String} taskId 任务ID
   */
  completeTask(taskId) {
    this.updateTask(taskId, { status: 'completed', progress: 100 });
  }

  /**
   * 设置任务状态为失败
   * @param {String} taskId 任务ID
   * @param {Error} error 错误信息
   */
  failTask(taskId, error) {
    this.updateTask(taskId, { 
      status: 'failed', 
      error: error.message || '未知错误'
    });
  }

  /**
   * 启动清理计时器，移除超过24小时的任务
   */
  startCleanupTimer() {
    // 每小时清理一次
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      for (const [taskId, task] of this.tasks.entries()) {
        // 移除超过24小时的任务
        if (task.endTime && (now - task.endTime > dayInMs)) {
          this.tasks.delete(taskId);
        }
      }
    }, 60 * 60 * 1000); // 每小时运行一次
  }

  /**
   * 停止清理计时器
   */
  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// 导出单例
module.exports = new ImportTaskManager(); 