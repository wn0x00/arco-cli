#!/usr/bin/env node

import program from 'commander';
import initProject from './initProject';

const { version } = require('../package.json');

program
  .name('arco')
  .version(version, '-v, --version')
  .usage('[commands] [options]');

program
  .command('init <projectName>')
  .description('initialize a project from a selectable template')
  .option('-t, --template <packageName>', 'template npm package or file: path')
  .option('--skip-install', 'skip installing dependencies after template copy')
  .option('--skip-git', 'skip git repository initialization and first commit')
  .action((projectName, options) => {
    initProject({
      projectName,
      template: options.template,
      skipInstall: !!options.skipInstall,
      skipGit: !!options.skipGit,
    }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ arco init my-app');
  console.log('  $ arco init my-app --template arco-design-pro');
  console.log('  $ arco init my-app --template file:../my-template');
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
