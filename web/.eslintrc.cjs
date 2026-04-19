module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'warn',
  },
  overrides: [
    {
      files: [
        'src/js/api.js',
        'src/js/auth.js',
        'src/js/common.js',
        'src/js/imageProxy.js',
        'src/js/profile-button.js',
        'src/js/profile.js',
        'src/js/booksource/import.js',
        'src/js/components/BookCard.js',
      ],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: [
        'src/js/main.js',
        'src/js/homepage.js',
        'src/js/bookshelf.js',
      ],
      rules: {
        'no-console': 'off',
        'no-unused-vars': 'off',
      },
    },
  ],
};
