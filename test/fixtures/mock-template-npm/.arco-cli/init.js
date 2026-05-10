// Mirrors arco-design-pro's init.js shape: spawnSync to npm/npm.cmd with
// no cwd option. The CLI must (a) chdir into the template root so npm
// can locate this package's package.json, and (b) on Windows, transparently
// add `shell: true` so npm.cmd can be invoked at all (CVE-2024-27980 fix
// in modern Node otherwise rejects .cmd targets).
const { spawnSync } = require('child_process');

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npm.cmd' : 'npm';

module.exports = function ({ markerPath }) {
  const result = spawnSync(cmd, ['run', '-s', 'write-marker'], {
    env: { ...process.env, MARKER_PATH: markerPath },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm exited ${result.status}: ${result.stderr}`);
  }
};
