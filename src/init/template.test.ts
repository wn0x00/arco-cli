import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { installPackages } from './template';

describe('installPackages', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arco-cli-install-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('rejects template specs with shell control characters before running npm', async () => {
    await assert.rejects(
      () => installPackages(tempDir, 'left-pad & echo nope'),
      /Unsafe package spec/
    );
  });
});
