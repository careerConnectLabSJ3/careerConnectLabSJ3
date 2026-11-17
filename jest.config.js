export default {
  testEnvironment: 'node',
  transform: {},
  restoreMocks: true,
  testMatch: [
    '<rootDir>/src/server/test/**/*.test.js',
    '<rootDir>/src/client/tests/**/*.unit.test.js'
  ]
};
