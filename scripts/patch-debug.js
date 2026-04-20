/**
 * patch-debug.js — postinstall script
 *
 * Fixes: "Cannot find module .../debug/src/index.js"
 *
 * Root cause: @react-native/dev-middleware@0.79.6 has "debug": "^2.2.0" in its
 * own dependencies. On some npm versions, this causes debug@2.6.9 to be installed
 * as a nested package. debug@2.6.9 has main: "./src/index.js" but ships without
 * a src/ directory, causing Node 24 to fail.
 *
 * Fix: Patch @react-native/dev-middleware/package.json to require debug@^4.3.4
 * so npm never installs the broken version.
 */

const fs = require('fs');
const path = require('path');

// Fix 1: Patch @react-native/dev-middleware to require debug ^4
const devMiddlewarePkgPath = path.join(
  __dirname, '..', 'node_modules', '@react-native', 'dev-middleware', 'package.json'
);

if (fs.existsSync(devMiddlewarePkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(devMiddlewarePkgPath, 'utf8'));
    if (pkg.dependencies && pkg.dependencies.debug && pkg.dependencies.debug.startsWith('^2')) {
      pkg.dependencies.debug = '^4.3.4';
      fs.writeFileSync(devMiddlewarePkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('[patch-debug] Patched @react-native/dev-middleware: debug ^2.x -> ^4.3.4');
    }
  } catch (err) {
    console.warn('[patch-debug] Could not patch dev-middleware:', err.message);
  }
}

// Fix 2: If nested debug@2.x is already installed, patch its package.json main field
const debugPkgPath = path.join(
  __dirname, '..', 'node_modules', '@react-native', 'dev-middleware',
  'node_modules', 'debug', 'package.json'
);

if (fs.existsSync(debugPkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(debugPkgPath, 'utf8'));
    if (pkg.main === './src/index.js') {
      const srcIndex = path.join(path.dirname(debugPkgPath), 'src', 'index.js');
      if (!fs.existsSync(srcIndex)) {
        pkg.main = './node.js';
        fs.writeFileSync(debugPkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log('[patch-debug] Patched nested debug@' + pkg.version + ': main -> ./node.js');
      }
    }
  } catch (err) {
    console.warn('[patch-debug] Could not patch nested debug:', err.message);
  }
} else {
  console.log('[patch-debug] No nested debug package — all good.');
}
