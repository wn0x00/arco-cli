#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const npmCommand = process.env.npm_command || '';

function skip(reason) {
  console.log(`prepare: skip husky (${reason})`);
  process.exit(0);
}

if (process.env.HUSKY === '0') skip('HUSKY=0');
if (process.env.CI) skip('CI');
if (!fs.existsSync('.git')) skip('no .git directory');
if (npmCommand === 'pack' || npmCommand === 'publish') skip(`npm ${npmCommand}`);

const result = spawnSync('npx', ['--no-install', 'husky'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
