// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // ← Put ALL other Babel plugins HERE (before worklets)

    // Examples of common plugins you might have:
    // 'module-resolver',
    // ['nativewind/babel'],
    // 'react-native-reanimated/plugin',   ← DO NOT put here if using Reanimated v3 worklets

    // These MUST be the LAST two plugins — in THIS exact order
    'react-native-worklets/plugin',          // Reanimated worklets (if using Reanimated 3+)
    'module:react-native-dotenv',

  ],
};