import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import chalk from 'chalk';

export type DevOptions = {
  /** Project root containing the package.json with a `dev` script. Defaults to process.cwd(). */
  root: string;
  /** Extra args appended after `<pm> run dev --`. Useful for forwarding `--port 5174` etc. */
  forwardedArgs: string[];
};

export type PackageManager = 'pnpm' | 'yarn' | 'npm';

/**
 * Pick the package manager the project is using based on which lockfile it
 * commits. We prefer the most specific lockfile when several coexist:
 * pnpm > yarn > npm. Falls back to npm if no lockfile is found.
 */
export function detectPackageManager(root: string): PackageManager {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function packageHasDevScript(root: string): boolean {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = fs.readJsonSync(pkgPath);
    return Boolean(pkg?.scripts?.dev);
  } catch {
    return false;
  }
}

/**
 * Run the project's `dev` script in the foreground, inheriting stdio so the
 * user sees the dev server output and can Ctrl+C through to it. Resolves
 * with the child's exit code (0 on graceful shutdown).
 */
export function runDev(options: DevOptions): Promise<number> {
  if (!packageHasDevScript(options.root)) {
    const where = path.relative(process.cwd(), options.root) || '.';
    throw new Error(
      `No "dev" script found in ${where}/package.json. ` +
        'Make sure you are running this from an arco-design-pro project root, ' +
        'or pass --root to point at one.'
    );
  }

  const pm = detectPackageManager(options.root);
  // pm is `npm` / `yarn` / `pnpm`; on Windows the actual binary is .cmd, so
  // shell:true lets the platform shell resolve it correctly. The CLI's own
  // child_process is unpatched here (we don't pull in patchChildProcess for
  // first-party commands), so we pass shell:true explicitly.
  const args = ['run', 'dev'];
  if (options.forwardedArgs.length > 0) {
    // npm and pnpm need `--` to forward args to the underlying script;
    // yarn forwards everything after the script name without `--`.
    if (pm !== 'yarn') args.push('--');
    args.push(...options.forwardedArgs);
  }

  console.log(
    chalk.dim(`> ${pm} ${args.join(' ')}`) +
      (options.root === process.cwd() ? '' : chalk.dim(`  (in ${options.root})`))
  );

  return new Promise((resolve, reject) => {
    const child = spawn(pm, args, {
      cwd: options.root,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 0));
  });
}
