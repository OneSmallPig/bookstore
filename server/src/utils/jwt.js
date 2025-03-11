const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成JWT令牌
 * @param {Object} payload - 要编码到令牌中的数据
 * @returns {string} JWT令牌
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * 验证JWT令牌
 * @param {string} token - 要验证的JWT令牌
 * @returns {Object|null} 解码后的数据或null（如果无效）
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
}; 