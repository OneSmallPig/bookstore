const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { JSDOM } = require('jsdom');
const { URL } = require('url');
const logger = require('../../utils/logger');

/**
 * 书源解析器
 * 用于根据书源规则抓取和解析网页内容
 */
class BookSourceParser {
  /**
   * 构造函数
   * @param {Object} bookSource 书源配置
   * @param {Object} options 选项
   */
  constructor(bookSource, options = {}) {
    this.testTimeout = options.timeout || 15000;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    // 处理阅读3.0格式的书源
    try {
      this.bookSource = this._mapBookSourceFields(bookSource);
    } catch (error) {
      logger.error(`映射书源字段失败: ${error.message}`);
      this.bookSource = bookSource; // 回退到原始书源
    }
    
    // 修复已知问题
    this._fixKnownIssues(options.isTest);
    
    // 获取基础URL
    this.baseUrl = this._getBaseUrl();
    
    if (!this.bookSource) {
      throw new Error('无效的书源配置');
    }
    
    // 安全检查书源URL
    if (this.bookSource.url) {
      try {
        const bookSourceUrl = this._resolveUrl(this.bookSource.url, '');
        if (!bookSourceUrl) {
          logger.warn(`书源URL无效: ${this.bookSource.url}`);
        }
      } catch (error) {
        logger.warn(`解析书源URL失败: ${error.message}`);
      }
    }
    
    // 初始化axios实例
    this.axios = axios.create({
      timeout: this.testTimeout,
      headers: {
        'User-Agent': this.userAgent
      }
    });
    
    // 确保必要的字段存在
    if (!this.bookSource.name) {
      this.bookSource.name = '未命名书源';
    }
    
    // 创建自定义HTTP和HTTPS代理
    const http = require('http');
    const https = require('https');
    
    // 创建自定义Agent，处理DNS问题
    const httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 50,
      timeout: 60000,
      family: 4 // 强制使用IPv4
    });
    
    const httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      timeout: 60000,
      family: 4, // 强制使用IPv4
      rejectUnauthorized: false // 允许自签名证书，提高兼容性
    });
    
    // 创建DNS解析器
    const dns = require('dns');
    
    // 确保使用知名DNS服务器，避免被重定向到错误IP
    dns.setServers([
      '8.8.8.8',       // Google DNS
      '114.114.114.114' // 国内通用DNS
    ]);
    
    // 创建axios实例并配置
    this.axios = axios.create({
      timeout: this.bookSource.timeout || 30000, // 默认超时时间设为30秒
      headers: this._getHeaders(),
      responseType: 'arraybuffer', // 使用arraybuffer以支持不同编码
      maxRedirects: 10, // 增加最大重定向次数
      validateStatus: status => status < 500, // 允许任何非500错误状态码
      httpAgent: httpAgent,
      httpsAgent: httpsAgent,
      decompress: true, // 自动解压缩响应
      
      // 处理DNS解析问题
      lookup: (hostname, options, callback) => {
        // 排除明确的非法主机名
        if (!hostname || hostname === '0.0.0.0' || hostname === 'localhost') {
          callback(new Error(`无效的主机名: ${hostname}`), null, null);
          return;
        }
        
        // 先用自定义的DNS服务器解析
        dns.lookup(hostname, options, (err, address, family) => {
          // 如果解析失败或解析到0.0.0.0，尝试替换主机名
          if (err || address === '0.0.0.0') {
            // 尝试检查这个域名是否有常见别名
            if (hostname === 'www.ixs5200.com') {
              // 已知www.ixs5200.com实际是www.18ys.net的别名
              logger.info(`[DNS修复] 替换已知重定向域名: ${hostname} -> www.18ys.net`);
              dns.lookup('www.18ys.net', options, callback);
              return;
            }
            
            // 如果是常见的流量劫持到0.0.0.0，尝试用公共DNS服务器重新解析
            if (err) {
              logger.warn(`[DNS解析] 域名解析失败 ${hostname}, 错误: ${err.message}, 尝试使用备用DNS服务器`);
            } else {
              logger.warn(`[DNS解析] 域名 ${hostname} 解析到无效IP: ${address}, 尝试使用备用DNS服务器`);
            }
            
            // 使用备用DNS服务器和缓存重新解析
            dns.resolve4(hostname, (err2, addresses) => {
              if (err2 || !addresses || addresses.length === 0) {
                logger.error(`[DNS解析] 备用DNS也无法解析域名 ${hostname}: ${err2 ? err2.message : '未找到有效IP'}`);
                callback(err || new Error(`无法解析到有效IP: ${hostname}`), null, null);
              } else {
                // 使用找到的第一个有效IP
                const validIP = addresses.find(ip => ip !== '0.0.0.0') || addresses[0];
                logger.info(`[DNS解析] 使用备用DNS成功解析 ${hostname} -> ${validIP}`);
                callback(null, validIP, 4);
              }
            });
          } else {
            callback(null, address, family);
          }
        });
      }
    });
  }

  /**
   * 获取HTTP请求头
   * @returns {Object} HTTP请求头
   */
  _getHeaders() {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };

    // 合并书源自定义头
    if (this.bookSource.headers && typeof this.bookSource.headers.get === 'function') {
      this.bookSource.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }

    // 添加Cookie
    if (this.bookSource.cookies) {
      headers['Cookie'] = this.bookSource.cookies;
    }

    return headers;
  }

  /**
   * 发送HTTP请求并处理响应
   * @param {string} url 请求URL
   * @param {object} options 请求选项
   * @returns {Promise<object>} 响应对象，包含content、$等属性
   * @private
   */
  async _request(url, options = {}) {
    if (!url) {
      throw new Error('请求URL不能为空');
    }
    
    try {
      // 确保URL是完整的
      const fullUrl = this._resolveUrl(url, this._getBaseUrl());
      
      if (!fullUrl) {
        throw new Error(`无法解析URL: ${url}`);
      }
      
      const isTest = options.isTest || false;
      
      if (isTest) {
        logger.info(`发送请求: ${fullUrl}`);
      }
      
      // 设置请求超时
      const timeoutMs = options.timeout || this.testTimeout || 30000;
      
      // 设置请求头
      const headers = {
        'User-Agent': this.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      };
      
      // 添加自定义请求头
      if (this.bookSource.header) {
        try {
          const customHeaders = typeof this.bookSource.header === 'string' 
            ? JSON.parse(this.bookSource.header) 
            : this.bookSource.header;
          
          Object.assign(headers, customHeaders);
          
          if (isTest) {
            logger.info(`应用自定义请求头: ${JSON.stringify(customHeaders)}`);
          }
        } catch (error) {
          if (isTest) {
            logger.warn(`解析自定义请求头失败: ${error.message}`);
          }
        }
      }
      
      // 创建请求控制器和超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      // 尝试请求
      let response;
      try {
        // 优先使用axios
        const axiosResponse = await this.axios({
          url: fullUrl,
          method: options.method || 'GET',
          headers: headers,
          timeout: timeoutMs,
          responseType: 'arraybuffer',
          signal: controller.signal
        });
        
        response = {
          ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
          status: axiosResponse.status,
          headers: {
            get: (name) => axiosResponse.headers[name.toLowerCase()]
          },
          arrayBuffer: async () => axiosResponse.data
        };
      } catch (axiosError) {
        // 如果axios失败，尝试使用fetch作为后备方案
        if (isTest) {
          logger.warn(`Axios请求失败，尝试使用fetch: ${axiosError.message}`);
        }
        
        response = await fetch(fullUrl, {
          method: options.method || 'GET',
          headers: headers,
          redirect: 'follow',
          signal: controller.signal,
          credentials: 'omit' // 避免发送cookie以提高兼容性
        });
      }
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
      
      // 获取响应内容类型
      const contentType = response.headers.get('content-type') || '';
      const charset = this._getCharsetFromContentType(contentType);
      
      // 获取响应数据
      const arrayBuffer = await response.arrayBuffer();
      
      // 处理编码
      let content;
      if (charset && charset.toLowerCase() !== 'utf-8' && charset.toLowerCase() !== 'utf8') {
        // 使用iconv-lite处理非UTF-8编码
        content = iconv.decode(Buffer.from(arrayBuffer), charset);
        
        if (isTest) {
          logger.info(`使用编码 ${charset} 解码响应内容`);
        }
      } else {
        // 默认使用UTF-8编码
        content = new TextDecoder('utf-8').decode(arrayBuffer);
      }
      
      // 使用cheerio解析HTML
      const $ = cheerio.load(content, { decodeEntities: false });
      
      // 创建DOM对象
      const dom = new JSDOM(content).window.document;
      
      const result = {
        content,
        $,
        dom,
        url: fullUrl,
        contentType
      };
      
      if (isTest) {
        logger.info(`请求成功，响应内容长度: ${content.length}`);
      }
      
      return result;
    } catch (error) {
      // 捕获错误，提供详细的错误信息
      if (options.isTest) {
        // 尝试获取更多网络错误信息
        if (error.name === 'AbortError') {
          logger.error(`请求超时: ${url}`);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.code === 'ECONNRESET') {
          logger.error(`连接问题: ${error.message}`);
        } else if (error.code === 'ENOTFOUND') {
          logger.error(`域名解析失败: ${error.message}`);
        }
      }
      
      logger.error(`请求失败: ${url}, 错误: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 从Content-Type中提取字符集
   * @param {string} contentType Content-Type字符串
   * @returns {string} 字符集
   * @private
   */
  _getCharsetFromContentType(contentType) {
    if (!contentType) return 'utf-8';
    
    const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
    if (charsetMatch && charsetMatch[1]) {
      return charsetMatch[1];
    }
    
    return 'utf-8';
  }

  /**
   * 检测HTML编码
   * @param {Object} response Axios响应对象
   * @returns {string|null} 检测到的编码
   */
  _detectCharset(response) {
    // 从Content-Type头中检测
    const contentType = response.headers['content-type'];
    if (contentType) {
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch) return charsetMatch[1].trim();
    }
    
    // 从HTML内容中检测
    const buffer = response.data;
    const headContent = buffer.slice(0, 1024).toString(); // 只检查前1KB内容
    
    // 检查meta标签
    const metaCharsetMatch = headContent.match(/<meta[^>]+charset=["']?([^"'>]+)/i);
    if (metaCharsetMatch) return metaCharsetMatch[1].trim();
    
    const metaHttpEquivMatch = headContent.match(/<meta[^>]+http-equiv=["']?content-type["']?[^>]+content=["']?[^;]+;\s*charset=([^"']+)/i);
    if (metaHttpEquivMatch) return metaHttpEquivMatch[1].trim();
    
    return null;
  }

  /**
   * 处理复杂选择器 (class./id./tag.)
   * @param {Object} $ Cheerio对象
   * @param {string} selector 复杂选择器
   * @param {string} baseUrl 基础URL
   * @returns {string|null} 提取的结果
   * @private
   */
  _processComplexSelector($, selector, baseUrl) {
    if (!$ || !selector) return null;
    
    try {
      let selectorType = '';
      let remainingSelector = '';
      
      // 提取选择器类型和剩余部分
      if (selector.startsWith('class.')) {
        selectorType = 'class';
        remainingSelector = selector.substring(6);
      } else if (selector.startsWith('id.')) {
        selectorType = 'id';
        remainingSelector = selector.substring(3);
      } else if (selector.startsWith('tag.')) {
        selectorType = 'tag';
        remainingSelector = selector.substring(4);
      } else {
        logger.error(`未知的复杂选择器类型: ${selector}`);
        return null;
      }
      
      // 分析剩余部分
      const parts = remainingSelector.split('.');
      const mainSelector = parts[0];
      const attribute = parts.length > 1 ? parts[1] : 'text';
      let index = 0;
      
      // 检查索引部分
      if (attribute.includes(':')) {
        const indexParts = attribute.split(':');
        const attrName = indexParts[0];
        index = parseInt(indexParts[1], 10);
        
        // 构建CSS选择器
        let cssSelector = '';
        if (selectorType === 'class') {
          cssSelector = `.${mainSelector}`;
        } else if (selectorType === 'id') {
          cssSelector = `#${mainSelector}`;
        } else if (selectorType === 'tag') {
          cssSelector = mainSelector;
        }
        
        // 获取元素
        const elements = $(cssSelector);
        if (!elements || elements.length === 0) {
          return null;
        }
        
        // 检查索引是否有效
        if (index < 0 || index >= elements.length) {
          logger.warn(`索引越界: ${index}, 元素数量: ${elements.length}`);
          // 处理负索引（从后往前计数）
          if (index < 0) {
            index = elements.length + index;
            if (index < 0) {
              return null;
            }
          } else {
            return null;
          }
        }
        
        // 获取指定索引的元素
        const element = elements.eq(index);
        
        // 根据属性返回结果
        if (attrName === 'text') {
          return element.text().trim();
        } else if (attrName === 'html' || attrName === 'innerHTML') {
          return element.html();
        } else if (attrName === 'outerHTML' || attrName === 'outerHtml') {
          return $.html(element);
        } else if (['href', 'src', 'data-src', 'data-original'].includes(attrName)) {
          const value = element.attr(attrName);
          return value ? this._resolveUrl(value, baseUrl) : null;
        } else {
          return element.attr(attrName) || null;
        }
      } else {
        // 不包含索引，默认第一个元素
        let cssSelector = '';
        if (selectorType === 'class') {
          cssSelector = `.${mainSelector}`;
        } else if (selectorType === 'id') {
          cssSelector = `#${mainSelector}`;
        } else if (selectorType === 'tag') {
          cssSelector = mainSelector;
        }
        
        const element = $(cssSelector).first();
        if (!element || element.length === 0) {
          return null;
        }
        
        // 根据属性返回结果
        if (attribute === 'text') {
          return element.text().trim();
        } else if (attribute === 'html' || attribute === 'innerHTML') {
          return element.html();
        } else if (attribute === 'outerHTML' || attribute === 'outerHtml') {
          return $.html(element);
        } else if (['href', 'src', 'data-src', 'data-original'].includes(attribute)) {
          const value = element.attr(attribute);
          return value ? this._resolveUrl(value, baseUrl) : null;
        } else {
          return element.attr(attribute) || null;
        }
      }
    } catch (error) {
      logger.error(`处理复杂选择器失败: ${selector}, 错误: ${error.message}`, error);
      return null;
    }
  }

  /**
   * 安全地将选择器应用到cheerio对象上
   * @param {Object} $ Cheerio对象
   * @param {string} selector 选择器
   * @param {string} baseUrl 基础URL
   * @returns {Object|null} 选择结果或null
   */
  _safeSelect($, selector, baseUrl) {
    try {
      // 如果$是HTML元素的cheerio包装器，创建一个上下文
      const context = $.cheerio ? $ : null;
      
      // 处理复合选择器（类似 selector1&&selector2 的形式）
      if (selector && selector.includes('&&')) {
        const selectors = selector.split('&&');
        for (const sel of selectors) {
          try {
            const result = this._safeSelect($, sel.trim(), baseUrl);
            if (result) return result;
          } catch (err) {
            logger.debug(`选择器部分 "${sel}" 应用失败，尝试下一个`, err);
            continue;
          }
        }
        return null;
      }
      
      // 处理包含正则表达式替换的选择器
      if (selector && selector.includes('##')) {
        const [selectPart, ...regexParts] = selector.split('##');
        let result = this._safeSelect($, selectPart.trim(), baseUrl);
        
        if (result) {
          // 应用正则表达式替换
          for (let i = 0; i < regexParts.length; i += 2) {
            try {
              const pattern = regexParts[i];
              const replacement = regexParts[i+1] || '';
              const regex = new RegExp(pattern, 'g');
              result = result.replace(regex, replacement);
            } catch (err) {
              logger.error(`正则替换失败: ${regexParts[i]} -> ${regexParts[i+1]}`, err);
            }
          }
        }
        return result;
      }
      
      // 先检查是否是复杂选择器
      if (selector.includes('tag.') || 
          selector.includes('class.') || 
          selector.includes('id.') || 
          (selector.includes('@') && !selector.includes('[@')) ||
          selector.includes('|')) {
        
        // 当$是HTML元素时的特殊处理
        if (context) {
          // 对于常见的class和tag选择器做简单处理
          if (selector.startsWith('class.')) {
            const className = selector.substring(6);
            return context.find(`.${className}`);
          } else if (selector.startsWith('tag.')) {
            const tagName = selector.substring(4);
            return context.find(tagName);
          } else if (selector.includes('@')) {
            // 处理a@href这类简单的属性选择器
            const [elemSelector, attr] = selector.split('@');
            if (attr === 'text') {
              return context.find(elemSelector).text().trim();
            } else if (['href', 'src', 'content', 'value'].includes(attr)) {
              const val = context.find(elemSelector).attr(attr);
              return attr === 'href' || attr === 'src' ? this._resolveUrl(val, baseUrl) : val;
            }
          }
        }
        
        try {
          return this._processComplexSelector($, selector, baseUrl);
        } catch (err) {
          logger.error(`复杂选择器处理失败: "${selector}"`, err);
          // 如果是元素上下文，返回整个元素文本作为后备方案
          if (context) {
            return context.text().trim();
          }
          return null;
        }
      }
      
      // 处理普通选择器，但避免使用可能导致伪类错误的选择器
      try {
        // 检查选择器是否包含可能导致问题的特殊字符
        if (selector.includes(':') && /:[0-9]/.test(selector)) {
          // 如果选择器包含可能出问题的伪类定义，使用更安全的方法
          logger.debug(`检测到可能有问题的选择器: "${selector}"，尝试安全处理`);
          
          // 如果只是简单的元素选择器，尝试获取文本
          if (context) {
            return context.text().trim();
          }
          
          // 如果是完整文档，返回null
          return null;
        }
        
        // 普通选择器
        return context ? context.find(selector) : $(selector);
      } catch (error) {
        logger.error(`选择器应用失败: "${selector}"`, error);
        // 如果是元素上下文，返回整个元素文本作为后备方案
        if (context) {
          return context.text().trim();
        }
        return null;
      }
    } catch (error) {
      logger.error(`选择器应用失败: "${selector}"`, error);
      return null;
    }
  }

  /**
   * 根据选择器从DOM中提取内容
   * @param {Object} $ Cheerio对象
   * @param {Object} dom JSDOM文档对象
   * @param {string} selector 选择器
   * @param {string} baseUrl 基础URL，用于处理相对路径
   * @returns {string|Array} 提取的内容
   */
  _extract($, dom, selector, baseUrl) {
    if (!selector) return null;
    if (!$ && !dom) return null;
    
    try {
      // 处理多个选择器 (使用 || 分隔)
      if (selector.includes('||')) {
        const selectors = selector.split('||').map(s => s.trim());
        for (const s of selectors) {
          const result = this._extract($, dom, s, baseUrl);
          if (result) return result;
        }
        return null;
      }
      
      // 处理JS表达式 (阅读3.0格式)
      if (selector.startsWith('js:')) {
        if ($ || dom) {
          return selector.substring(3); // 返回JS表达式，后续可能需要执行
        }
        return null;
      }
      
      // 处理CSS选择器 + 属性提取
      if (selector.includes('@') && !selector.startsWith('@')) {
        const [cssSelector, attr] = selector.split('@');
        
        if ($) {
          // Cheerio模式
          const selected = $(cssSelector);
          if (!selected || selected.length === 0) return null;
          
          // 如果选中了多个元素，尝试处理所有元素
          if (selected.length > 1) {
            // 返回所有元素作为数组
            const results = [];
            selected.each((index, element) => {
              if (attr === 'text') {
                results.push($(element).text().trim());
              } else if (attr === 'html' || attr === 'innerHTML') {
                results.push($(element).html());
              } else if (attr === 'outerHTML' || attr === 'outerHtml') {
                results.push($.html(element));
              } else {
                results.push($(element).attr(attr) || '');
              }
            });
            return results.length > 0 ? results : null;
          } else {
            // 单个元素处理
            if (attr === 'text') {
              return selected.text().trim();
            } else if (attr === 'html' || attr === 'innerHTML') {
              return selected.html();
            } else if (attr === 'outerHTML' || attr === 'outerHtml') {
              return $.html(selected);
            } else {
              return selected.attr(attr) || null;
            }
          }
        } else if (dom) {
          // JSDOM模式
          const elements = dom.querySelectorAll(cssSelector);
          if (!elements || elements.length === 0) return null;
          
          // 多元素处理
          if (elements.length > 1) {
            const results = [];
            for (let i = 0; i < elements.length; i++) {
              if (attr === 'text') {
                results.push(elements[i].textContent.trim());
              } else if (attr === 'html' || attr === 'innerHTML') {
                results.push(elements[i].innerHTML);
              } else if (attr === 'outerHTML' || attr === 'outerHtml') {
                results.push(elements[i].outerHTML);
              } else {
                results.push(elements[i].getAttribute(attr) || '');
              }
            }
            return results.length > 0 ? results : null;
          } else {
            // 单元素处理
            if (attr === 'text') {
              return elements[0].textContent.trim();
            } else if (attr === 'html' || attr === 'innerHTML') {
              return elements[0].innerHTML;
            } else if (attr === 'outerHTML' || attr === 'outerHtml') {
              return elements[0].outerHTML;
            } else {
              return elements[0].getAttribute(attr) || null;
            }
          }
        }
      }
      
      // 处理纯属性选择器
      if (selector.startsWith('@')) {
        const attr = selector.substring(1);
        
        if ($) {
          // 尝试获取页面中第一个符合条件的元素
          if (attr === 'title') {
            return $('title').text().trim() || null;
          } else {
            // 在页面级别查找可能包含该属性的元素
            const elements = $(`[${attr}]`);
            if (elements.length > 0) {
              return elements.attr(attr) || null;
            }
          }
        } else if (dom) {
          if (attr === 'title') {
            return dom.querySelector('title')?.textContent.trim() || null;
          } else {
            const elements = dom.querySelectorAll(`[${attr}]`);
            if (elements.length > 0) {
              return elements[0].getAttribute(attr) || null;
            }
          }
        }
        return null;
      }
      
      // 处理阅读3.0特有的class/id/tag选择器
      if (selector.includes('class.') || selector.includes('id.') || selector.includes('tag.')) {
        return this._processComplexSelector($, selector, baseUrl);
      }
      
      // 处理正则表达式提取 (阅读3.0格式)
      if (selector.includes('<') && selector.includes('>')) {
        const regexParts = selector.match(/<(.+?)>/);
        if (regexParts && regexParts.length > 1) {
          const regexStr = regexParts[1];
          let content = '';
          
          if ($) {
            content = $('body').html() || '';
          } else if (dom) {
            content = dom.body.innerHTML || '';
          }
          
          try {
            const regex = new RegExp(regexStr, 'i');
            const matches = content.match(regex);
            return matches ? matches[0] : null;
          } catch (e) {
            logger.error(`正则表达式解析失败: ${regexStr}`, e);
            return null;
          }
        }
      }
      
      // 默认CSS选择器处理
      if ($) {
        const selected = $(selector);
        if (!selected || selected.length === 0) return null;
        
        // 如果选中了多个元素，处理为数组
        if (selected.length > 1) {
          // 返回所有元素作为数组
          const results = [];
          selected.each((index, element) => {
            results.push($(element));
          });
          return results.length > 0 ? results : null;
        }
        
        // 返回文本内容
        return selected.text().trim() || null;
      } else if (dom) {
        const elements = dom.querySelectorAll(selector);
        if (!elements || elements.length === 0) return null;
        
        // 处理多个元素
        if (elements.length > 1) {
          return Array.from(elements);
        }
        
        // 返回文本内容
        return elements[0].textContent.trim() || null;
      }
      
      return null;
    } catch (error) {
      logger.error(`提取内容失败: ${selector}, 错误: ${error.message}`, error);
      return null;
    }
  }

  /**
   * 解析URL，将相对URL转换为绝对URL
   * @param {string} url 需要解析的URL
   * @param {string} baseUrl 基础URL
   * @returns {string} 解析后的URL
   * @private
   */
  _resolveUrl(url, baseUrl) {
    if (!url) return '';
    
    try {
      // 清理URL，去除首尾空格
      url = url.trim();
      
      // 检查格式错误的URL
      if (url.includes('{{') || url.includes('{key') || url.includes('undefined')) {
        logger.warn(`URL包含未替换的变量或undefined: ${url}`);
        
        // 尝试修复常见错误
        url = url.replace(/{{key(word)?}}/g, '')
                 .replace(/{key(word)?}/g, '')
                 .replace(/undefined/g, '')
                 .trim();
                 
        if (!url) return '';
      }
      
      // 检查是否已经是绝对URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // 验证是否是有效的URL
        try {
          new URL(url);
          return url;
        } catch (e) {
          logger.warn(`无效的绝对URL: ${url}, 尝试修复`);
          
          // 尝试修复常见错误
          if (url.includes(' ')) {
            url = url.replace(/\s+/g, '%20');
          }
          
          try {
            new URL(url);
            return url;
          } catch (e2) {
            logger.error(`无法修复无效URL: ${url}`);
            return '';
          }
        }
      }
      
      // 如果没有基础URL，尝试使用类的baseUrl
      if (!baseUrl) {
        baseUrl = this.baseUrl;
      }
      
      // 如果仍然没有基础URL，尝试使用书源的URL
      if (!baseUrl && this.bookSource) {
        baseUrl = this.bookSource.url || this.bookSource.bookSourceUrl;
      }
      
      // 如果没有基础URL，则无法解析
      if (!baseUrl) {
        logger.warn(`无法解析相对URL: ${url}，未提供基础URL`);
        return '';
      }
      
      // 创建完整的URL
      try {
        // 检查基础URL是否有效
        let baseUrlObj;
        try {
          baseUrlObj = new URL(baseUrl);
        } catch (e) {
          logger.warn(`基础URL无效: ${baseUrl}，尝试修复`);
          
          // 尝试添加协议
          if (!baseUrl.startsWith('http')) {
            baseUrl = 'http://' + baseUrl;
            try {
              baseUrlObj = new URL(baseUrl);
            } catch (e2) {
              logger.error(`无法修复基础URL: ${baseUrl}`);
              return '';
            }
          } else {
            return '';
          }
        }
        
        // 处理特殊情况：URL以//开头（协议相对URL）
        if (url.startsWith('//')) {
          return `${baseUrlObj.protocol}${url}`;
        }
        
        // 处理特殊情况：URL以/开头（主机相对URL）
        if (url.startsWith('/')) {
          return `${baseUrlObj.protocol}//${baseUrlObj.host}${url}`;
        }
        
        // 处理特殊情况：URL以?开头（当前页面附加查询参数）
        if (url.startsWith('?')) {
          const path = baseUrlObj.pathname || '';
          return `${baseUrlObj.protocol}//${baseUrlObj.host}${path}${url}`;
        }
        
        // 处理特殊情况：URL以#开头（当前页面的锚点）
        if (url.startsWith('#')) {
          const path = baseUrlObj.pathname || '';
          const query = baseUrlObj.search || '';
          return `${baseUrlObj.protocol}//${baseUrlObj.host}${path}${query}${url}`;
        }
        
        // 正常情况：相对路径
        try {
          const fullUrl = new URL(url, baseUrl).href;
          return fullUrl;
        } catch (error) {
          logger.warn(`使用URL构造函数解析失败，尝试手动解析`);
          
          // 基本的手动URL解析
          const pathSegments = baseUrlObj.pathname.split('/').filter(Boolean);
          // 移除最后一个段落（如果它不是目录）
          if (pathSegments.length > 0 && !baseUrlObj.pathname.endsWith('/')) {
            pathSegments.pop();
          }
          
          // 解析相对路径
          const urlSegments = url.split('/');
          for (const segment of urlSegments) {
            if (segment === '..') {
              // 向上一级目录
              if (pathSegments.length > 0) {
                pathSegments.pop();
              }
            } else if (segment !== '.') {
              // 不是当前目录标记，添加到路径
              pathSegments.push(segment);
            }
          }
          
          // 构建完整URL
          const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';
          return `${baseUrlObj.protocol}//${baseUrlObj.host}${path}`;
        }
      } catch (error) {
        logger.error(`解析URL失败: ${url}, 基础URL: ${baseUrl}, 错误: ${error.message}`);
        return '';
      }
    } catch (error) {
      logger.error(`解析URL异常: ${error.message}`, error);
      return '';
    }
  }
  
  /**
   * 获取书源的基础URL
   * @returns {string} 基础URL
   * @private
   */
  _getBaseUrl() {
    if (this.baseUrl) {
      return this.baseUrl;
    }
    
    if (this.bookSource) {
      return this.bookSource.url || this.bookSource.bookSourceUrl || '';
    }
    
    return '';
  }

  /**
   * 使用书源搜索指定关键字
   * @param {string} keyword 搜索关键字
   * @param {boolean} isTest 是否测试模式
   * @returns {Promise<Array>} 搜索结果
   */
  async search(keyword, isTest = false) {
    if (!keyword) {
      const error = new Error('搜索关键字不能为空');
      if (isTest) {
        logger.error(error.message);
      }
      throw error;
    }
    
    try {
      // 再次修复已知问题，确保搜索时书源是最新的
      this._fixKnownIssues(isTest);
      
      // 检查书源是否有搜索功能
      if (!this.bookSource.search || !this.bookSource.search.url) {
        const error = new Error('书源不支持搜索');
        if (isTest) {
          logger.error(error.message);
        }
        throw error;
      }
      
      if (isTest) {
        logger.info(`搜索关键字: ${keyword}`);
      }
      
      // 构建搜索URL
      let searchUrl = this.bookSource.search.url;
      
      // 替换所有可能的关键字变量
      const keywordVariables = ['{{keyword}}', '{keyword}', '{{key}}', '{key}'];
      keywordVariables.forEach(variable => {
        if (searchUrl.includes(variable)) {
          searchUrl = searchUrl.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), encodeURIComponent(keyword));
        }
      });
      
      // 如果URL中仍然包含未替换的模板变量，可能是书源配置错误
      if (searchUrl.includes('{{') || searchUrl.includes('{key')) {
        if (isTest) {
          logger.warn(`搜索URL中包含未替换的变量: ${searchUrl}`);
        }
        
        // 尝试使用URL参数方式添加关键字
        try {
          const urlObj = new URL(this._resolveUrl(searchUrl, this._getBaseUrl()));
          const searchKey = this.bookSource.search.keyEncoding || 'wd';
          urlObj.searchParams.set(searchKey, keyword);
          searchUrl = urlObj.toString();
        } catch (error) {
          if (isTest) {
            logger.error(`无法解析搜索URL: ${searchUrl}, 错误: ${error.message}`);
          }
          throw new Error(`无法构建有效的搜索URL: ${error.message}`);
        }
      }
      
      // 确保URL是完整的
      searchUrl = this._resolveUrl(searchUrl, this._getBaseUrl());
      
      if (isTest) {
        logger.info(`搜索URL: ${searchUrl}`);
      }
      
      // 域名有效性检查
      try {
        const urlObj = new URL(searchUrl);
        if (!urlObj.hostname || urlObj.hostname === 'localhost' || urlObj.hostname === '0.0.0.0' || urlObj.hostname === '127.0.0.1') {
          const error = new Error(`无效的搜索域名: ${urlObj.hostname}`);
          if (isTest) {
            logger.error(error.message);
          }
          throw error;
        }
      } catch (error) {
        if (isTest) {
          logger.error(`无效的搜索URL: ${searchUrl}, 错误: ${error.message}`);
        }
        throw error;
      }
      
      // 发送搜索请求 - 只尝试一次
      const response = await this._request(searchUrl, { isTest });
      
      if (!response || !response.content) {
        const error = new Error('搜索请求失败');
        if (isTest) {
          logger.error(error.message);
        }
        throw error;
      }
      
      // 处理搜索结果
      let bookList = [];
      const contentType = response.contentType || '';
      
      // 根据响应类型处理
      if (contentType.includes('application/json') || contentType.includes('text/json') || 
          (this.bookSource.search.format && this.bookSource.search.format.toLowerCase() === 'json')) {
        // 处理JSON格式响应
        if (isTest) {
          logger.info('解析JSON搜索结果');
        }
        
        bookList = await this._processTextSearchResult(response.content, this.bookSource.search, isTest);
      } else {
        // 处理HTML格式响应
        if (isTest) {
          logger.info('解析HTML搜索结果');
        }
        
        const bookListSelector = this.bookSource.search.list;
        if (!bookListSelector) {
          const error = new Error('书源未指定搜索结果列表选择器');
          if (isTest) {
            logger.error(error.message);
          }
          throw error;
        }
        
        // 提取书籍列表元素
        const bookElements = this._extract(response.$, response.dom, bookListSelector, searchUrl);
        
        if (!bookElements || !Array.isArray(bookElements) || bookElements.length === 0) {
          if (isTest) {
            logger.warn('未找到搜索结果');
          }
          return [];
        }
        
        if (isTest) {
          logger.info(`找到 ${bookElements.length} 个结果元素`);
        }
        
        // 对每个书籍元素提取详细信息
        const nameSelector = this.bookSource.search.name;
        const authorSelector = this.bookSource.search.author;
        const kindSelector = this.bookSource.search.kind;
        const lastChapterSelector = this.bookSource.search.lastChapter;
        const coverSelector = this.bookSource.search.cover;
        const introSelector = this.bookSource.search.intro;
        const bookUrlSelector = this.bookSource.search.bookUrl;
        
        if (!nameSelector || !bookUrlSelector) {
          const error = new Error('书源未指定书名或URL选择器');
          if (isTest) {
            logger.error(error.message);
          }
          throw error;
        }
        
        for (const element of bookElements) {
          try {
            const name = this._extractFromElement(element, nameSelector, searchUrl);
            const author = authorSelector ? this._extractFromElement(element, authorSelector, searchUrl) : '';
            const kind = kindSelector ? this._extractFromElement(element, kindSelector, searchUrl) : '';
            const lastChapter = lastChapterSelector ? this._extractFromElement(element, lastChapterSelector, searchUrl) : '';
            const cover = coverSelector ? this._extractFromElement(element, coverSelector, searchUrl) : '';
            const intro = introSelector ? this._extractFromElement(element, introSelector, searchUrl) : '';
            const bookUrl = this._extractFromElement(element, bookUrlSelector, searchUrl);
            
            if (!name || !bookUrl) {
              if (isTest) {
                logger.warn(`跳过无效结果: 书名=${name}, URL=${bookUrl}`);
              }
              continue;
            }
            
            bookList.push({
              name,
              author,
              kind,
              lastChapter,
              cover,
              intro,
              bookUrl: this._resolveUrl(bookUrl, searchUrl)
            });
            
            if (isTest) {
              logger.info(`解析到书籍: ${name} (${author})`);
            }
          } catch (error) {
            if (isTest) {
              logger.warn(`解析搜索结果元素失败: ${error.message}`);
            }
          }
        }
      }
      
      if (isTest) {
        logger.info(`总计找到 ${bookList.length} 本书`);
      }
      
      // 筛选出精确匹配的结果
      const exactMatches = bookList.filter(book => {
        // 精确匹配书名
        const nameMatch = book.name && book.name.toLowerCase() === keyword.toLowerCase();
        
        // 如果有作者信息，也检查作者是否匹配（模糊匹配，因为作者名可能有变体）
        const authorMatch = book.author 
          ? book.author.toLowerCase().includes(keyword.toLowerCase()) || 
            keyword.toLowerCase().includes(book.author.toLowerCase())
          : false;
        
        return nameMatch || authorMatch;
      });
      
      // 如果有精确匹配的结果，则返回精确匹配
      if (exactMatches.length > 0) {
        if (isTest) {
          logger.info(`找到 ${exactMatches.length} 本精确匹配的书籍`);
        }
        return exactMatches;
      }
      
      // 否则返回所有结果
      return bookList;
    } catch (error) {
      if (isTest) {
        logger.error(`搜索失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 从DOM元素中提取数据
   * @param {Element} element DOM元素
   * @param {string} selector 选择器或XPath表达式
   * @param {string} baseUrl 基础URL
   * @returns {string|null} 提取的内容
   * @private
   */
  _extractFromElement(element, selector, baseUrl) {
    if (!element || !selector) {
      return null;
    }
    
    try {
      // 处理简单属性选择
      if (selector === 'text') {
        return element.textContent ? element.textContent.trim() : null;
      }
      
      if (selector === 'html' || selector === 'innerHTML') {
        return element.innerHTML;
      }
      
      if (selector === 'outerHtml' || selector === 'outerHTML') {
        return element.outerHTML;
      }
      
      // 处理属性选择 (@属性名)
      if (selector.startsWith('@')) {
        const attr = selector.substring(1);
        const value = element.getAttribute(attr);
        
        // 特殊处理链接属性
        if (value && (attr === 'href' || attr === 'src' || attr === 'data-src' || attr === 'data-original')) {
          return this._resolveUrl(value, baseUrl);
        }
        
        return value;
      }
      
      // 处理嵌套选择器 (selector->property)
      if (selector.includes('->')) {
        const [childSelector, property] = selector.split('->').map(s => s.trim());
        
        // 先找到子元素
        let childElement;
        try {
          // 尝试使用CSS选择器
          childElement = element.querySelector(childSelector);
        } catch (e) {
          logger.warn(`无效的CSS选择器: ${childSelector}`);
          return null;
        }
        
        if (!childElement) return null;
        
        // 递归提取属性
        return this._extractFromElement(childElement, property, baseUrl);
      }
      
      // 处理CSS选择器
      try {
        // 尝试使用CSS选择器
        const selected = element.querySelector(selector);
        if (selected) {
          return selected.textContent ? selected.textContent.trim() : null;
        }
      } catch (e) {
        // 选择器无效或其他错误
        logger.warn(`CSS选择器执行失败: ${selector}, 错误: ${e.message}`);
      }
      
      // 处理特殊语法选择器
      if (selector.startsWith('class.') || selector.startsWith('id.') || selector.startsWith('tag.')) {
        let cssSelector = '';
        
        if (selector.startsWith('class.')) {
          const className = selector.substring(6);
          cssSelector = `.${className}`;
        } else if (selector.startsWith('id.')) {
          const idName = selector.substring(3);
          cssSelector = `#${idName}`;
        } else if (selector.startsWith('tag.')) {
          const tagName = selector.substring(4);
          cssSelector = tagName;
        }
        
        try {
          // 处理索引，例如 tag.div:0
          if (cssSelector.includes(':')) {
            const [selectorPart, indexPart] = cssSelector.split(':');
            const index = parseInt(indexPart, 10);
            
            const elements = element.querySelectorAll(selectorPart);
            if (elements.length > index) {
              return elements[index].textContent ? elements[index].textContent.trim() : null;
            }
          } else {
            // 普通选择器
            const selected = element.querySelector(cssSelector);
            if (selected) {
              return selected.textContent ? selected.textContent.trim() : null;
            }
          }
        } catch (e) {
          logger.warn(`特殊选择器执行失败: ${selector}, 错误: ${e.message}`);
        }
      }
      
      // 如果以上都失败，返回元素自身的文本内容作为后备
      return element.textContent ? element.textContent.trim() : null;
    } catch (error) {
      logger.error(`从DOM元素提取数据失败: ${selector}, 错误: ${error.message}`, error);
      return null;
    }
  }

  /**
   * 映射阅读3.0格式的书源字段
   * @param {Object} bookSource 原始书源对象
   * @returns {Object} 映射后的书源对象
   * @private
   */
  _mapBookSourceFields(bookSource) {
    if (!bookSource) return null;
    
    // 创建一个新对象，不修改原始对象
    const mappedSource = { ...bookSource };
    
    // 映射表 - 阅读3.0字段到我们系统的字段
    const fieldMappings = {
      // 基本信息映射
      bookSourceUrl: 'url',
      bookSourceName: 'name',
      bookSourceGroup: 'group',
      
      // 搜索相关映射
      searchUrl: 'search.url',
      searchList: 'search.list',
      searchName: 'search.name',
      searchAuthor: 'search.author',
      searchKind: 'search.kind',
      searchLastChapter: 'search.lastChapter',
      searchCover: 'search.cover',
      searchNoteUrl: 'search.bookUrl',
      searchIntroduce: 'search.intro',
      
      // 章节相关映射
      chapterUrl: 'chapters.url',
      chapterList: 'chapters.list',
      chapterName: 'chapters.name',
      chapterLink: 'chapters.url',
      
      // 内容相关映射
      contentUrl: 'content.url',
      contentRule: 'content.content',
      contentReplaceRule: 'content.contentReplace'
    };
    
    // 执行映射
    for (const [oldField, newField] of Object.entries(fieldMappings)) {
      if (bookSource[oldField] !== undefined) {
        // 处理嵌套字段
        if (newField.includes('.')) {
          const [category, field] = newField.split('.');
          if (!mappedSource[category]) {
            mappedSource[category] = {};
          }
          mappedSource[category][field] = bookSource[oldField];
        } else {
          mappedSource[newField] = bookSource[oldField];
        }
      }
    }
    
    // 特殊处理 - 将header从字符串转换为对象
    if (mappedSource.header && typeof mappedSource.header === 'string') {
      try {
        mappedSource.header = JSON.parse(mappedSource.header);
      } catch (error) {
        logger.warn(`解析header失败: ${error.message}`);
      }
    }
    
    // 确保必要的字段存在
    const ensureNestedStruct = (obj, path) => {
      const parts = path.split('.');
      let current = obj;
      
      for (const part of parts) {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    };
    
    // 确保必要的嵌套结构存在
    ensureNestedStruct(mappedSource, 'search');
    ensureNestedStruct(mappedSource, 'chapters');
    ensureNestedStruct(mappedSource, 'content');
    
    return mappedSource;
  }

  /**
   * 获取章节列表页URL
   * @param {Object} book 书籍信息
   * @param {boolean} isTest 是否为测试模式
   * @returns {Promise<string>} 章节列表页URL
   * @private
   */
  async _getChapterUrl(book, isTest = false) {
    if (!book || !book.bookUrl) {
      throw new Error('书籍信息不完整');
    }
    
    try {
      // 不同书源的章节URL规则处理
      let chapterUrl = '';
      
      // 1. 优先使用书源配置的章节URL规则
      if (this.bookSource.chapters && this.bookSource.chapters.url) {
        if (isTest) {
          logger.info(`使用书源配置的章节URL规则: ${this.bookSource.chapters.url}`);
        }
        
        // 替换变量
        chapterUrl = this.bookSource.chapters.url.replace(/{{bookUrl}}/g, book.bookUrl);
        
        // 检查是否存在未替换的变量
        if (chapterUrl.includes('{{')) {
          if (isTest) {
            logger.warn(`章节URL中存在未替换的变量: ${chapterUrl}`);
          }
          // 不尝试替换变量，继续尝试其他方法
        } else {
          // 解析为完整URL
          chapterUrl = this._resolveUrl(chapterUrl, book.bookUrl);
          
          if (isTest) {
            logger.info(`解析得到章节URL: ${chapterUrl}`);
          }
          
          return chapterUrl;
        }
      }
      
      // 2. 如果没有配置或替换失败，尝试从书籍详情页中提取章节列表URL
      if (!chapterUrl) {
        if (isTest) {
          logger.info(`尝试从书籍详情页获取章节列表URL`);
        }
        
        // 只请求一次书籍详情页
        const response = await this._request(book.bookUrl, { isTest });
        
        if (!response || !response.content) {
          if (isTest) {
            logger.warn('获取书籍详情页失败，将使用书籍URL作为章节URL');
          }
          return book.bookUrl;
        }
        
        // 尝试从页面中提取章节列表链接
        if (this.bookSource.chapters && this.bookSource.chapters.list) {
          // 如果配置了章节列表选择器，可能本页就是章节页
          return book.bookUrl;
        }
        
        // 尝试找到章节列表链接
        const chapterLinkSelectors = [
          'a:contains(章节目录)',
          'a:contains(目录)',
          'a:contains(查看全部章节)',
          'a:contains(全部章节)',
          'a[href*=catalog]',
          'a[href*=chapter]',
          'a[href*=list]'
        ];
        
        for (const selector of chapterLinkSelectors) {
          try {
            const link = response.$(selector).first();
            if (link && link.length) {
              const href = link.attr('href');
              if (href) {
                chapterUrl = this._resolveUrl(href, book.bookUrl);
                
                if (isTest) {
                  logger.info(`从详情页找到章节链接: ${chapterUrl}`);
                }
                
                return chapterUrl;
              }
            }
          } catch (error) {
            // 继续尝试下一个选择器
            continue;
          }
        }
        
        // 如果没有找到明确的章节链接，但有章节列表选择器，可能当前页面就是章节页
        if (this.bookSource.chapters && this.bookSource.chapters.name) {
          // 尝试检查页面中是否有符合章节名选择器的元素
          const testElement = response.$(this.bookSource.chapters.name).first();
          if (testElement && testElement.length) {
            if (isTest) {
              logger.info(`当前页面可能是章节页，已找到章节名元素`);
            }
            return book.bookUrl;
          }
        }
        
        // 如果所有尝试都失败，使用书籍URL作为章节URL
        if (isTest) {
          logger.warn(`未找到章节列表链接，将使用书籍URL作为章节URL`);
        }
      }
      
      // 3. 如果仍然没有找到，使用书籍URL作为章节URL
      if (!chapterUrl) {
        if (isTest) {
          logger.warn(`无法确定章节URL，将使用书籍URL: ${book.bookUrl}`);
        }
        return book.bookUrl;
      }
      
      return chapterUrl;
    } catch (error) {
      if (isTest) {
        logger.error(`获取章节URL失败: ${error.message}`);
      }
      // 回退到使用书籍URL
      return book.bookUrl;
    }
  }

  /**
   * 修复已知的书源问题
   * @param {boolean} isTest 是否为测试模式
   * @private
   */
  _fixKnownIssues(isTest = false) {
    if (!this.bookSource) return;
    
    try {
      // 修复错误的URL
      if (this.bookSource.url && this.bookSource.url.includes('ixs5200.com')) {
        const oldUrl = this.bookSource.url;
        this.bookSource.url = this.bookSource.url.replace('ixs5200.com', '18ys.net');
        
        if (isTest) {
          logger.info(`[已知问题修复] 替换书源URL: ${oldUrl} -> ${this.bookSource.url}`);
        }
        
        // 更新baseUrl
        this.baseUrl = this._getBaseUrl();
      }
      
      // 修复搜索URL中的问题
      if (this.bookSource.search && this.bookSource.search.url) {
        // 修复包含ixs5200.com的URL
        if (this.bookSource.search.url.includes('ixs5200.com')) {
          const oldUrl = this.bookSource.search.url;
          this.bookSource.search.url = this.bookSource.search.url.replace('ixs5200.com', '18ys.net');
          
          if (isTest) {
            logger.info(`[已知问题修复] 替换搜索URL: ${oldUrl} -> ${this.bookSource.search.url}`);
          }
        }
        
        // 修复未替换的模板变量
        if (this.bookSource.search.url.includes('{{key}}') && !this.bookSource.search.url.includes('{{keyword}}')) {
          this.bookSource.search.url = this.bookSource.search.url.replace(/{{key}}/g, '{{keyword}}');
          
          if (isTest) {
            logger.info(`[已知问题修复] 替换搜索URL中的模板变量: {{key}} -> {{keyword}}`);
          }
        }
      }
      
      // 检查并修复常见的选择器错误
      if (this.bookSource.search) {
        // 修复常见的选择器问题
        if (this.bookSource.search.list && this.bookSource.search.list.includes('##')) {
          const parts = this.bookSource.search.list.split('##');
          this.bookSource.search.list = parts[0].trim();
          
          if (isTest) {
            logger.info(`[已知问题修复] 修复搜索列表选择器: ${parts[0].trim()}`);
          }
        }
      }
      
      // 确保必要的字段存在
      if (!this.bookSource.search) {
        this.bookSource.search = {};
      }
      
      if (!this.bookSource.chapters) {
        this.bookSource.chapters = {};
      }
      
      if (!this.bookSource.content) {
        this.bookSource.content = {};
      }
    } catch (error) {
      if (isTest) {
        logger.error(`修复已知问题失败: ${error.message}`);
      }
    }
  }
}

module.exports = BookSourceParser; 