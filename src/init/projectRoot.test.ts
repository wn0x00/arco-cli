import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { getUnsafeProjectRootReason, assertSafeProjectRoot } from './projectRoot';

describe('project root safety checks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arco-cli-root-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('allows a normal project directory', () => {
    assert.equal(getUnsafeProjectRootReason(tempDir), null);
    assert.doesNotThrow(() => assertSafeProjectRoot(tempDir));
  });

  it('rejects filesystem roots', () => {
    const root = path.parse(tempDir).root;
    assert.equal(getUnsafeProjectRootReason(root), 'filesystem root');
  });

  it('rejects the home directory', () => {
    assert.equal(getUnsafeProjectRootReason(os.homedir()), 'home directory');
  });

  it('rejects an existing git repository root', () => {
    fs.mkdirSync(path.join(tempDir, '.git'));
    assert.equal(getUnsafeProjectRootReason(tempDir), 'existing Git repository');
    assert.throws(() => assertSafeProjectRoot(tempDir), /existing Git repository/);
  });
});
