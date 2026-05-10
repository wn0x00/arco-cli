import { describe, it } from 'node:test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { patchChildProcessForWindows } from './patchChildProcess';

describe('patchChildProcessForWindows', () => {
  it('is callable and idempotent on any platform', () => {
    assert.doesNotThrow(() => {
      patchChildProcessForWindows();
      patchChildProcessForWindows();
    });
  });

  /**
   * Node's test runner shares module state, so the runtime behavior is
   * verified in a fresh child process where the hook on
   * Module.prototype.require can take effect cleanly.
   */
  it(
    'lets a child process spawn npm.cmd via the patched module',
    { skip: process.platform !== 'win32' },
    () => {
      const patchModule = path.resolve(__dirname, './patchChildProcess.ts').replace(/\\/g, '/');
      const script = [
        `require('${patchModule}').patchChildProcessForWindows();`,
        `const cp = require('child_process');`,
        `const r = cp.spawnSync('npm.cmd', ['-v'], { encoding: 'utf8' });`,
        `if (r.error) { console.error('FAIL', r.error.message); process.exit(1); }`,
        `process.stdout.write(r.stdout.trim());`,
      ].join(' ');

      const stdout = execFileSync('node', ['--import', 'tsx', '-e', script], {
        encoding: 'utf8',
      });
      assert.match(stdout, /^\d+\.\d+\.\d+/);
    }
  );
});
