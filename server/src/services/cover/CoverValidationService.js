const crypto = require('crypto');

class CoverValidationService {
  validateImageBuffer(buffer, contentType = '') {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 1024) {
      return { valid: false, reason: '图片内容为空或过小' };
    }

    if (!String(contentType).startsWith('image/')) {
      return { valid: false, reason: '响应内容不是图片' };
    }

    return {
      valid: true,
      hash: crypto.createHash('sha1').update(buffer).digest('hex')
    };
  }

  normalizeContentType(contentType = '') {
    const lower = String(contentType).toLowerCase();

    if (lower.includes('png')) return 'png';
    if (lower.includes('webp')) return 'webp';
    if (lower.includes('gif')) return 'gif';

    return 'jpg';
  }
}

module.exports = new CoverValidationService();
