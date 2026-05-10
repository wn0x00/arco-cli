#!/usr/bin/env node
// Run all `*.test.ts` files under src/ through Node's built-in test runner,
// using tsx as the loader so the .ts sources are transpiled on the fly.
// Globbing happens here so the script behaves the same on every shell —
// avoiding the Git Bash globstar quirks we'd otherwise hit on Windows.
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = globSync('src/**/*.test.ts', { cwd: projectRoot });
if (files.length === 0) {
  console.error('No test files matched src/**/*.test.ts');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...files.map((f) => path.join(projectRoot, f))],
  { cwd: projectRoot, stdio: 'inherit' }
);
process.exit(result.status ?? 1);
