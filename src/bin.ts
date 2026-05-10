#!/usr/bin/env node

import { Command } from 'commander';
import initProject from './commands/init';
import addPage, { PageType } from './commands/addPage';
import { runDev } from './commands/dev';

const program = new Command();

const { version } = require('../package.json');

program.name('arco').version(version, '-v, --version').usage('[commands] [options]');

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

const addCmd = program.command('add').description('add scaffolded content to an existing project');

addCmd
  .command('page <name>')
  .description('scaffold a new page in an arco-design-pro Vite/Next project')
  .option('-t, --type <type>', 'page type: blank | table', 'blank')
  .option('-r, --root <path>', 'project root containing src/pages', process.cwd())
  .action((name, options) => {
    if (options.type !== 'blank' && options.type !== 'table') {
      console.error(`Unknown --type "${options.type}". Use "blank" or "table".`);
      process.exit(1);
    }
    const type: PageType = options.type;
    addPage({ name, type, root: options.root }).catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
  });

program
  .command('dev')
  .description("run the project's `dev` script through the detected package manager")
  .option('-r, --root <path>', 'project root with package.json', process.cwd())
  .allowUnknownOption(true) // forward arbitrary flags through to the dev script
  .action((options, cmd) => {
    const forwardedArgs: string[] = cmd.args.slice();
    runDev({ root: options.root, forwardedArgs })
      .then((code) => process.exit(code))
      .catch((err) => {
        console.error(err.message || err);
        process.exit(1);
      });
  });

program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ arco init my-app');
  console.log('  $ arco init my-app --template arco-design-pro');
  console.log('  $ arco init my-app --template file:../my-template');
  console.log('  $ arco add page user-list --type table');
  console.log('  $ arco dev');
  console.log('  $ arco dev -- --port 5174');
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
