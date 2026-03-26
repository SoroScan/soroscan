// CommonJS setup for Jest: require jest-dom matchers
try {
  // prefer the modern package entry
  require('@testing-library/jest-dom');
} catch (e) {
  // fallback to older path if necessary
  require('@testing-library/jest-dom/extend-expect');
}
