import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runTemplateHook } from './templateHook';

const FIXTURE_CWD_INIT = path.resolve(
  __dirname,
  '../../test/fixtures/mock-template/.arco-cli/init.js'
);
const FIXTURE_CWD_ROOT = path.dirname(path.dirname(FIXTURE_CWD_INIT));

const FIXTURE_NPM_INIT = path.resolve(
  __dirname,
  '../../test/fixtures/mock-template-npm/.arco-cli/init.js'
);

describe('runTemplateHook', () => {
  let tempDir: string;
  let markerPath: string;
  let cwdBefore: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arco-cli-test-'));
    markerPath = path.join(tempDir, 'marker.out');
    cwdBefore = process.cwd();
  });

  afterEach(() => {
    if (process.cwd() !== cwdBefore) process.chdir(cwdBefore);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('chdirs into the template package root before calling the hook', async () => {
    await runTemplateHook(FIXTURE_CWD_INIT, 'mock-template', 'init', { markerPath });
    assert.equal(fs.existsSync(markerPath), true);
    const recordedCwd = fs.readFileSync(markerPath, 'utf8');
    assert.equal(path.resolve(recordedCwd), path.resolve(FIXTURE_CWD_ROOT));
  });

  it('restores the previous cwd after a successful hook', async () => {
    await runTemplateHook(FIXTURE_CWD_INIT, 'mock-template', 'init', { markerPath });
    assert.equal(process.cwd(), cwdBefore);
  });

  it('restores the previous cwd even when the hook throws', async () => {
    const throwingHook = path.join(tempDir, 'pkg', 'hookdir', 'throws.js');
    fs.mkdirSync(path.dirname(throwingHook), { recursive: true });
    fs.writeFileSync(throwingHook, 'module.exports = function () { throw new Error("boom"); };');
    await assert.rejects(
      () => runTemplateHook(throwingHook, 'thrower', 'init', {}),
      /Template "thrower" init hook threw an error[\s\S]+boom/
    );
    assert.equal(process.cwd(), cwdBefore);
  });

  it('wraps require errors with template attribution', async () => {
    const missing = path.join(tempDir, 'pkg', 'hookdir', 'missing.js');
    await assert.rejects(
      () => runTemplateHook(missing, 'broken', 'init', {}),
      /Failed to load init hook from template "broken"/
    );
  });

  /**
   * End-to-end reproduction of the arco-design-pro failure mode. The
   * fixture's init.js shells out to `npm run ...` with no cwd option, just
   * like arco-design-pro@2.x does. Without our chdir + spawn shim, npm
   * would either fail with EINVAL (Windows) or ENOENT looking for a
   * package.json in the test process's cwd.
   *
   * Run in a child node process so the Module.prototype.require hook the
   * patch installs takes effect cleanly. The subprocess loads our TS
   * sources directly via --experimental-strip-types.
   */
  it(
    'lets a real npm subprocess find the template package.json (e2e via child node)',
    { skip: process.platform !== 'win32', timeout: 30000 },
    () => {
      const initDir = __dirname.replace(/\\/g, '/');
      const fixture = FIXTURE_NPM_INIT.replace(/\\/g, '/');
      const marker = path.join(tempDir, 'npm-marker.out').replace(/\\/g, '/');

      const script = [
        `require('${initDir}/patchChildProcess.ts').patchChildProcessForWindows();`,
        `const { runTemplateHook } = require('${initDir}/templateHook.ts');`,
        `runTemplateHook('${fixture}', 'mock-npm', 'init', { markerPath: '${marker}' })`,
        `  .then(() => process.exit(0))`,
        `  .catch((err) => { console.error(err.message); process.exit(1); });`,
      ].join('\n');

      execFileSync('node', ['--import', 'tsx', '-e', script], { stdio: 'inherit' });
      assert.equal(fs.existsSync(marker.replace(/\//g, path.sep)), true);
      assert.equal(fs.readFileSync(marker.replace(/\//g, path.sep), 'utf8'), 'ok');
    }
  );

  /**
   * Sanity check on non-Windows that the same flow works without the
   * spawn shim path (since CVE-2024-27980 is win32-specific).
   */
  it(
    'works without the win32 patch on POSIX (e2e via child node)',
    { skip: process.platform === 'win32', timeout: 30000 },
    () => {
      const initDir = __dirname;
      const fixture = FIXTURE_NPM_INIT.replace(/\\/g, '/');
      const marker = path.join(tempDir, 'npm-marker.out').replace(/\\/g, '/');
      const script = [
        `const { runTemplateHook } = require('${initDir.replace(/\\/g, '/')}/templateHook.ts');`,
        `runTemplateHook('${fixture}', 'mock-npm', 'init', { markerPath: '${marker}' })`,
        `  .then(() => process.exit(0))`,
        `  .catch(e => { console.error(e.message); process.exit(1); });`,
      ].join('\n');
      execFileSync('node', ['--import', 'tsx', '-e', script], { stdio: 'inherit' });
      assert.equal(fs.existsSync(marker), true);
    }
  );
});
