export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/tests/**/*.test.mjs',
    '**/__tests__/**/*.test.mjs',
  ],
  collectCoverageFrom: [
    'pricing-engine.mjs',
    'validation.mjs',
    '!**/node_modules/**',
    '!**/tests/**',
    '!jest.config.mjs',
    '!index.mjs', // Lambda handler requires integration tests (future work)
  ],
  coverageThreshold: {
    'pricing-engine.mjs': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
