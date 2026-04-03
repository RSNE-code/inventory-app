const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Ensure Metro only resolves from the mobile directory,
// not the parent inventory-app directory
config.watchFolders = [__dirname];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
];

module.exports = config;
