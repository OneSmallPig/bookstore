const fs = require('fs');
const path = require('path');
const config = require('../../config/config');
const logger = require('../../utils/logger');
const coverValidationService = require('./CoverValidationService');

class CoverStorageService {
  constructor() {
    this.cacheRoot = path.join(__dirname, '../../public/covers/cache');
    fs.mkdirSync(this.cacheRoot, { recursive: true });
  }

  getCachedRecord(cacheKey) {
    const metaPath = path.join(this.cacheRoot, `${cacheKey}.json`);
    if (!fs.existsSync(metaPath)) {
      return null;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const filePath = path.join(this.cacheRoot, metadata.fileName);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      return {
        ...metadata,
        localPath: filePath,
        publicUrl: `${config.covers.publicBasePath}/${metadata.fileName}`
      };
    } catch (error) {
      logger.warn('读取封面缓存元数据失败', error);
      return null;
    }
  }

  saveCachedCover(cacheKey, payload) {
    const { buffer, contentType, source, originalUrl, confidence = 0 } = payload;
    const validation = coverValidationService.validateImageBuffer(buffer, contentType);

    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const ext = coverValidationService.normalizeContentType(contentType);
    const fileName = `${cacheKey}.${ext}`;
    const filePath = path.join(this.cacheRoot, fileName);
    const metaPath = path.join(this.cacheRoot, `${cacheKey}.json`);

    fs.writeFileSync(filePath, buffer);

    const metadata = {
      fileName,
      source,
      originalUrl,
      confidence,
      contentType,
      hash: validation.hash,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    return {
      ...metadata,
      localPath: filePath,
      publicUrl: `${config.covers.publicBasePath}/${fileName}`
    };
  }

  saveGeneratedSvg(cacheKey, svgContent, payload = {}) {
    const fileName = `${cacheKey}.svg`;
    const filePath = path.join(this.cacheRoot, fileName);
    const metaPath = path.join(this.cacheRoot, `${cacheKey}.json`);

    fs.writeFileSync(filePath, svgContent, 'utf8');

    const metadata = {
      fileName,
      source: payload.source || 'generated',
      originalUrl: payload.originalUrl || '',
      confidence: payload.confidence || 0.3,
      contentType: 'image/svg+xml',
      hash: payload.hash || '',
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    return {
      ...metadata,
      localPath: filePath,
      publicUrl: `${config.covers.publicBasePath}/${fileName}`
    };
  }
}

module.exports = new CoverStorageService();
