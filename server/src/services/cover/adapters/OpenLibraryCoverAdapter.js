const axios = require('axios');
const config = require('../../../config/config');
const logger = require('../../../utils/logger');

class OpenLibraryCoverAdapter {
  constructor() {
    this.timeout = config.covers.requestTimeout;
    this.proxy = config.covers.disableProxy ? false : undefined;
  }

  async resolve(metadata) {
    const isbnCandidates = [metadata.isbn13, metadata.isbn10, metadata.isbn]
      .filter(Boolean)
      .map((item) => String(item).trim());

    for (const isbn of isbnCandidates) {
      const directUrl = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`;
      const available = await this._probeImage(directUrl);
      if (available) {
        return {
          found: true,
          source: 'openlibrary',
          originalUrl: directUrl,
          confidence: 1
        };
      }
    }

    if (!metadata.title) {
      return { found: false };
    }

    try {
      const params = {
        title: metadata.title,
        author: metadata.author || '',
        limit: 5
      };

      const response = await axios.get('https://openlibrary.org/search.json', {
        params,
        timeout: this.timeout,
        proxy: this.proxy
      });

      const docs = Array.isArray(response.data?.docs) ? response.data.docs : [];

      for (const doc of docs) {
        if (doc.cover_i) {
          return {
            found: true,
            source: 'openlibrary',
            originalUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
            confidence: this._computeConfidence(metadata, doc)
          };
        }
      }
    } catch (error) {
      logger.warn('OpenLibrary 封面检索失败', error);
    }

    return { found: false };
  }

  async _probeImage(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        proxy: this.proxy,
        responseType: 'arraybuffer',
        maxRedirects: 3,
        validateStatus: (status) => status === 200
      });

      return String(response.headers['content-type'] || '').startsWith('image/');
    } catch (error) {
      return false;
    }
  }

  _computeConfidence(metadata, doc) {
    const normalizedTitle = String(metadata.title || '').trim().toLowerCase();
    const docTitle = String(doc.title || '').trim().toLowerCase();
    const normalizedAuthor = String(metadata.author || '').trim().toLowerCase();
    const docAuthor = Array.isArray(doc.author_name) ? String(doc.author_name[0] || '').trim().toLowerCase() : '';

    if (normalizedTitle && normalizedAuthor && normalizedTitle === docTitle && normalizedAuthor === docAuthor) {
      return 0.95;
    }

    if (normalizedTitle && normalizedTitle === docTitle) {
      return 0.88;
    }

    return 0.75;
  }
}

module.exports = OpenLibraryCoverAdapter;
