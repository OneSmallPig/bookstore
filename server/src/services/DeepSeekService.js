const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * DeepSeek API服务
 * 用于内容匹配和书籍推荐
 */
class DeepSeekService {
  /**
   * 构造函数
   * @param {string} apiKey DeepSeek API密钥
   * @param {string} baseUrl DeepSeek API基础URL
   */
  constructor(apiKey = config.deepseek.apiKey, baseUrl = config.deepseek.baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.deepseek.com/v1';
    this.axios = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 30000 // 30秒超时
    });
  }

  /**
   * 发送请求到DeepSeek API
   * @param {string} endpoint API端点
   * @param {Object} data 请求数据
   * @returns {Promise<Object>} API响应
   */
  async _request(endpoint, data) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.axios.post(url, data);
      return response.data;
    } catch (error) {
      logger.error(`DeepSeek API请求失败: ${endpoint}`, error);
      
      // 处理API错误
      if (error.response) {
        const { status, data } = error.response;
        throw new Error(`DeepSeek API错误 (${status}): ${data.error?.message || JSON.stringify(data)}`);
      }
      
      throw error;
    }
  }

  /**
   * 根据用户兴趣推荐书籍
   * @param {string} userInterest 用户兴趣描述
   * @param {Object} options 选项
   * @returns {Promise<Object>} 推荐结果
   */
  async recommendBooks(userInterest, options = {}) {
    const defaultOptions = {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.95,
      stream: false
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    const prompt = `
我需要你作为一个专业的图书推荐系统，根据用户的兴趣描述，推荐相关的书籍。

用户兴趣: ${userInterest}

请根据这个兴趣，推荐5-10本相关度最高的书籍。对于每本书，请提供以下信息:
1. 书名
2. 作者
3. 简短介绍（100字以内）
4. 推荐理由（为什么这本书与用户兴趣相关）
5. 类别/标签

请以JSON格式返回结果，格式如下:
{
  "recommendations": [
    {
      "title": "书名",
      "author": "作者",
      "introduction": "简介",
      "reason": "推荐理由",
      "categories": ["类别1", "类别2"]
    },
    // 更多推荐...
  ]
}

只返回JSON格式，不要有其他文字说明。确保JSON格式正确，可以被解析。
`;
    
    const data = {
      model: requestOptions.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: requestOptions.temperature,
      max_tokens: requestOptions.max_tokens,
      top_p: requestOptions.top_p,
      stream: requestOptions.stream
    };
    
    try {
      const response = await this._request('/chat/completions', data);
      
      // 解析返回的JSON
      const content = response.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch (parseError) {
        logger.error('解析DeepSeek响应JSON失败', parseError);
        
        // 尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            throw new Error('无法解析DeepSeek响应为有效JSON');
          }
        } else {
          throw new Error('DeepSeek响应不包含有效JSON');
        }
      }
    } catch (error) {
      logger.error('书籍推荐失败', error);
      throw error;
    }
  }

  /**
   * 分析用户兴趣，提取关键词和主题
   * @param {string} userInterest 用户兴趣描述
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeUserInterest(userInterest) {
    const prompt = `
分析以下用户兴趣描述，提取关键词、主题和可能的书籍类型。

用户兴趣: ${userInterest}

请以JSON格式返回结果:
{
  "keywords": ["关键词1", "关键词2", ...],
  "themes": ["主题1", "主题2", ...],
  "bookTypes": ["小说类型1", "非小说类型1", ...],
  "summary": "一句话总结用户兴趣"
}

只返回JSON格式，不要有其他文字说明。
`;
    
    const data = {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      top_p: 0.95,
      stream: false
    };
    
    try {
      const response = await this._request('/chat/completions', data);
      const content = response.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        logger.error('解析用户兴趣分析JSON失败', parseError);
        
        // 尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            throw new Error('无法解析DeepSeek响应为有效JSON');
          }
        } else {
          throw new Error('DeepSeek响应不包含有效JSON');
        }
      }
    } catch (error) {
      logger.error('用户兴趣分析失败', error);
      throw error;
    }
  }

  /**
   * 生成书籍摘要
   * @param {string} bookContent 书籍内容
   * @param {number} maxLength 最大摘要长度
   * @returns {Promise<string>} 生成的摘要
   */
  async generateBookSummary(bookContent, maxLength = 500) {
    // 截取内容以避免超出token限制
    const truncatedContent = bookContent.length > 8000 
      ? bookContent.substring(0, 8000) + '...'
      : bookContent;
    
    const prompt = `
请为以下书籍内容生成一个简洁的摘要，不超过${maxLength}字:

${truncatedContent}

摘要应该包含主要情节、主题和关键点，但不要透露结局或重要转折。
`;
    
    const data = {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: Math.min(maxLength * 2, 1000),
      top_p: 0.95,
      stream: false
    };
    
    try {
      const response = await this._request('/chat/completions', data);
      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('生成书籍摘要失败', error);
      throw error;
    }
  }

  /**
   * 根据书籍内容和用户阅读历史生成个性化推荐
   * @param {Array} readingHistory 用户阅读历史
   * @param {Array} availableBooks 可用书籍列表
   * @returns {Promise<Array>} 个性化推荐结果
   */
  async generatePersonalizedRecommendations(readingHistory, availableBooks) {
    // 格式化阅读历史
    const formattedHistory = readingHistory.map(item => ({
      title: item.title,
      author: item.author,
      categories: item.categories,
      rating: item.rating || 'N/A'
    }));
    
    // 格式化可用书籍
    const formattedBooks = availableBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      categories: book.categories,
      introduction: book.introduction?.substring(0, 100) + '...'
    }));
    
    const prompt = `
根据用户的阅读历史，从可用书籍列表中推荐最适合该用户的书籍。

用户阅读历史:
${JSON.stringify(formattedHistory, null, 2)}

可用书籍列表:
${JSON.stringify(formattedBooks, null, 2)}

请分析用户的阅读偏好，并推荐5本最适合的书籍。对于每本书，请提供推荐理由。

请以JSON格式返回结果:
{
  "recommendations": [
    {
      "id": "书籍ID",
      "reason": "详细的推荐理由，解释为什么这本书适合该用户"
    },
    // 更多推荐...
  ],
  "userPreferences": {
    "genres": ["用户偏好的类型1", "用户偏好的类型2"],
    "themes": ["用户偏好的主题1", "用户偏好的主题2"],
    "authors": ["用户偏好的作者1", "用户偏好的作者2"]
  }
}

只返回JSON格式，不要有其他文字说明。
`;
    
    const data = {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1500,
      top_p: 0.95,
      stream: false
    };
    
    try {
      const response = await this._request('/chat/completions', data);
      const content = response.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        logger.error('解析个性化推荐JSON失败', parseError);
        
        // 尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            throw new Error('无法解析DeepSeek响应为有效JSON');
          }
        } else {
          throw new Error('DeepSeek响应不包含有效JSON');
        }
      }
    } catch (error) {
      logger.error('生成个性化推荐失败', error);
      throw error;
    }
  }
}

module.exports = DeepSeekService; 