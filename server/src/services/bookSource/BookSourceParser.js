const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { JSDOM } = require('jsdom');
const logger = require('../../utils/logger');

/**
 * 书源解析器
 * 用于根据书源规则抓取和解析网页内容
 */
class BookSourceParser {
  /**
   * 构造函数
   * @param {Object} bookSource 书源配置对象
   */
  constructor(bookSource) {
    // 处理阅读3.0格式的书源，映射字段名到我们的内部格式
    this.bookSource = this._mapBookSourceFields(bookSource);
    
    // 获取配置的测试超时时间
    const config = require('../../config/config');
    this.testTimeout = config.bookSourceTest ? config.bookSourceTest.timeout : 30000; // 增加到30秒
    
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
      timeout: bookSource.timeout || 30000, // 默认超时时间设为30秒
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
        if (hostname === '0.0.0.0' || hostname === 'localhost') {
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
   * 发送HTTP请求并获取响应
   * @param {string} url 请求URL
   * @param {Object} options 请求选项
   * @returns {Promise<Object>} 响应对象，包含响应数据和解析后的DOM
   */
  async _request(url, options = {}) {
    // 在测试模式中不重试，正常模式中使用书源配置的重试次数
    let retries = options.isTest ? 0 : (this.bookSource.retry || 3);
    let error;
    
    // 修复可能导致DNS解析到0.0.0.0的URL问题
    try {
      // 确保URL格式正确
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error(`无效的URL: 必须以http://或https://开头 - ${url}`);
      }
      
      // 检查、清理和修复URL
      url = url.trim();
      
      // 修复已知的域名重定向问题
      try {
        const parsedUrl = new URL(url);
        
        // 预处理已知的域名重定向
        if (parsedUrl.hostname === 'www.ixs5200.com') {
          // 这个域名会重定向到www.18ys.net
          const newUrl = url.replace('www.ixs5200.com', 'www.18ys.net');
          if (options.isTest) {
            logger.info(`[请求] ${this.bookSource.name} - 预处理已知域名重定向: ${url} -> ${newUrl}`);
          }
          url = newUrl;
        }
        
        // 重新解析URL，确保编码正确
        const updatedUrl = new URL(url);
        
        // 确保路径和查询参数正确编码
        let pathname = updatedUrl.pathname;
        let search = updatedUrl.search;
        
        // 检查并重新编码路径中的中文字符
        if (/[\u4e00-\u9fa5]/.test(pathname)) {
          // 如果路径中有未编码的中文
          pathname = pathname.split('/').map(segment => {
            if (/[\u4e00-\u9fa5]/.test(segment)) {
              return encodeURIComponent(segment);
            }
            return segment;
          }).join('/');
        }
        
        // 重新构建URL
        url = `${updatedUrl.protocol}//${updatedUrl.host}${pathname}${search}`;
        
        if (options.isTest) {
          logger.info(`[请求] ${this.bookSource.name} - URL验证并清理后: ${url}`);
        }
      } catch (err) {
        if (options.isTest) {
          logger.error(`[请求] ${this.bookSource.name} - URL验证失败: ${url}, 错误: ${err.message}`, err);
        }
        throw new Error(`无效的URL: ${err.message}`);
      }
    } catch (err) {
      if (options.isTest) {
        logger.error(`[请求] ${this.bookSource.name} - URL无效: ${url}, 错误: ${err.message}`, err);
      }
      throw new Error(`无效的URL: ${err.message}`);
    }
    
    // 测试模式下使用配置的超时时间
    if (options.isTest) {
      options.timeout = this.testTimeout;
      logger.info(`[请求] ${this.bookSource.name} - 发送请求: ${url}, 超时设置: ${options.timeout}ms`);
    }

    // 配置当前请求的选项
    const requestOptions = {
      ...options,
      headers: {
        ...this._getHeaders(),
        'Referer': new URL(url).origin, // 添加Referer头，有些网站需要
        'Host': new URL(url).host, // 明确指定Host头，避免一些DNS问题
        'Accept-Encoding': 'gzip, deflate, br', // 支持压缩
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...(options.headers || {})
      },
      // 允许重定向
      maxRedirects: 10,
      validateStatus: (status) => {
        return status >= 200 && status < 400; // 只接受2xx和3xx状态码
      }
    };

    // 确定使用的HTTP方法和请求体
    const method = (options.method || 'GET').toUpperCase();
    let requestData = options.data || null;

    while (retries >= 0) {
      try {
        const startTime = Date.now();
        
        // 发送请求并处理可能的错误
        let response;
        try {
          // 根据HTTP方法发送不同类型的请求
          if (method === 'POST') {
            // 处理表单数据
            if (typeof requestData === 'string' && !requestOptions.headers['Content-Type']) {
              // 默认使用表单编码
              requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            
            if (options.isTest) {
              logger.info(`[请求] ${this.bookSource.name} - 发送POST请求，请求体: ${requestData}`);
            }
            
            response = await this.axios.post(url, requestData, requestOptions);
          } else {
            // GET请求
            response = await this.axios.get(url, requestOptions);
          }
        } catch (requestErr) {
          // 特殊处理DNS解析失败的错误
          if (requestErr.code === 'ECONNREFUSED' && requestErr.message.includes('0.0.0.0')) {
            // 尝试使用别名域名
            const parsedUrl = new URL(url);
            let altDomain = null;
            
            // 检查已知的域名映射
            if (parsedUrl.hostname === 'www.ixs5200.com') {
              altDomain = 'www.18ys.net';
            }
            
            if (altDomain && options.isTest) {
              logger.info(`[请求] ${this.bookSource.name} - 连接被拒绝，尝试使用别名域名: ${parsedUrl.hostname} -> ${altDomain}`);
              
              // 替换域名并重试
              const altUrl = url.replace(parsedUrl.hostname, altDomain);
              try {
                if (method === 'POST') {
                  response = await this.axios.post(altUrl, requestData, {
                    ...requestOptions,
                    headers: {
                      ...requestOptions.headers,
                      'Host': altDomain,
                      'Referer': altUrl.replace(/\/[^\/]*$/, '/') // 更新Referer
                    }
                  });
                } else {
                  response = await this.axios.get(altUrl, {
                    ...requestOptions,
                    headers: {
                      ...requestOptions.headers,
                      'Host': altDomain,
                      'Referer': altUrl.replace(/\/[^\/]*$/, '/') // 更新Referer
                    }
                  });
                }
                
                // 如果成功，更新URL
                url = altUrl;
              } catch (altErr) {
                // 如果别名也失败，抛出原始错误
                throw requestErr;
              }
            } else {
              throw requestErr;
            }
          } else {
            throw requestErr;
          }
        }
        
        const endTime = Date.now();
        
        if (options.isTest) {
          logger.info(`[请求] ${this.bookSource.name} - 请求成功, 耗时: ${endTime - startTime}ms, 状态码: ${response.status}`);
        }
        
        // 处理重定向
        const finalUrl = response.request.res.responseUrl || url;
        if (finalUrl !== url && options.isTest) {
          logger.info(`[请求] ${this.bookSource.name} - 请求被重定向: ${url} -> ${finalUrl}`);
          
          // 更新请求URL为重定向后的URL，这对后续使用很重要
          url = finalUrl;
        }
        
        // 处理编码
        let charset = options.charset || this._detectCharset(response) || this.bookSource.charset || 'utf-8';
        if (options.isTest) {
          logger.info(`[请求] ${this.bookSource.name} - 检测到编码: ${charset}`);
        }
        
        const html = iconv.decode(response.data, charset);
        
        // 根据需要决定是否使用JSDOM或cheerio
        let $ = null;
        let dom = null;
        
        if (this.bookSource.enableJs) {
          if (options.isTest) {
            logger.info(`[请求] ${this.bookSource.name} - 启用JavaScript，使用JSDOM解析`);
          }
          
          // 使用JSDOM执行JavaScript
          const jsdom = new JSDOM(html, {
            url: url,
            referrer: options.referrer || url,
            contentType: "text/html",
            includeNodeLocations: false,
            storageQuota: 10000000,
            runScripts: "dangerously"
          });
          
          dom = jsdom.window.document;
          // 等待JavaScript执行完成（可根据需要调整等待时间）
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (options.isTest) {
            logger.info(`[请求] ${this.bookSource.name} - JSDOM解析完成，等待JavaScript执行`);
          }
        } else {
          // 使用cheerio进行快速解析（不执行JavaScript）
          $ = cheerio.load(html);
          
          if (options.isTest) {
            logger.info(`[请求] ${this.bookSource.name} - 使用Cheerio解析，HTML长度: ${html.length}`);
          }
        }
        
        return { 
          response, 
          html, 
          $, 
          dom,
          url: finalUrl // 获取最终URL（处理重定向）
        };
      } catch (err) {
        error = err;
        if (options.isTest) {
          logger.error(`[请求] ${this.bookSource.name} - 请求失败: ${url}, 错误: ${err.message}`, err);
        } else {
          logger.error(`请求失败: ${url}, 重试剩余: ${retries}`, err);
        }
        retries--;
        
        // 等待一段时间再重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw error || new Error(`请求失败: ${url}`);
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
   * 处理复杂选择器
   * @param {Object} $ Cheerio对象
   * @param {string} selector 复杂选择器
   * @param {string} baseUrl 基础URL
   * @returns {string|Array|null} 提取的内容
   */
  _processComplexSelector($, selector, baseUrl) {
    try {
      // 处理多个选择器（用|分隔的备选选择器）
      if (selector.includes('|')) {
        const selectors = selector.split('|');
        for (const sel of selectors) {
          try {
            const result = this._processComplexSelector($, sel.trim(), baseUrl);
            if (result) return result;
          } catch (err) {
            logger.error(`处理选择器 "${sel}" 失败，尝试下一个`, err);
            continue;
          }
        }
        return null;
      }
      
      // 处理阅读3.0中的property属性选择器，如[property="og:novel:author"]@content
      if (selector.startsWith('[') && selector.includes(']@')) {
        const parts = selector.split(']@');
        const attrSelector = parts[0] + ']';
        const attrName = parts[1];
        
        try {
          const elements = $(attrSelector);
          logger.debug(`[复杂选择器] 处理属性选择器: ${attrSelector}，找到 ${elements.length} 个元素`);
          
          if (elements.length === 0) return null;
          
          const result = elements.attr(attrName);
          if (result) {
            logger.debug(`[复杂选择器] 提取属性 ${attrName}：${result}`);
            return result;
          }
          return null;
        } catch (err) {
          logger.error(`选择器应用失败: "${attrSelector}"`, err);
          return null;
        }
      }

      // 处理级联选择器（用@分隔的多级选择器）
      if (selector.includes('@')) {
        const parts = selector.split('@');
        let currentSelection = $('body');  // 从body开始，确保是Cheerio对象
        let result = null;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          
          // 处理第一个部分（根选择器）
          if (i === 0) {
            // 如果是property属性选择器，如[property="og:novel:author"]
            if (part.startsWith('[') && part.endsWith(']')) {
              currentSelection = $(part);
              logger.debug(`[复杂选择器] 处理属性选择器：${part}，找到 ${currentSelection.length} 个元素`);
            }
            // 如果是class.xxx形式
            else if (part.startsWith('class.')) {
              const classNameRaw = part.substring(6);
              
              // 处理带空格的类名
              if (classNameRaw.includes(' ')) {
                const classNames = classNameRaw.split(' ').filter(Boolean);
                const cssSelector = classNames.map(name => `.${name}`).join('');
                currentSelection = $(cssSelector);
                logger.debug(`[复杂选择器] 处理空格类名：${classNameRaw} -> ${cssSelector}，找到 ${currentSelection.length} 个元素`);
              } else {
                currentSelection = $(`.${classNameRaw}`);
                logger.debug(`[复杂选择器] 处理类名：.${classNameRaw}，找到 ${currentSelection.length} 个元素`);
              }
            }
            // 如果是tag.xxx形式
            else if (part.startsWith('tag.')) {
              const tagName = part.substring(4);
              currentSelection = $(tagName);
              logger.debug(`[复杂选择器] 处理标签：${tagName}，找到 ${currentSelection.length} 个元素`);
            }
            // 如果是id.xxx形式
            else if (part.startsWith('id.')) {
              const idName = part.substring(3);
              currentSelection = $(`#${idName}`);
              logger.debug(`[复杂选择器] 处理ID：#${idName}，找到 ${currentSelection.length} 个元素`);
            }
            // 如果是普通CSS选择器
            else {
              currentSelection = $(part);
              logger.debug(`[复杂选择器] 处理普通选择器：${part}，找到 ${currentSelection.length} 个元素`);
            }
            
            // 如果只有一个部分，返回结果
            if (parts.length === 1) {
              if (currentSelection.length === 0) return null;
              return currentSelection.text().trim();
            }
            
            // 如果没有找到元素，返回null
            if (currentSelection.length === 0) {
              logger.debug(`[复杂选择器] 第一部分 ${part} 没有找到元素，返回null`);
              return null;
            }
            continue;
          }
          
          // 处理后续部分
          
          // 检查是否是属性选择器
          if (part === 'text') {
            result = currentSelection.text().trim();
            logger.debug(`[复杂选择器] 提取文本：${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`);
            break;
          } else if (part === 'html') {
            result = currentSelection.html();
            logger.debug(`[复杂选择器] 提取HTML，长度: ${result ? result.length : 0}`);
            break;
          } else if (part === 'href' || part === 'src' || part === 'content' || part === 'value') {
            const attrVal = currentSelection.attr(part);
            result = attrVal ? (part === 'href' || part === 'src' ? this._resolveUrl(attrVal, baseUrl) : attrVal) : null;
            logger.debug(`[复杂选择器] 提取属性 ${part}：${result}`);
            break;
          } else if (part.startsWith('attr.')) {
            const attrName = part.substring(5);
            result = currentSelection.attr(attrName);
            logger.debug(`[复杂选择器] 提取自定义属性 ${attrName}：${result}`);
            break;
          }
          
          // 处理 tag.xxx 形式
          if (part.startsWith('tag.')) {
            const tagName = part.substring(4);
            currentSelection = currentSelection.find(tagName);
            logger.debug(`[复杂选择器] 在当前选择中查找标签：${tagName}，找到 ${currentSelection.length} 个元素`);
            if (currentSelection.length === 0) return null;
            
            // 如果是最后一个部分，返回文本内容
            if (i === parts.length - 1) {
              result = currentSelection.text().trim();
            }
            continue;
          }
          
          // 处理 class.xxx 形式
          if (part.startsWith('class.')) {
            const classNameRaw = part.substring(6);
            
            // 处理带空格的类名
            if (classNameRaw.includes(' ')) {
              const classNames = classNameRaw.split(' ').filter(Boolean);
              const cssSelector = classNames.map(name => `.${name}`).join('');
              currentSelection = currentSelection.find(cssSelector);
              logger.debug(`[复杂选择器] 在当前选择中查找空格类名：${classNameRaw} -> ${cssSelector}，找到 ${currentSelection.length} 个元素`);
            } else {
              currentSelection = currentSelection.find(`.${classNameRaw}`);
              logger.debug(`[复杂选择器] 在当前选择中查找类名：.${classNameRaw}，找到 ${currentSelection.length} 个元素`);
            }
            
            if (currentSelection.length === 0) return null;
            
            // 如果是最后一个部分，返回文本内容
            if (i === parts.length - 1) {
              result = currentSelection.text().trim();
            }
            continue;
          }
          
          // 处理 id.xxx 形式
          if (part.startsWith('id.')) {
            const idName = part.substring(3);
            currentSelection = currentSelection.find(`#${idName}`);
            logger.debug(`[复杂选择器] 在当前选择中查找ID：#${idName}，找到 ${currentSelection.length} 个元素`);
            if (currentSelection.length === 0) return null;
            
            // 如果是最后一个部分，返回文本内容
            if (i === parts.length - 1) {
              result = currentSelection.text().trim();
            }
            continue;
          }
          
          // 处理普通CSS选择器
          try {
            currentSelection = currentSelection.find(part);
            logger.debug(`[复杂选择器] 在当前选择中查找：${part}，找到 ${currentSelection.length} 个元素`);
            if (currentSelection.length === 0) return null;
            
            // 如果是最后一个部分，返回文本内容
            if (i === parts.length - 1) {
              result = currentSelection.text().trim();
            }
          } catch (err) {
            logger.error(`无效的CSS选择器: "${part}"`, err);
            return null;
          }
        }
        
        return result;
      }
      
      // 处理独立的 class.xxx 形式选择器（不包含@）
      if (selector.startsWith('class.')) {
        const classNameRaw = selector.substring(6);
        
        // 处理带空格的类名
        if (classNameRaw.includes(' ')) {
          const classNames = classNameRaw.split(' ').filter(Boolean);
          const cssSelector = classNames.map(name => `.${name}`).join('');
          try {
            const elements = $(cssSelector);
            logger.debug(`[复杂选择器] 处理独立空格类名：${classNameRaw} -> ${cssSelector}，找到 ${elements.length} 个元素`);
            if (elements.length === 0) return null;
            if (elements.length === 1) return elements.text().trim();
            return elements.map((i, el) => $(el).text().trim()).get();
          } catch (err) {
            logger.error(`选择器转换失败: "${classNameRaw}" -> "${cssSelector}"`, err);
            return null;
          }
        } else {
          try {
            const elements = $(`.${classNameRaw}`);
            logger.debug(`[复杂选择器] 处理独立类名：.${classNameRaw}，找到 ${elements.length} 个元素`);
            if (elements.length === 0) return null;
            if (elements.length === 1) return elements.text().trim();
            return elements.map((i, el) => $(el).text().trim()).get();
          } catch (err) {
            logger.error(`选择器应用失败: ".${classNameRaw}"`, err);
            return null;
          }
        }
      }
      
      // 处理独立的 tag.xxx 形式选择器
      if (selector.startsWith('tag.')) {
        const tagName = selector.substring(4);
        try {
          const elements = $(tagName);
          logger.debug(`[复杂选择器] 处理独立标签：${tagName}，找到 ${elements.length} 个元素`);
          if (elements.length === 0) return null;
          if (elements.length === 1) return elements.text().trim();
          return elements.map((i, el) => $(el).text().trim()).get();
        } catch (err) {
          logger.error(`选择器应用失败: "${tagName}"`, err);
          return null;
        }
      }
      
      // 处理独立的 id.xxx 形式选择器
      if (selector.startsWith('id.')) {
        const idName = selector.substring(3);
        try {
          const elements = $(`#${idName}`);
          logger.debug(`[复杂选择器] 处理独立ID：#${idName}，找到 ${elements.length} 个元素`);
          if (elements.length === 0) return null;
          if (elements.length === 1) return elements.text().trim();
          return elements.map((i, el) => $(el).text().trim()).get();
        } catch (err) {
          logger.error(`选择器应用失败: "#${idName}"`, err);
          return null;
        }
      }
      
      // 普通选择器
      try {
        const elements = $(selector);
        logger.debug(`[复杂选择器] 处理普通选择器：${selector}，找到 ${elements.length} 个元素`);
        if (elements.length === 0) return null;
        if (elements.length === 1) return elements.text().trim();
        return elements.map((i, el) => $(el).text().trim()).get();
      } catch (err) {
        logger.error(`选择器应用失败: "${selector}"`, err);
        return null;
      }
    } catch (error) {
      logger.error(`处理复杂选择器失败: ${selector}`, error);
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
      // 先检查是否是复杂选择器
      if (selector.includes('tag.') || 
          selector.includes('class.') || 
          selector.includes('id.') || 
          (selector.includes('@') && !selector.includes('[@')) ||
          selector.includes('|')) {
        return this._processComplexSelector($, selector, baseUrl);
      }
      
      // 普通选择器
      return $(selector);
    } catch (error) {
      logger.error(`选择器应用失败: ${selector}`, error);
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
    
    try {
      // 先检查是否是复杂选择器
      const isComplexSelector = selector.includes('tag.') || 
                               selector.includes('class.') || 
                               selector.includes('id.') || 
                               (selector.includes('@') && !selector.includes('[@')) ||
                               selector.includes('|');
      
      // 如果是复杂选择器，无论是JSDOM还是Cheerio，都使用我们的自定义处理
      if (isComplexSelector) {
        logger.debug(`[内容提取] 使用复杂选择器处理: ${selector}`);
        const result = this._processComplexSelector($, selector, baseUrl);
        const resultSummary = result ? 
          (Array.isArray(result) ? 
            `数组[${result.length}]` : 
            `"${result.substring(0, 50)}${result.length > 50 ? '...' : ''}"`) : 
          'null';
        logger.debug(`[内容提取] 复杂选择器 "${selector}" 结果: ${resultSummary}`);
        return result;
      }
      
      // 以下处理简单选择器
      logger.debug(`[内容提取] 使用简单选择器处理: ${selector}`);
      
      // 如果使用JSDOM
      if (dom) {
        // 处理XPath选择器
        if (selector.startsWith('//')) {
          logger.debug(`[内容提取] 处理XPath选择器: ${selector}`);
          const result = [];
          const xpathResult = dom.evaluate(
            selector, 
            dom, 
            null, 
            dom.ORDERED_NODE_SNAPSHOT_TYPE, 
            null
          );
          
          for (let i = 0; i < xpathResult.snapshotLength; i++) {
            const node = xpathResult.snapshotItem(i);
            result.push(node.textContent);
          }
          
          logger.debug(`[内容提取] XPath选择器 "${selector}" 找到 ${xpathResult.snapshotLength} 个节点`);
          return result.length === 1 ? result[0] : result;
        }
        
        // 处理普通CSS选择器
        try {
          const elements = dom.querySelectorAll(selector);
          logger.debug(`[内容提取] DOM选择器 "${selector}" 找到 ${elements.length} 个元素`);
          if (elements.length === 0) return null;
          if (elements.length === 1) return elements[0].textContent.trim();
          
          return Array.from(elements).map(el => el.textContent.trim());
        } catch (err) {
          logger.error(`JSDOM选择器执行失败: ${selector}，尝试使用Cheerio`, err);
          // 如果JSDOM选择失败，回退到使用Cheerio
          return this._safeSelect($, selector, baseUrl);
        }
      }
      
      // 普通Cheerio选择
      const elements = $(selector);
      logger.debug(`[内容提取] Cheerio选择器 "${selector}" 找到 ${elements.length} 个元素`);
      if (elements.length === 0) return null;
      
      // 处理特殊属性选择
      if (selector.includes('[@')) {
        const parts = selector.split('[@');
        const attrPart = parts[1].replace(']', '');
        const [attrName, attrValue] = attrPart.split('=');
        
        logger.debug(`[内容提取] 处理属性选择器，属性: ${attrName}=${attrValue}`);
        const filteredElements = elements.filter(function() {
          return $(this).attr(attrName) === attrValue.replace(/['"]/g, '');
        });
        
        logger.debug(`[内容提取] 属性过滤后剩余 ${filteredElements.length} 个元素`);
        if (filteredElements.length === 0) return null;
        if (filteredElements.length === 1) return filteredElements.text().trim();
        return filteredElements.map((i, el) => $(el).text().trim()).get();
      }
      
      if (elements.length === 1) {
        const result = elements.text().trim();
        logger.debug(`[内容提取] 获取到单个元素文本: "${result.substring(0, 50)}${result.length > 50 ? '...' : ''}"`);
        return result;
      }
      
      logger.debug(`[内容提取] 获取到 ${elements.length} 个元素文本`);
      return elements.map((i, el) => $(el).text().trim()).get();
    } catch (error) {
      logger.error(`提取内容失败: ${selector}`, error);
      return null;
    }
  }

  /**
   * 解析相对URL为绝对URL
   * @param {string} url 相对或绝对URL
   * @param {string} baseUrl 基础URL
   * @returns {string} 绝对URL
   */
  _resolveUrl(url, baseUrl) {
    if (!url) return null;
    
    // 如果已经是绝对URL则直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        // 验证URL格式
        const parsedUrl = new URL(url);
        // 检查主机名是否有效
        if (parsedUrl.hostname === '0.0.0.0' || parsedUrl.hostname === 'localhost' || !parsedUrl.hostname.includes('.')) {
          logger.warn(`[URL解析] ${this.bookSource.name} - 发现无效主机名: ${parsedUrl.hostname}，URL: ${url}`);
          throw new Error(`无效的主机名: ${parsedUrl.hostname}`);
        }
        return url;
      } catch (err) {
        logger.warn(`[URL解析] ${this.bookSource.name} - URL格式无效: ${url}, ${err.message}`);
        return null;
      }
    }
    
    try {
      // 如果baseUrl不是完整URL，尝试使用书源URL
      let effectiveBaseUrl = baseUrl;
      if (!baseUrl || (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://'))) {
        effectiveBaseUrl = this.bookSource.url || this.bookSource.bookSourceUrl;
        if (!effectiveBaseUrl) {
          throw new Error('无法解析相对URL，未提供有效的基础URL');
        }
      }
      
      // 尝试解析基础URL
      try {
        const parsedBaseUrl = new URL(effectiveBaseUrl);
        // 检查主机名是否有效
        if (parsedBaseUrl.hostname === '0.0.0.0' || parsedBaseUrl.hostname === 'localhost' || !parsedBaseUrl.hostname.includes('.')) {
          logger.warn(`[URL解析] ${this.bookSource.name} - 基础URL包含无效主机名: ${parsedBaseUrl.hostname}，URL: ${effectiveBaseUrl}`);
          throw new Error(`基础URL包含无效主机名: ${parsedBaseUrl.hostname}`);
        }
      } catch (err) {
        logger.warn(`[URL解析] ${this.bookSource.name} - 基础URL格式无效: ${effectiveBaseUrl}, ${err.message}`);
        throw new Error(`基础URL格式无效: ${err.message}`);
      }
      
      // 解析完整URL
      const resolvedUrl = new URL(url, effectiveBaseUrl).href;
      
      // 验证解析后的URL
      const parsedResolvedUrl = new URL(resolvedUrl);
      if (parsedResolvedUrl.hostname === '0.0.0.0' || parsedResolvedUrl.hostname === 'localhost' || !parsedResolvedUrl.hostname.includes('.')) {
        logger.warn(`[URL解析] ${this.bookSource.name} - 解析后的URL包含无效主机名: ${parsedResolvedUrl.hostname}，URL: ${resolvedUrl}`);
        throw new Error(`解析后的URL包含无效主机名: ${parsedResolvedUrl.hostname}`);
      }
      
      return resolvedUrl;
    } catch (error) {
      logger.error(`URL解析失败: ${url}, 基础URL: ${baseUrl}`, error);
      // 返回null而不是返回可能无效的URL
      return null;
    }
  }

  /**
   * 搜索书籍
   * @param {string} keyword 搜索关键词
   * @param {boolean} isTest 是否为测试模式
   * @returns {Promise<Array>} 搜索结果列表
   */
  async search(keyword, isTest = false) {
    try {
      // 替换搜索URL中的关键词占位符
      let searchUrl = this.bookSource.searchUrl || this.bookSource.ruleSearchUrl;
      if (!searchUrl) {
        throw new Error('书源未提供搜索URL');
      }
      
      // 检查是否有HTTP请求配置信息
      let httpMethod = 'GET';
      let httpBody = null;
      let httpHeaders = {};
      let charset = null;
      
      // 处理阅读3.0格式的搜索URL（例如："/search.php,{"method":"POST","body":"keyword={{key}}"}"）
      if (searchUrl.includes(',{')) {
        try {
          const [urlPart, configPart] = searchUrl.split(',');
          searchUrl = urlPart.trim();
          
          // 解析配置部分
          const configStr = configPart.trim();
          const config = JSON.parse(configStr);
          
          if (config.method) httpMethod = config.method.toUpperCase();
          if (config.body) httpBody = config.body;
          if (config.headers) httpHeaders = config.headers;
          if (config.charset) charset = config.charset;
          
          if (isTest) {
            logger.info(`[书源测试] ${this.bookSource.name} - 检测到请求配置: 方法=${httpMethod}, 编码=${charset || '默认'}`);
          }
        } catch (error) {
          if (isTest) {
            logger.error(`[书源测试] ${this.bookSource.name} - 解析搜索URL配置失败: ${error.message}`);
          }
          // 出错时仍然尝试使用URL部分
        }
      }
      
      // 支持多种关键词占位符格式
      searchUrl = searchUrl.replace(/\{keyword\}/g, encodeURIComponent(keyword))
                           .replace(/\{\{key\}\}/g, encodeURIComponent(keyword))
                           .replace(/\{\{page\}\}/g, '1')
                           .replace(/searchKey/g, encodeURIComponent(keyword));
      
      // 处理httpBody中的占位符
      if (httpBody) {
        httpBody = httpBody.replace(/\{keyword\}/g, encodeURIComponent(keyword))
                          .replace(/\{\{key\}\}/g, encodeURIComponent(keyword))
                          .replace(/\{\{page\}\}/g, '1')
                          .replace(/searchKey/g, encodeURIComponent(keyword));
      }
      
      // 处理相对URL（没有http或https开头的URL）
      if (searchUrl && !searchUrl.startsWith('http://') && !searchUrl.startsWith('https://')) {
        const bookSourceUrl = this.bookSource.url || this.bookSource.bookSourceUrl;
        if (bookSourceUrl) {
          try {
            // 验证书源URL是否有效
            const parsedSourceUrl = new URL(bookSourceUrl);
            if (parsedSourceUrl.hostname === '0.0.0.0' || parsedSourceUrl.hostname === 'localhost' || !parsedSourceUrl.hostname.includes('.')) {
              throw new Error(`书源URL包含无效主机名: ${parsedSourceUrl.hostname}`);
            }
            
            // 使用书源的URL作为基础URL
            searchUrl = new URL(searchUrl, bookSourceUrl).href;
            
            // 验证拼接后的URL
            const parsedSearchUrl = new URL(searchUrl);
            if (parsedSearchUrl.hostname === '0.0.0.0' || parsedSearchUrl.hostname === 'localhost' || !parsedSearchUrl.hostname.includes('.')) {
              throw new Error(`拼接后的URL包含无效主机名: ${parsedSearchUrl.hostname}`);
            }
            
            if (isTest) {
              logger.info(`[书源测试] ${this.bookSource.name} - 将相对URL转换为绝对URL: ${searchUrl}`);
            }
          } catch (error) {
            if (isTest) {
              logger.error(`[书源测试] ${this.bookSource.name} - URL拼接失败: ${error.message}`);
            }
            throw new Error(`URL拼接失败: ${error.message}`);
          }
        } else {
          throw new Error(`无法解析相对URL: ${searchUrl}，书源未提供网站URL`);
        }
      } else if (searchUrl) {
        // 验证绝对URL是否有效
        try {
          const parsedSearchUrl = new URL(searchUrl);
          if (parsedSearchUrl.hostname === '0.0.0.0' || parsedSearchUrl.hostname === 'localhost' || !parsedSearchUrl.hostname.includes('.')) {
            throw new Error(`搜索URL包含无效主机名: ${parsedSearchUrl.hostname}`);
          }
        } catch (error) {
          if (isTest) {
            logger.error(`[书源测试] ${this.bookSource.name} - 搜索URL无效: ${error.message}`);
          }
          throw new Error(`搜索URL无效: ${error.message}`);
        }
      } else {
        throw new Error('书源未提供搜索URL');
      }
      
      // 测试模式下记录每一步详细信息
      if (isTest) {
        logger.info(`[书源测试] ${this.bookSource.name} - 开始搜索，关键词: "${keyword}", URL: ${searchUrl}, 方法: ${httpMethod}`);
        if (httpBody) {
          logger.info(`[书源测试] ${this.bookSource.name} - 请求体: ${httpBody}`);
        }
      }
      
      // 准备请求选项
      const requestOptions = { 
        isTest,
        method: httpMethod,
        headers: httpHeaders
      };
      
      if (charset) {
        requestOptions.charset = charset;
      }
      
      if (httpMethod === 'POST' && httpBody) {
        requestOptions.data = httpBody;
      }
      
      // 发送请求，在测试模式下禁用重试
      const { $, dom, url } = await this._request(searchUrl, requestOptions);
      
      if (isTest) {
        logger.info(`[书源测试] ${this.bookSource.name} - 获取搜索页面成功，使用选择器: "${this.bookSource.searchList || this.bookSource.ruleSearchList}" 提取结果`);
      }
      
      // 提取搜索结果列表
      const searchListRule = this.bookSource.searchList || this.bookSource.ruleSearchList;
      const resultList = this._extract($, dom, searchListRule, url);
      if (!resultList || (Array.isArray(resultList) && resultList.length === 0)) {
        if (isTest) {
          logger.warn(`[书源测试] ${this.bookSource.name} - 未找到匹配结果，选择器: "${searchListRule}" 未能提取到内容`);
        }
        return [];
      }
      
      if (isTest) {
        const count = Array.isArray(resultList) ? resultList.length : 1;
        logger.info(`[书源测试] ${this.bookSource.name} - 找到 ${count} 个搜索结果`);
      }
      
      // 处理搜索结果
      const results = [];
      
      // 映射阅读3.0的规则名到我们的规则名
      const nameRule = this.bookSource.searchName || this.bookSource.ruleSearchName;
      const authorRule = this.bookSource.searchAuthor || this.bookSource.ruleSearchAuthor;
      const coverRule = this.bookSource.searchCover || this.bookSource.ruleSearchCoverUrl;
      const detailRule = this.bookSource.searchDetail || this.bookSource.ruleSearchNoteUrl;
      const introRule = this.bookSource.searchIntro || this.bookSource.ruleSearchIntroduce;
      
      if ($ && !dom) {
        // 使用Cheerio处理
        $(searchListRule).each((i, element) => {
          const $element = $(element);
          
          try {
            const book = {
              name: this._extract($element, null, nameRule, url),
              author: authorRule ? this._extract($element, null, authorRule, url) : null,
              cover: coverRule ? this._extract($element, null, coverRule, url) : null,
              detail: this._extract($element, null, detailRule, url),
              intro: introRule ? this._extract($element, null, introRule, url) : null,
              source: this.bookSource.name,
              sourceUrl: this.bookSource.url
            };
            
            // 确保详情链接是绝对URL
            if (book.detail && !book.detail.startsWith('http')) {
              book.detail = this._resolveUrl(book.detail, url);
            }
            
            if (isTest && i < 3) { // 只记录前3个结果的详细信息，避免日志过多
              logger.info(`[书源测试] ${this.bookSource.name} - 搜索结果 #${i+1}:`);
              logger.info(`  书名: "${book.name}", 作者: "${book.author}", 详情URL: ${book.detail}`);
            }
            
            results.push(book);
          } catch (err) {
            if (isTest) {
              logger.error(`[书源测试] ${this.bookSource.name} - 提取第 ${i+1} 个搜索结果详情失败:`, err);
            }
          }
        });
      } else if (dom) {
        // 使用JSDOM处理
        const elements = dom.querySelectorAll(searchListRule);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          
          try {
            const book = {
              name: this._extractFromElement(element, nameRule),
              author: authorRule ? this._extractFromElement(element, authorRule) : null,
              cover: coverRule ? this._extractFromElement(element, coverRule) : null,
              detail: this._extractFromElement(element, detailRule),
              intro: introRule ? this._extractFromElement(element, introRule) : null,
              source: this.bookSource.name,
              sourceUrl: this.bookSource.url
            };
            
            // 确保详情链接是绝对URL
            if (book.detail && !book.detail.startsWith('http')) {
              book.detail = this._resolveUrl(book.detail, url);
            }
            
            if (isTest && i < 3) { // 只记录前3个结果的详细信息
              logger.info(`[书源测试] ${this.bookSource.name} - 搜索结果 #${i+1}:`);
              logger.info(`  书名: "${book.name}", 作者: "${book.author}", 详情URL: ${book.detail}`);
            }
            
            results.push(book);
          } catch (err) {
            if (isTest) {
              logger.error(`[书源测试] ${this.bookSource.name} - 提取第 ${i+1} 个搜索结果详情失败:`, err);
            }
          }
        }
      }
      
      if (isTest) {
        logger.info(`[书源测试] ${this.bookSource.name} - 搜索完成，共获取 ${results.length} 个有效结果`);
      }
      
      return results;
    } catch (error) {
      if (isTest) {
        logger.error(`[书源测试] ${this.bookSource.name} - 搜索失败: ${error.message}`, error);
      } else {
        logger.error(`搜索失败: ${keyword}`, error);
      }
      throw error;
    }
  }

  /**
   * 从DOM元素中提取内容
   * @param {Element} element DOM元素
   * @param {string} selector 选择器
   * @returns {string} 提取的内容
   */
  _extractFromElement(element, selector) {
    try {
      if (selector.includes('@')) {
        const parts = selector.split('@');
        const elSelector = parts[0];
        const attrName = parts[1];
        
        const targetEl = elSelector ? element.querySelector(elSelector) : element;
        if (!targetEl) return null;
        
        return targetEl.getAttribute(attrName);
      }
      
      const targetEl = selector ? element.querySelector(selector) : element;
      if (!targetEl) return null;
      
      return targetEl.textContent.trim();
    } catch (error) {
      logger.error(`从元素提取内容失败: ${selector}`, error);
      return null;
    }
  }

  /**
   * 获取书籍详情
   * @param {string} url 书籍详情页URL
   * @param {boolean} isTest 是否为测试模式
   * @returns {Promise<Object>} 书籍详情对象
   */
  async getBookDetail(url, isTest = false) {
    try {
      // 处理相对URL
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        const baseUrl = this.bookSource.url || this.bookSource.bookSourceUrl;
        if (!baseUrl) {
          throw new Error('无法解析相对URL，书源未提供网站URL');
        }
        
        // 验证书源URL
        try {
          const parsedBaseUrl = new URL(baseUrl);
          if (parsedBaseUrl.hostname === '0.0.0.0' || parsedBaseUrl.hostname === 'localhost' || !parsedBaseUrl.hostname.includes('.')) {
            throw new Error(`书源URL包含无效主机名: ${parsedBaseUrl.hostname}`);
          }
        } catch (error) {
          throw new Error(`书源URL无效: ${error.message}`);
        }
        
        // 解析完整URL
        url = this._resolveUrl(url, baseUrl);
        if (!url) {
          throw new Error(`无法解析详情页URL: ${url}`);
        }
        
        if (isTest) {
          logger.info(`[书源测试] ${this.bookSource.name} - 将相对URL转换为绝对URL: ${url}`);
        }
      } else if (url) {
        // 验证绝对URL
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.hostname === '0.0.0.0' || parsedUrl.hostname === 'localhost' || !parsedUrl.hostname.includes('.')) {
            throw new Error(`详情页URL包含无效主机名: ${parsedUrl.hostname}`);
          }
        } catch (error) {
          throw new Error(`详情页URL无效: ${error.message}`);
        }
      } else {
        throw new Error('未提供详情页URL');
      }
      
      // 发送请求
      const { $, dom, url: finalUrl } = await this._request(url, { isTest });
      
      // 获取章节列表URL
      let chapterUrl = this.bookSource.detailChapterUrl 
        ? this._extract($, dom, this.bookSource.detailChapterUrl, finalUrl)
        : finalUrl;
      
      if (this.bookSource.chapterUrl) {
        chapterUrl = this.bookSource.chapterUrl;
      }
      
      // 构建书籍详情
      const book = {
        name: this.bookSource.detailName 
          ? this._extract($, dom, this.bookSource.detailName, finalUrl)
          : null,
        author: this.bookSource.detailAuthor 
          ? this._extract($, dom, this.bookSource.detailAuthor, finalUrl)
          : null,
        cover: this.bookSource.detailCover 
          ? this._extract($, dom, this.bookSource.detailCover, finalUrl)
          : null,
        intro: this.bookSource.detailIntro 
          ? this._extract($, dom, this.bookSource.detailIntro, finalUrl)
          : null,
        category: this.bookSource.detailCategory 
          ? this._extract($, dom, this.bookSource.detailCategory, finalUrl)
          : null,
        chapterUrl: this._resolveUrl(chapterUrl, finalUrl),
        source: this.bookSource.name,
        sourceUrl: this.bookSource.url,
        detailUrl: finalUrl
      };
      
      return book;
    } catch (error) {
      logger.error(`获取书籍详情失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 获取章节列表
   * @param {string} url 章节列表页URL
   * @param {boolean} isTest 是否为测试模式
   * @returns {Promise<Array>} 章节列表
   */
  async getChapterList(url, isTest = false) {
    try {
      // 处理相对URL
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        const baseUrl = this.bookSource.url || this.bookSource.bookSourceUrl;
        if (!baseUrl) {
          throw new Error('无法解析相对URL，书源未提供网站URL');
        }
        
        // 验证书源URL
        try {
          const parsedBaseUrl = new URL(baseUrl);
          if (parsedBaseUrl.hostname === '0.0.0.0' || parsedBaseUrl.hostname === 'localhost' || !parsedBaseUrl.hostname.includes('.')) {
            throw new Error(`书源URL包含无效主机名: ${parsedBaseUrl.hostname}`);
          }
        } catch (error) {
          throw new Error(`书源URL无效: ${error.message}`);
        }
        
        // 解析完整URL
        url = this._resolveUrl(url, baseUrl);
        if (!url) {
          throw new Error(`无法解析章节列表URL: ${url}`);
        }
        
        if (isTest) {
          logger.info(`[书源测试] ${this.bookSource.name} - 将相对章节URL转换为绝对URL: ${url}`);
        }
      } else if (url) {
        // 验证绝对URL
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.hostname === '0.0.0.0' || parsedUrl.hostname === 'localhost' || !parsedUrl.hostname.includes('.')) {
            throw new Error(`章节列表URL包含无效主机名: ${parsedUrl.hostname}`);
          }
        } catch (error) {
          throw new Error(`章节列表URL无效: ${error.message}`);
        }
      } else {
        throw new Error('未提供章节列表URL');
      }
      
      // 发送请求
      const { $, dom, url: finalUrl } = await this._request(url, { isTest });
      
      const chapters = [];
      
      if ($ && !dom) {
        // 使用Cheerio处理
        $(this.bookSource.chapterList).each((i, element) => {
          const $element = $(element);
          
          const chapter = {
            title: this._extract($element, null, this.bookSource.chapterName, finalUrl),
            url: this._extract($element, null, this.bookSource.chapterLink, finalUrl),
            index: i
          };
          
          chapters.push(chapter);
        });
      } else if (dom) {
        // 使用JSDOM处理
        const elements = dom.querySelectorAll(this.bookSource.chapterList);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          
          const chapter = {
            title: this._extractFromElement(element, this.bookSource.chapterName),
            url: this._resolveUrl(this._extractFromElement(element, this.bookSource.chapterLink), finalUrl),
            index: i
          };
          
          chapters.push(chapter);
        }
      }
      
      return chapters;
    } catch (error) {
      logger.error(`获取章节列表失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 获取章节内容
   * @param {string} url 章节内容页URL
   * @param {boolean} isTest 是否为测试模式
   * @returns {Promise<Object>} 章节内容对象
   */
  async getChapterContent(url, isTest = false) {
    try {
      // 处理相对URL
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        const baseUrl = this.bookSource.url || this.bookSource.bookSourceUrl;
        if (!baseUrl) {
          throw new Error('无法解析相对URL，书源未提供网站URL');
        }
        
        // 验证书源URL
        try {
          const parsedBaseUrl = new URL(baseUrl);
          if (parsedBaseUrl.hostname === '0.0.0.0' || parsedBaseUrl.hostname === 'localhost' || !parsedBaseUrl.hostname.includes('.')) {
            throw new Error(`书源URL包含无效主机名: ${parsedBaseUrl.hostname}`);
          }
        } catch (error) {
          throw new Error(`书源URL无效: ${error.message}`);
        }
        
        // 解析完整URL
        url = this._resolveUrl(url, baseUrl);
        if (!url) {
          throw new Error(`无法解析章节内容URL: ${url}`);
        }
        
        if (isTest) {
          logger.info(`[书源测试] ${this.bookSource.name} - 将相对内容URL转换为绝对URL: ${url}`);
        }
      } else if (url) {
        // 验证绝对URL
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.hostname === '0.0.0.0' || parsedUrl.hostname === 'localhost' || !parsedUrl.hostname.includes('.')) {
            throw new Error(`章节内容URL包含无效主机名: ${parsedUrl.hostname}`);
          }
        } catch (error) {
          throw new Error(`章节内容URL无效: ${error.message}`);
        }
      } else {
        throw new Error('未提供章节内容URL');
      }
      
      // 发送请求
      const { $, dom, url: finalUrl } = await this._request(url, { isTest });
      
      // 提取内容
      let content = this._extract($, dom, this.bookSource.contentRule, finalUrl);
      
      // 应用内容过滤规则
      if (content && this.bookSource.contentFilter && this.bookSource.contentFilter.length > 0) {
        for (const filter of this.bookSource.contentFilter) {
          if (filter.startsWith('/') && filter.endsWith('/')) {
            // 正则表达式过滤
            const regex = new RegExp(filter.slice(1, -1), 'g');
            content = content.replace(regex, '');
          } else {
            // 普通字符串过滤
            content = content.replace(new RegExp(filter, 'g'), '');
          }
        }
      }
      
      // 格式化内容
      if (content) {
        // 替换HTML标签为换行
        content = content.replace(/<br\s*\/?>/gi, '\n');
        content = content.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n\n');
        
        // 移除其他HTML标签
        content = content.replace(/<[^>]+>/g, '');
        
        // 处理空白字符
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.trim();
      }
      
      return {
        url: finalUrl,
        content: content || '内容获取失败'
      };
    } catch (error) {
      logger.error(`获取章节内容失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 将阅读3.0格式的书源映射到内部格式
   * @param {Object} source - 原始书源对象
   * @returns {Object} - 转换后的书源对象
   * @private
   */
  _mapBookSourceFields(source) {
    if (!source) return source;
    
    // 创建源对象的副本，避免修改原始对象
    const result = JSON.parse(JSON.stringify(source));
    
    // 如果不是阅读3.0格式，直接返回
    if (!result.bookSourceUrl && !result.ruleSearch && !result.ruleBookInfo && !result.ruleToc && !result.ruleContent) {
      return result;
    }
    
    // 基础信息映射
    if (result.bookSourceName) result.name = result.bookSourceName;
    if (result.bookSourceUrl) result.url = result.bookSourceUrl;
    if (result.bookSourceGroup) result.group = result.bookSourceGroup;
    if (!result.enabled && result.enable !== undefined) result.enabled = result.enable;
    
    // 创建规则对象
    if (!result.searchRule) result.searchRule = {};
    if (!result.bookInfoRule) result.bookInfoRule = {};
    if (!result.chapterListRule) result.chapterListRule = {};
    if (!result.contentRule) result.contentRule = {};
    
    // 搜索规则映射
    if (result.ruleSearch) {
      if (result.ruleSearch.searchUrl) result.searchUrl = result.ruleSearch.searchUrl;
      if (result.ruleSearch.searchList) result.searchRule.searchList = result.ruleSearch.searchList;
      if (result.ruleSearch.searchName) result.searchRule.name = result.ruleSearch.searchName;
      if (result.ruleSearch.searchAuthor) result.searchRule.author = result.ruleSearch.searchAuthor;
      if (result.ruleSearch.searchKind) result.searchRule.kind = result.ruleSearch.searchKind;
      if (result.ruleSearch.searchLastChapter) result.searchRule.lastChapter = result.ruleSearch.searchLastChapter;
      if (result.ruleSearch.searchIntroduce) result.searchRule.desc = result.ruleSearch.searchIntroduce;
      if (result.ruleSearch.searchCoverUrl) result.searchRule.cover = result.ruleSearch.searchCoverUrl;
      if (result.ruleSearch.searchNoteUrl) result.searchRule.bookUrl = result.ruleSearch.searchNoteUrl;
    }
    
    // 书籍详情规则映射
    if (result.ruleBookInfo) {
      if (result.ruleBookInfo.bookUrlPattern) result.bookInfoRule.bookUrlPattern = result.ruleBookInfo.bookUrlPattern;
      if (result.ruleBookInfo.tocUrl) result.bookInfoRule.chapterUrl = result.ruleBookInfo.tocUrl;
      if (result.ruleBookInfo.bookName) result.bookInfoRule.name = result.ruleBookInfo.bookName;
      if (result.ruleBookInfo.bookAuthor) result.bookInfoRule.author = result.ruleBookInfo.bookAuthor;
      if (result.ruleBookInfo.bookKind) result.bookInfoRule.kind = result.ruleBookInfo.bookKind;
      if (result.ruleBookInfo.bookLastChapter) result.bookInfoRule.lastChapter = result.ruleBookInfo.bookLastChapter;
      if (result.ruleBookInfo.bookIntroduce) result.bookInfoRule.desc = result.ruleBookInfo.bookIntroduce;
      if (result.ruleBookInfo.bookCoverUrl) result.bookInfoRule.cover = result.ruleBookInfo.bookCoverUrl;
    }
    
    // 章节列表规则映射
    if (result.ruleToc) {
      if (result.ruleToc.chapterList) result.chapterListRule.chapterList = result.ruleToc.chapterList;
      if (result.ruleToc.chapterName) result.chapterListRule.name = result.ruleToc.chapterName;
      if (result.ruleToc.chapterUrl || result.ruleToc.contentUrl) {
        result.chapterListRule.url = result.ruleToc.contentUrl || result.ruleToc.chapterUrl;
      }
    }
    
    // 内容规则映射
    if (result.ruleContent) {
      if (result.ruleContent.content) result.contentRule.content = result.ruleContent.content;
      if (result.ruleContent.contentRules) result.contentRule.contentRules = result.ruleContent.contentRules;
      if (result.ruleContent.contentFilters) result.contentRule.contentFilters = result.ruleContent.contentFilters;
    }
    
    // 设置标识，表示这是转换后的格式
    result.convertedFromLegacy = true;
    
    // 记录源和转换后的书源名
    const sourceName = source.bookSourceName || source.name || 'unnamed';
    const convertedName = result.name || 'unnamed';
    logger.info(`[书源转换] 从阅读3.0格式转换: ${sourceName} -> ${convertedName}`);
    
    return result;
  }
}

module.exports = BookSourceParser; 