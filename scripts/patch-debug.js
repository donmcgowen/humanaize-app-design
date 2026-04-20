/**
 * patch-debug.js — postinstall script
 *
 * Fixes: "Cannot find module .../debug/src/index.js"
 *
 * Root cause: @react-native/dev-middleware depends on debug@2.6.9 which has
 * `"main": "./src/index.js"` but the package ships WITHOUT a src/ directory.
 * Node 24 (and sometimes Node 22) strict module resolution fails on this.
 *
 * Fix: Rewrite the nested debug package.json to point main at ./node.js
 * which DOES exist in the package root.
 */

const fs = require('fs');
const path = require('path');

const debugPkgPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'dev-middleware',
  'node_modules',
  'debug',
  'package.json'
);

if (!fs.existsSync(debugPkgPath)) {
  console.log('[patch-debug] No nested debug package found — nothing to patch.');
  process.exit(0);
}

try {
  const pkg = JSON.parse(fs.readFileSync(debugPkgPath, 'utf8'));
  const version = pkg.version || 'unknown';

  if (pkg.main === './src/index.js') {
    // Check if src/index.js actually exists
    const srcIndex = path.join(path.dirname(debugPkgPath), 'src', 'index.js');
    if (!fs.existsSync(srcIndex)) {
      // Point to node.js which exists at the package root
      pkg.main = './node.js';
      fs.writeFileSync(debugPkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`[patch-debug] Patched debug@${version}: main changed from ./src/index.js to ./node.js`);
    } else {
      console.log(`[patch-debug] debug@${version} src/index.js exists — no patch needed.`);
    }
  } else {
    console.log(`[patch-debug] debug@${version} main is "${pkg.main}" — no patch needed.`);
  }
} catch (err) {
  console.warn('[patch-debug] Could not patch debug package:', err.message);
  // Non-fatal — don't block install
}
