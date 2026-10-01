const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const root = path.join(__dirname, '..');
const assets = ['game.js', 'index.html', 'styles.css'];

test('Android build includes only current offline game assets and removes stale output', async () => {
  const dist = path.join(root, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'stale.txt'), 'Do not ship');
  await exec(process.execPath, ['build-web.js'], { cwd: root });
  assert.deepEqual(fs.readdirSync(dist).sort(), assets);
  for (const name of assets) {
    assert.equal(fs.readFileSync(path.join(dist, name), 'utf8'), fs.readFileSync(path.join(root, name), 'utf8'));
  }

  // Run the actual Capacitor sync, without an SDK or network connection.
  await exec(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'], { cwd: root });
  const nativeAssets = path.join(root, 'android/app/src/main/assets');
  for (const name of assets) {
    assert.equal(fs.readFileSync(path.join(nativeAssets, 'public', name), 'utf8'), fs.readFileSync(path.join(root, name), 'utf8'));
  }
  const config = JSON.parse(fs.readFileSync(path.join(nativeAssets, 'capacitor.config.json'), 'utf8'));
  assert.equal(config.webDir, 'dist');
  assert.ok(!config.server?.url, 'The app must load bundled assets, not a development server');
  const html = fs.readFileSync(path.join(nativeAssets, 'public/index.html'), 'utf8');
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//, 'Offline game must not request remote assets');
  const plugins = JSON.parse(fs.readFileSync(path.join(nativeAssets, 'capacitor.plugins.json'), 'utf8'));
  assert.ok(plugins.some(plugin => plugin.classpath === 'com.capacitorjs.plugins.haptics.HapticsPlugin'), 'Native haptics must be registered in the Android bundle');
});
