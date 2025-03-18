/**
 * 简单的日志工具模块
 */

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 当前日志级别，默认为INFO
let currentLogLevel = process.env.LOG_LEVEL ? 
  LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO : 
  LOG_LEVELS.INFO;

/**
 * 格式化时间
 * @returns {string} 格式化后的时间字符串
 */
const getFormattedTime = () => {
  const now = new Date();
  return `${now.toISOString()}`;
};

/**
 * 打印日志
 * @param {string} level 日志级别 
 * @param {string} message 日志消息
 * @param {any} data 额外数据
 */
const log = (level, message, data) => {
  const time = getFormattedTime();
  
  if (data) {
    if (data instanceof Error) {
      console[level.toLowerCase()](`[${time}] [${level}] ${message}:`, data.message);
      if (data.stack) {
        console[level.toLowerCase()](`Stack: ${data.stack}`);
      }
    } else {
      console[level.toLowerCase()](`[${time}] [${level}] ${message}:`, data);
    }
  } else {
    console[level.toLowerCase()](`[${time}] [${level}] ${message}`);
  }
};

// 导出日志函数
module.exports = {
  /**
   * 设置日志级别
   * @param {string} level 日志级别 (ERROR, WARN, INFO, DEBUG)
   */
  setLogLevel: (level) => {
    if (LOG_LEVELS[level.toUpperCase()] !== undefined) {
      currentLogLevel = LOG_LEVELS[level.toUpperCase()];
      console.log(`日志级别已设置为: ${level.toUpperCase()}`);
    } else {
      console.warn(`无效的日志级别: ${level}. 使用默认级别: INFO`);
    }
  },
  
  /**
   * 错误日志
   * @param {string} message 日志消息
   * @param {any} data 额外数据
   */
  error: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      log('ERROR', message, data);
    }
  },
  
  /**
   * 警告日志
   * @param {string} message 日志消息
   * @param {any} data 额外数据
   */
  warn: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      log('WARN', message, data);
    }
  },
  
  /**
   * 信息日志
   * @param {string} message 日志消息
   * @param {any} data 额外数据
   */
  info: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      log('INFO', message, data);
    }
  },
  
  /**
   * 调试日志
   * @param {string} message 日志消息
   * @param {any} data 额外数据
   */
  debug: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      log('DEBUG', message, data);
    }
  }
}; 