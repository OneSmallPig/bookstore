const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * 生成JWT令牌
 * @param {Object} payload - 要编码到令牌中的数据
 * @param {string} expiresIn - 令牌过期时间，默认为环境变量中的设置或7天
 * @returns {string} JWT令牌
 */
const generateToken = (payload, expiresIn = config.jwt.expiresIn) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
};

/**
 * 验证JWT令牌
 * @param {string} token - 要验证的JWT令牌
 * @returns {Object|null} 解码后的数据或null（如果无效）
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
}; 
