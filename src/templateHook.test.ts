import path from 'path';
import os from 'os';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { runTemplateHook } from './templateHook';

const FIXTURE_CWD_INIT = path.resolve(
  __dirname,
  '../test/fixtures/mock-template/.arco-cli/init.js'
);
const FIXTURE_CWD_ROOT = path.dirname(path.dirname(FIXTURE_CWD_INIT));

const FIXTURE_NPM_INIT = path.resolve(
  __dirname,
  '../test/fixtures/mock-template-npm/.arco-cli/init.js'
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
    expect(fs.existsSync(markerPath)).toBe(true);
    const recordedCwd = fs.readFileSync(markerPath, 'utf8');
    expect(path.resolve(recordedCwd)).toBe(path.resolve(FIXTURE_CWD_ROOT));
  });

  it('restores the previous cwd after a successful hook', async () => {
    await runTemplateHook(FIXTURE_CWD_INIT, 'mock-template', 'init', { markerPath });
    expect(process.cwd()).toBe(cwdBefore);
  });

  it('restores the previous cwd even when the hook throws', async () => {
    const throwingHook = path.join(tempDir, 'pkg', 'hookdir', 'throws.js');
    fs.mkdirSync(path.dirname(throwingHook), { recursive: true });
    fs.writeFileSync(throwingHook, 'module.exports = function () { throw new Error("boom"); };');
    await expect(runTemplateHook(throwingHook, 'thrower', 'init', {})).rejects.toThrow(
      /Template "thrower" init hook threw an error[\s\S]+boom/
    );
    expect(process.cwd()).toBe(cwdBefore);
  });

  it('wraps require errors with template attribution', async () => {
    const missing = path.join(tempDir, 'pkg', 'hookdir', 'missing.js');
    await expect(runTemplateHook(missing, 'broken', 'init', {})).rejects.toThrow(
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
   * Run in a child node process because jest's module loader bypasses our
   * Module.prototype.require hook, so the patched child_process is only
   * observable in a fresh Node runtime that loads our compiled lib.
   */
  it('lets a real npm subprocess find the template package.json (e2e via child node)', () => {
    const libDir = path.resolve(__dirname, '..', 'lib').replace(/\\/g, '/');
    const fixture = FIXTURE_NPM_INIT.replace(/\\/g, '/');
    const marker = path.join(tempDir, 'npm-marker.out').replace(/\\/g, '/');

    const script = `
      require('${libDir}/patchChildProcess').patchChildProcessForWindows();
      const { runTemplateHook } = require('${libDir}/templateHook');
      runTemplateHook('${fixture}', 'mock-npm', 'init', { markerPath: '${marker}' })
        .then(() => process.exit(0))
        .catch((err) => { console.error(err.message); process.exit(1); });
    `;

    execFileSync('node', ['-e', script], { stdio: 'inherit' });
    expect(fs.existsSync(marker.replace(/\//g, path.sep))).toBe(true);
    expect(fs.readFileSync(marker.replace(/\//g, path.sep), 'utf8')).toBe('ok');
  }, 30000);

  /**
   * Sanity check on non-Windows that the same flow works without the
   * spawn shim path (since CVE-2024-27980 is win32-specific).
   */
  if (process.platform !== 'win32') {
    it('works without the win32 patch on POSIX (e2e via child node)', () => {
      const libDir = path.resolve(__dirname, '..', 'lib');
      const marker = path.join(tempDir, 'npm-marker.out');
      const script =
        `const { runTemplateHook } = require('${libDir.replace(/\\/g, '/')}/templateHook');` +
        `runTemplateHook('${FIXTURE_NPM_INIT.replace(/\\/g, '/')}', 'mock-npm', 'init', { markerPath: '${marker.replace(/\\/g, '/')}' })` +
        `.then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });`;
      execFileSync('node', ['-e', script], { stdio: 'inherit' });
      expect(fs.existsSync(marker)).toBe(true);
    }, 30000);
  }
});
