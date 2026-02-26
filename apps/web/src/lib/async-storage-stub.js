/**
 * Browser stub for @react-native-async-storage/async-storage.
 * MetaMask SDK optionally requires it; we don't use it in the web app.
 */
const noop = () => Promise.resolve();
const stub = {
  getItem: noop,
  setItem: noop,
  removeItem: noop,
  getAllKeys: () => Promise.resolve([]),
  clear: noop,
  multiGet: () => Promise.resolve([]),
  multiSet: noop,
  multiRemove: noop,
};
module.exports = stub;
