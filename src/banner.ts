import chalk from 'chalk';

const { version } = require('../package.json');

const ASCII_TOP = '  ▄▀█ █▀█ █▀▀ █▀█';
const ASCII_BOTTOM = '  █▀█ █▀▄ █▄▄ █▄█';

const TAGLINE = 'by @guanzhu.me · scaffold from Arco templates';

/** Print the arco-cli banner above the clack intro line. */
export function printBanner(): void {
  console.log();
  console.log(chalk.cyan(ASCII_TOP));
  console.log(`${chalk.cyan(ASCII_BOTTOM)}  ${chalk.gray(`v${version}`)}`);
  console.log();
  console.log(`  ${chalk.dim(TAGLINE)}`);
  console.log();
}
