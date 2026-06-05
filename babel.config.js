module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-class-static-block', // <-- Add this line
    'react-native-reanimated/plugin',             // <-- Keep this at the very bottom
  ],
};