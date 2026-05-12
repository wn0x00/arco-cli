import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileQuick, formatCommand } from './exec';

describe('execFileQuick', () => {
  it('passes arguments without shell interpolation by default', async () => {
    const result = await execFileQuick(process.execPath, [
      '-e',
      'process.stdout.write(process.argv.at(-1) || "")',
      'hello & goodbye',
    ]);

    assert.equal(result.code, 0);
    assert.equal(result.stdout, 'hello & goodbye');
  });
});

describe('formatCommand', () => {
  it('quotes display-only arguments with spaces', () => {
    assert.equal(
      formatCommand('git', ['commit', '-m', 'initialize my app']),
      'git commit -m "initialize my app"'
    );
  });
});
