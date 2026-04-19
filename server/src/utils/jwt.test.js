describe('JWT utils', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('generateToken and verifyToken should round-trip payload', () => {
    process.env.JWT_SECRET = 'unit-test-secret';

    jest.isolateModules(() => {
      const { generateToken, verifyToken } = require('./jwt');
      const payload = { id: 42, role: 'admin' };

      const token = generateToken(payload, '1h');
      const decoded = verifyToken(token);

      expect(decoded).toEqual(
        expect.objectContaining({
          id: 42,
          role: 'admin'
        })
      );
    });
  });

  test('verifyToken should return null for invalid token', () => {
    process.env.JWT_SECRET = 'unit-test-secret';

    jest.isolateModules(() => {
      const { verifyToken } = require('./jwt');
      expect(verifyToken('invalid-token')).toBeNull();
    });
  });
});
