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
    this.bookSource = bookSource;
    this.axios = axios.create({
      timeout: bookSource.timeout || 10000,
      headers: this._getHeaders(),
      responseType: 'arraybuffer' // 使用arraybuffer以支持不同编码
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

    while (retries >= 0) {
      try {
        const response = await this.axios.get(url, options);
        
        // 处理编码
        const charset = this._detectCharset(response) || this.bookSource.charset || 'utf-8';
        const html = iconv.decode(response.data, charset);
        
        // 根据需要决定是否使用JSDOM或cheerio
        let $ = null;
        let dom = null;
        
        if (this.bookSource.enableJs) {
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
        } else {
          // 使用cheerio进行快速解析（不执行JavaScript）
          $ = cheerio.load(html);
        }
        
        return { 
          response, 
          html, 
          $, 
          dom,
          url: response.request.res.responseUrl || url // 获取最终URL（处理重定向）
        };
      } catch (err) {
        error = err;
        logger.error(`请求失败: ${url}, 重试剩余: ${retries}`, err);
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

      // 处理级联选择器（用@分隔的多级选择器）
      if (selector.includes('@')) {
        const parts = selector.split('@');
        let currentSelection = $('body');  // 从body开始，确保是Cheerio对象
        let result = null;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          
          // 处理第一个部分（根选择器）
          if (i === 0) {
            // 如果是class.xxx形式
            if (part.startsWith('class.')) {
              const classNameRaw = part.substring(6);
              
              // 处理带空格的类名
              if (classNameRaw.includes(' ')) {
                const classNames = classNameRaw.split(' ').filter(Boolean);
                const cssSelector = classNames.map(name => `.${name}`).join('');
                currentSelection = $(cssSelector);
              } else {
                currentSelection = $(`.${classNameRaw}`);
              }
            }
            // 如果是tag.xxx形式
            else if (part.startsWith('tag.')) {
              const tagName = part.substring(4);
              currentSelection = $(tagName);
            }
            // 如果是id.xxx形式
            else if (part.startsWith('id.')) {
              const idName = part.substring(3);
              currentSelection = $(`#${idName}`);
            }
            // 如果是普通CSS选择器
            else {
              currentSelection = $(part);
            }
            
            // 如果只有一个部分，返回结果
            if (parts.length === 1) {
              if (currentSelection.length === 0) return null;
              return currentSelection.text().trim();
            }
            
            // 如果没有找到元素，返回null
            if (currentSelection.length === 0) return null;
            continue;
          }
          
          // 处理后续部分
          
          // 检查是否是属性选择器
          if (part === 'text') {
            result = currentSelection.text().trim();
            break;
          } else if (part === 'html') {
            result = currentSelection.html();
            break;
          } else if (part === 'href' || part === 'src') {
            const attrVal = currentSelection.attr(part);
            result = attrVal ? this._resolveUrl(attrVal, baseUrl) : null;
            break;
          } else if (part.startsWith('attr.')) {
            const attrName = part.substring(5);
            result = currentSelection.attr(attrName);
            break;
          }
          
          // 处理 tag.xxx 形式
          if (part.startsWith('tag.')) {
            const tagName = part.substring(4);
            currentSelection = currentSelection.find(tagName);
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
            } else {
              currentSelection = currentSelection.find(`.${classNameRaw}`);
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
        return this._processComplexSelector($, selector, baseUrl);
      }
      
      // 以下处理简单选择器
      
      // 如果使用JSDOM
      if (dom) {
        // 处理XPath选择器
        if (selector.startsWith('//')) {
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
          
          return result.length === 1 ? result[0] : result;
        }
        
        // 处理普通CSS选择器
        try {
          const elements = dom.querySelectorAll(selector);
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
      if (elements.length === 0) return null;
      
      // 处理特殊属性选择
      if (selector.includes('[@')) {
        const parts = selector.split('[@');
        const attrPart = parts[1].replace(']', '');
        const [attrName, attrValue] = attrPart.split('=');
        
        const filteredElements = elements.filter(function() {
          return $(this).attr(attrName) === attrValue.replace(/['"]/g, '');
        });
        
        if (filteredElements.length === 0) return null;
        if (filteredElements.length === 1) return filteredElements.text().trim();
        return filteredElements.map((i, el) => $(el).text().trim()).get();
      }
      
      if (elements.length === 1) return elements.text().trim();
      
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
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    try {
      return new URL(url, baseUrl).href;
    } catch (error) {
      logger.error(`URL解析失败: ${url}, ${baseUrl}`, error);
      return url;
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
      const searchUrl = this.bookSource.searchUrl.replace(/\{keyword\}/g, encodeURIComponent(keyword));
      
      // 发送请求，在测试模式下禁用重试
      const { $, dom, url } = await this._request(searchUrl, { isTest });
      
      // 提取搜索结果列表
      const resultList = this._extract($, dom, this.bookSource.searchList, url);
      if (!resultList || (Array.isArray(resultList) && resultList.length === 0)) {
        return [];
      }
      
      // 处理搜索结果
      const results = [];
      
      if ($ && !dom) {
        // 使用Cheerio处理
        $(this.bookSource.searchList).each((i, element) => {
          const $element = $(element);
          
          const book = {
            name: this._extract($element, null, this.bookSource.searchName, url),
            author: this.bookSource.searchAuthor ? this._extract($element, null, this.bookSource.searchAuthor, url) : null,
            cover: this.bookSource.searchCover ? this._extract($element, null, this.bookSource.searchCover, url) : null,
            detail: this._extract($element, null, this.bookSource.searchDetail, url),
            intro: this.bookSource.searchIntro ? this._extract($element, null, this.bookSource.searchIntro, url) : null,
            source: this.bookSource.name,
            sourceUrl: this.bookSource.url
          };
          
          results.push(book);
        });
      } else if (dom) {
        // 使用JSDOM处理
        const elements = dom.querySelectorAll(this.bookSource.searchList);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          
          const book = {
            name: this._extractFromElement(element, this.bookSource.searchName),
            author: this.bookSource.searchAuthor ? this._extractFromElement(element, this.bookSource.searchAuthor) : null,
            cover: this.bookSource.searchCover ? this._extractFromElement(element, this.bookSource.searchCover) : null,
            detail: this._resolveUrl(this._extractFromElement(element, this.bookSource.searchDetail), url),
            intro: this.bookSource.searchIntro ? this._extractFromElement(element, this.bookSource.searchIntro) : null,
            source: this.bookSource.name,
            sourceUrl: this.bookSource.url
          };
          
          results.push(book);
        }
      }
      
      return results;
    } catch (error) {
      logger.error(`搜索失败: ${keyword}`, error);
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
}

module.exports = BookSourceParser; 