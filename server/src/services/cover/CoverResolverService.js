const crypto = require('crypto');
const axios = require('axios');
const config = require('../../config/config');
const logger = require('../../utils/logger');
const coverStorageService = require('./CoverStorageService');
const OpenLibraryCoverAdapter = require('./adapters/OpenLibraryCoverAdapter');
const GoogleBooksCoverAdapter = require('./adapters/GoogleBooksCoverAdapter');

class CoverResolverService {
  constructor() {
    this.timeout = config.covers.requestTimeout;
    this.proxy = config.covers.disableProxy ? false : undefined;
    this.adapters = [
      new OpenLibraryCoverAdapter(),
      new GoogleBooksCoverAdapter()
    ];
  }

  async ensureBookCover(book, options = {}) {
    if (!book) {
      return book;
    }

    const metadata = this._normalizeMetadata(book);
    const resolved = await this.resolveCover(metadata, options);

    if (!resolved) {
      if (book.coverStatus === undefined) {
        book.coverStatus = 'failed';
      }
      return book;
    }

    this._applyResolvedCover(book, resolved);

    if (options.persist !== false && typeof book.update === 'function') {
      await book.update({
        coverImage: book.coverImage,
        coverSource: book.coverSource,
        coverOriginalUrl: book.coverOriginalUrl,
        coverStorageKey: book.coverStorageKey,
        coverStatus: book.coverStatus,
        coverLastVerifiedAt: book.coverLastVerifiedAt,
        coverHash: book.coverHash,
        coverConfidence: book.coverConfidence
      });
    }

    return book;
  }

  async ensureBooksHaveCovers(books, options = {}) {
    if (!Array.isArray(books) || books.length === 0) {
      return books || [];
    }

    return Promise.all(books.map((book) => this.ensureBookCover(book, options)));
  }

  async resolveCover(rawMetadata, options = {}) {
    const metadata = this._normalizeMetadata(rawMetadata);

    if (!metadata.title && !metadata.isbn13 && !metadata.isbn10 && !metadata.isbn) {
      return null;
    }

    if (this._isStableInternalCover(metadata.coverImage)) {
      return {
        publicUrl: metadata.coverImage,
        source: metadata.coverSource || 'local',
        originalUrl: metadata.coverOriginalUrl || metadata.coverImage,
        storageKey: metadata.coverStorageKey || this._extractStorageKey(metadata.coverImage),
        confidence: metadata.coverConfidence || 1,
        hash: metadata.coverHash || null,
        cached: true
      };
    }

    const cacheKey = this._buildCacheKey(metadata);
    const cached = coverStorageService.getCachedRecord(cacheKey);
    if (cached && !options.forceRefresh) {
      return {
        publicUrl: cached.publicUrl,
        source: cached.source,
        originalUrl: cached.originalUrl,
        storageKey: cached.fileName,
        confidence: cached.confidence,
        hash: cached.hash,
        cached: true
      };
    }

    if (options.skipExternalLookup) {
      return this._buildGeneratedCover(cacheKey, metadata);
    }

    const candidates = [];

    if (metadata.coverImage && this._isExternalUrl(metadata.coverImage)) {
      candidates.push({
        found: true,
        source: 'legacy',
        originalUrl: metadata.coverImage,
        confidence: metadata.coverConfidence || 0.6
      });
    }

    for (const adapter of this.adapters) {
      const result = await adapter.resolve(metadata);
      if (result?.found && result.originalUrl) {
        candidates.push(result);
      }
    }

    for (const candidate of candidates) {
      try {
        const download = await this._downloadImage(candidate.originalUrl);
        const stored = coverStorageService.saveCachedCover(cacheKey, {
          ...candidate,
          buffer: download.buffer,
          contentType: download.contentType
        });

        return {
          publicUrl: stored.publicUrl,
          source: candidate.source,
          originalUrl: candidate.originalUrl,
          storageKey: stored.fileName,
          confidence: candidate.confidence || 0.7,
          hash: stored.hash,
          cached: false
        };
      } catch (error) {
        logger.warn(`封面下载失败，继续尝试下一个来源 [${candidate.source}]`, error);
      }
    }

    return this._buildGeneratedCover(cacheKey, metadata);
  }

