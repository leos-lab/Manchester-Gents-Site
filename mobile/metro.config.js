// Metro config: Expo's defaults, plus ignore macOS "._" files. On the exFAT
// SSD every edited file gets one, and expo-router would load it as a screen.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const appleDouble = /(^|[\\/])\._[^\\/]*$/;
const existing = config.resolver.blockList;
config.resolver.blockList = existing ? [].concat(existing, appleDouble) : appleDouble;

module.exports = config;
