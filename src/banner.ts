import chalk from 'chalk';

const { version } = require('../package.json');

const ASCII: string[] = [
  '   █████╗ ██████╗  ██████╗ ██████╗ ',
  '  ██╔══██╗██╔══██╗██╔════╝██╔═══██╗',
  '  ███████║██████╔╝██║     ██║   ██║',
  '  ██╔══██║██╔══██╗██║     ██║   ██║',
  '  ██║  ██║██║  ██║╚██████╗╚██████╔╝',
  '  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ',
];

const TAGLINE = 'scaffold from Arco templates';
const AUTHOR = 'by @guanzhu.me';

/** Print the arco-cli banner above the clack intro line. */
export function printBanner(): void {
  console.log();
  for (const line of ASCII) {
    console.log(chalk.cyan.bold(line));
  }
  console.log();
  console.log(`  ${chalk.cyan(`v${version}`)}  ${chalk.gray('·')}  ${chalk.dim(TAGLINE)}`);
  console.log(`  ${chalk.dim(AUTHOR)}`);
  console.log();
}
