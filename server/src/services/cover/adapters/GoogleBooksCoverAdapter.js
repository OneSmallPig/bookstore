const axios = require('axios');
const config = require('../../../config/config');
const logger = require('../../../utils/logger');

class GoogleBooksCoverAdapter {
  constructor() {
    this.timeout = config.covers.requestTimeout;
    this.proxy = config.covers.disableProxy ? false : undefined;
  }

  async resolve(metadata) {
    const queries = this._buildQueries(metadata);

    for (const query of queries) {
      try {
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
          params: {
            q: query,
            maxResults: 5,
            printType: 'books'
          },
          timeout: this.timeout,
          proxy: this.proxy
        });

        const items = Array.isArray(response.data?.items) ? response.data.items : [];
        const bestMatch = items.find((item) => this._extractImageUrl(item));

        if (bestMatch) {
          return {
            found: true,
            source: 'googlebooks',
            originalUrl: this._extractImageUrl(bestMatch),
            confidence: this._computeConfidence(metadata, bestMatch)
          };
        }
      } catch (error) {
        logger.warn('Google Books 封面检索失败', error);
      }
    }

    return { found: false };
  }

  _buildQueries(metadata) {
    const queries = [];

    if (metadata.isbn13) {
      queries.push(`isbn:${metadata.isbn13}`);
    }

    if (metadata.isbn10) {
      queries.push(`isbn:${metadata.isbn10}`);
    }

    if (metadata.title && metadata.author) {
      queries.push(`intitle:${metadata.title} inauthor:${metadata.author}`);
    }

    if (metadata.title) {
      queries.push(`intitle:${metadata.title}`);
    }

    return [...new Set(queries)];
  }

  _extractImageUrl(item) {
    const imageLinks = item?.volumeInfo?.imageLinks || {};
    const candidate = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;

    if (!candidate) {
      return '';
    }

    return String(candidate).replace(/^http:\/\//i, 'https://');
  }

  _computeConfidence(metadata, item) {
    const normalizedTitle = String(metadata.title || '').trim().toLowerCase();
    const volumeInfo = item?.volumeInfo || {};
    const targetTitle = String(volumeInfo.title || '').trim().toLowerCase();
    const author = Array.isArray(volumeInfo.authors) ? String(volumeInfo.authors[0] || '').trim().toLowerCase() : '';
    const normalizedAuthor = String(metadata.author || '').trim().toLowerCase();

    if (normalizedTitle && normalizedAuthor && normalizedTitle === targetTitle && normalizedAuthor === author) {
      return 0.92;
    }

    if (normalizedTitle && normalizedTitle === targetTitle) {
      return 0.84;
    }

    return 0.72;
  }
}

module.exports = GoogleBooksCoverAdapter;
