const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable CSS support for Expo Router (if needed)
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
