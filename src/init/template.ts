import path from 'path';
import fs from 'fs-extra';
import { execQuick } from '../utils/exec';
import { newCacheEntryPath } from '../utils/cache';
import { runTemplateHook } from './templateHook';

export const TEMPLATE_DIR = 'template';
export const TEMPLATE_DIR_FOR_MONOREPO = 'template-for-monorepo';
export const CUSTOM_INIT_DIR = '.arco-cli';

export type DownloadedTemplate = {
  packagePath: string;
  tempDir: string;
  afterInitHookPath?: string;
};

/**
 * Parse `name`, `name@version`, `@scope/name`, `@scope/name@version`, or a
 * `file:...` path into a name/version pair.
 */
export function getPackageInfo(installPackage: string): { name: string; version?: string } {
  if (installPackage.startsWith('file:')) {
    const installPackagePath = installPackage.replace(/^file:/, '');
    const { name, version } = require(path.join(installPackagePath, 'package.json'));
    return { name, version };
  }

  const versionSeparatorIndex = installPackage.startsWith('@')
    ? installPackage.indexOf('@', 1)
    : installPackage.lastIndexOf('@');

  if (versionSeparatorIndex > 0) {
    return {
      name: installPackage.slice(0, versionSeparatorIndex),
      version: installPackage.slice(versionSeparatorIndex + 1),
    };
  }

  return { name: installPackage };
}

/**
 * Install one or more packages into `root`. If `allowYarn` is true and the
 * environment has yarn, prefer it over npm.
 */
export async function installPackages(
  root: string,
  dependencies?: string | string[],
  allowYarn = false
): Promise<void> {
  const dependencyList = Array.isArray(dependencies)
    ? dependencies
    : dependencies
      ? [dependencies]
      : [];
  let command = 'npm';
  let args = ['install'].concat(dependencyList);

  if (allowYarn) {
    const { stdout } = await execQuick('yarn -v', { cwd: root });
    if (/^\d+\.\d+/.test(stdout)) {
      command = 'yarn';
      args = dependencies ? ['add'].concat(dependencyList) : [];
    }
  }

  const commandExec = `${command} ${args.join(' ')}`;
  const { code, stderr } = await execQuick(commandExec, { cwd: root, silent: false });

  if (code !== 0) {
    throw new Error(`Command "${commandExec}" failed:\n${stderr}`);
  }
}

/**
 * Download `template` into a fresh cache directory and copy its content into
 * `root`. Returns the cache directory and any after-init hook path so the
 * caller can run the hook later and clean up.
 */
export async function downloadAndCopyTemplate(options: {
  root: string;
  template: string;
  isForMonorepo?: boolean;
  customInitFunctionParams?: Record<string, unknown>;
}): Promise<DownloadedTemplate> {
  const tempDir = newCacheEntryPath();
  let shouldKeepTempDir = false;

  try {
    fs.ensureDirSync(tempDir);
    fs.writeJsonSync(path.join(tempDir, 'package.json'), {});
    await installPackages(tempDir, options.template);

    const packagePath = path.join(tempDir, 'node_modules', getPackageInfo(options.template).name);
    const customInitPath = path.join(packagePath, CUSTOM_INIT_DIR, 'init.js');
    const templatePath = path.join(packagePath, TEMPLATE_DIR);
    const monorepoTemplatePath = path.join(packagePath, TEMPLATE_DIR_FOR_MONOREPO);

    if (options.isForMonorepo && fs.existsSync(monorepoTemplatePath)) {
      await fs.copy(monorepoTemplatePath, options.root, { overwrite: true });
    } else if (fs.existsSync(templatePath)) {
      await fs.copy(templatePath, options.root, { overwrite: true });
    } else if (fs.existsSync(customInitPath)) {
      await runTemplateHook(customInitPath, options.template, 'init', {
        ...options.customInitFunctionParams,
        projectPath: options.root,
      });
    } else {
      throw new Error(`No "${TEMPLATE_DIR}" directory or "${CUSTOM_INIT_DIR}/init.js" found`);
    }

    const afterInitCandidates = [
      path.join(packagePath, 'hook', 'after-init.js'),
      path.join(packagePath, CUSTOM_INIT_DIR, 'after-init.js'),
    ];

    shouldKeepTempDir = true;
    return {
      packagePath,
      tempDir,
      afterInitHookPath: afterInitCandidates.find((p) => fs.existsSync(p)),
    };
  } finally {
    if (!shouldKeepTempDir) {
      try {
        fs.removeSync(tempDir);
      } catch {
        // best-effort
      }
    }
  }
}

export function removeCacheEntry(tempDir: string): void {
  try {
    fs.removeSync(tempDir);
  } catch {
    // best-effort
  }
}
