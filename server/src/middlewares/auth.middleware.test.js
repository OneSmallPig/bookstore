jest.mock('../models/user.model', () => ({
  findByPk: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

describe('auth.middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  function createRes() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  }

  test('authenticate should inject dev user when SKIP_AUTH is enabled', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SKIP_AUTH = 'true';

    await jest.isolateModulesAsync(async () => {
      const { authenticate } = require('./auth.middleware');
      const req = { headers: {} };
      const res = createRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual(
        expect.objectContaining({
          id: 1,
          role: 'admin',
        })
      );
    });
  });

  test('optionalAuthenticate should attach user when token is valid', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'unit-test-secret';

    await jest.isolateModulesAsync(async () => {
      const User = require('../models/user.model');
      const { generateToken } = require('../utils/jwt');
      const { optionalAuthenticate } = require('./auth.middleware');

      const token = generateToken({ id: 7 }, '1h');
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = createRes();
      const next = jest.fn();

      User.findByPk.mockResolvedValue({
        id: 7,
        username: 'reader',
        role: 'user',
        isActive: true,
      });

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual(
        expect.objectContaining({
          id: 7,
          username: 'reader',
        })
      );
    });
  });
});
