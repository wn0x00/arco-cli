import { execFileSync } from 'child_process';
import path from 'path';
import { patchChildProcessForWindows } from './patchChildProcess';

const itOnWindows = process.platform === 'win32' ? it : it.skip;

describe('patchChildProcessForWindows', () => {
  it('is callable and idempotent on any platform', () => {
    expect(() => {
      patchChildProcessForWindows();
      patchChildProcessForWindows();
    }).not.toThrow();
  });

  /**
   * Jest's module loader bypasses Module.prototype.require, so we verify the
   * actual runtime behavior in a fresh child process where our hook applies.
   */
  itOnWindows('lets a child process spawn npm.cmd via the patched module', () => {
    const patchModule = path.resolve(__dirname, '../lib/patchChildProcess').replace(/\\/g, '/');
    const script = [
      `require('${patchModule}').patchChildProcessForWindows();`,
      `const cp = require('child_process');`,
      `const r = cp.spawnSync('npm.cmd', ['-v'], { encoding: 'utf8' });`,
      `if (r.error) { console.error('FAIL', r.error.message); process.exit(1); }`,
      `process.stdout.write(r.stdout.trim());`,
    ].join(' ');

    const stdout = execFileSync('node', ['-e', script], { encoding: 'utf8' });
    expect(stdout).toMatch(/^\d+\.\d+\.\d+/);
  });
});
