/* eslint-disable @typescript-eslint/no-require-imports */
// CommonJS setup for Jest: require jest-dom matchers
try {
  // prefer the modern package entry
  require('@testing-library/jest-dom');
} catch {
  // fallback to older path if necessary
  require('@testing-library/jest-dom/extend-expect');
}
