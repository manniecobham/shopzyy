const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

if (process.env.APP_ENV === 'production') {
  const original = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (/(^|\/)seed$/.test(moduleName) && context.originModulePath.includes(`${path.sep}src${path.sep}demo${path.sep}`)) {
      return { type: 'sourceFile', filePath: path.join(__dirname, 'src', 'demo', 'seed.stub.ts') };
    }
    return (original ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