  _normalizeMetadata(rawMetadata) {
    return {
      title: String(rawMetadata?.title || '').trim(),
      author: String(rawMetadata?.author || '').trim(),
      category: String(rawMetadata?.category || rawMetadata?.categories?.[0] || '').trim(),
      publisher: String(rawMetadata?.publisher || '').trim(),
      isbn: String(rawMetadata?.isbn || '').trim(),
      isbn10: String(rawMetadata?.isbn10 || '').trim(),
      isbn13: String(rawMetadata?.isbn13 || '').trim(),
      coverImage: String(rawMetadata?.coverImage || rawMetadata?.coverUrl || '').trim(),
      coverSource: rawMetadata?.coverSource || '',
      coverOriginalUrl: rawMetadata?.coverOriginalUrl || '',
      coverStorageKey: rawMetadata?.coverStorageKey || '',
      coverConfidence: Number(rawMetadata?.coverConfidence || 0),
      coverHash: rawMetadata?.coverHash || ''
    };
  }

  _applyResolvedCover(book, resolved) {
    book.coverImage = resolved.publicUrl;
    book.coverUrl = resolved.publicUrl;
    book.coverSource = resolved.source;
    book.coverOriginalUrl = resolved.originalUrl;
    book.coverStorageKey = resolved.storageKey;
    book.coverStatus = 'resolved';
    book.coverLastVerifiedAt = new Date();
    book.coverHash = resolved.hash;
    book.coverConfidence = resolved.confidence;
  }

  _buildCacheKey(metadata) {
    const seed = [
      metadata.isbn13 || metadata.isbn10 || metadata.isbn,
      metadata.title,
      metadata.author
    ].filter(Boolean).join('|').toLowerCase();

    return crypto.createHash('sha1').update(seed).digest('hex');
  }

  _extractStorageKey(publicUrl = '') {
    return publicUrl.split('/').pop() || '';
  }

  _isStableInternalCover(url = '') {
    return url.startsWith('/covers/');
  }

  _isExternalUrl(url = '') {
    return /^https?:\/\//i.test(url);
  }

  async _downloadImage(url) {
    const response = await axios.get(url, {
      timeout: this.timeout,
      proxy: this.proxy,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: (status) => status === 200
    });

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || ''
    };
  }

  _buildGeneratedCover(cacheKey, metadata) {
    const generated = coverStorageService.saveGeneratedSvg(
      cacheKey,
      this._buildFallbackSvg(metadata),
      {
        source: 'generated',
        confidence: 0.3,
        hash: crypto.createHash('sha1').update(`${metadata.title}|${metadata.author}|generated`).digest('hex')
      }
    );

    return {
      publicUrl: generated.publicUrl,
      source: 'generated',
      originalUrl: '',
      storageKey: generated.fileName,
      confidence: 0.3,
      hash: generated.hash,
      cached: false
    };
  }

  _buildFallbackSvg(metadata) {
    const title = this._escapeSvg(metadata.title || '未知书名');
    const author = this._escapeSvg(metadata.author || '未知作者');
    const category = this._escapeSvg(metadata.category || '图书');
    const seed = crypto.createHash('md5').update(`${title}|${author}|${category}`).digest('hex');
    const background = `#${seed.slice(0, 6)}`;
    const accent = `#${seed.slice(6, 12)}`;
    const shortTitle = this._escapeSvg((metadata.title || '图书').slice(0, 6));

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="coverGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${background}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#coverGradient)"/>
  <rect x="28" y="28" width="344" height="544" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)"/>
  <text x="40" y="110" font-size="22" fill="#ffffff" opacity="0.85" font-family="Arial, sans-serif">${category}</text>
  <text x="40" y="220" font-size="42" font-weight="700" fill="#ffffff" font-family="Arial, sans-serif">${shortTitle}</text>
  <foreignObject x="40" y="250" width="320" height="180">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:28px;line-height:1.35;color:#ffffff;font-family:Arial,sans-serif;font-weight:700;">
      ${title}
    </div>
  </foreignObject>
  <foreignObject x="40" y="460" width="320" height="80">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:24px;line-height:1.4;color:rgba(255,255,255,0.92);font-family:Arial,sans-serif;">
      ${author}
    </div>
  </foreignObject>
</svg>`;
  }

  _escapeSvg(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = new CoverResolverService();
