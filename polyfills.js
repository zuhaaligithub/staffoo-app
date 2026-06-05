// polyfills.js
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Buffer polyfill for React Native
global.Buffer = global.Buffer || require('buffer').Buffer;

// Process polyfill
if (typeof global.process === 'undefined') {
  global.process = require('process');
} else if (!global.process.version) {
  global.process.version = 'v16.0.0'; // Fake version for compatibility
}

// Crypto polyfill if needed
if (!global.crypto) {
  const crypto = require('react-native-crypto');
  global.crypto = crypto;
}