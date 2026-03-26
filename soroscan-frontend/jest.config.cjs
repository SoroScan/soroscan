/**
 * Lightweight Jest config using ts-jest to avoid depending on Next's
 * internal jest transformer which may not be present in some environments.
 */
module.exports = {
  testEnvironment: 'jsdom',
  coverageProvider: 'v8',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': require.resolve('babel-jest'),
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}
