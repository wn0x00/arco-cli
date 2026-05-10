import path from 'path';
import fs from 'fs-extra';
import { execQuick } from './utils/exec';

const ARCO_REACT_PACKAGE = '@arco-design/web-react';
const ARCO_VUE_PACKAGE = '@arco-design/web-vue';

function isTextFile(buffer: Buffer): boolean {
  return !buffer.includes(0);
}

/**
 * Replace `@CONST_*@` placeholders in every text file under `root` with
 * values derived from the target project's package.json.
 */
async function replaceConstants(root: string, packageJson: Record<string, unknown>): Promise<void> {
  const peerDependencies = packageJson.peerDependencies as Record<string, unknown> | undefined;
  const isVue = !!peerDependencies?.vue;
  const arcoPackageName = isVue ? ARCO_VUE_PACKAGE : ARCO_REACT_PACKAGE;
  const replacements: Record<string, string> = {
    '@CONST_PACKAGE_NAME@': (packageJson.name as string) || '',
    '@CONST_ARCO_PACKAGE_NAME@': arcoPackageName,
    '@CONST_ARCO_DIST_CSS_NAME@': 'arco.css',
  };

  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git'].includes(entry.name)) {
            await walk(entryPath);
          }
          return;
        }
        const buffer = await fs.readFile(entryPath);
        if (!isTextFile(buffer)) return;
        let content = buffer.toString('utf8');
        for (const [placeholder, value] of Object.entries(replacements)) {
          content = content.split(placeholder).join(value);
        }
        await fs.writeFile(entryPath, content);
      })
    );
  };

  await walk(root);
}

/**
 * Merge `extension` into the project's package.json (creating it if missing),
 * normalize legacy `_files` into `files`, and run placeholder replacement.
 */
export async function transformToProject(
  root: string,
  extension: Record<string, unknown>
): Promise<void> {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = fs.existsSync(packageJsonPath) ? fs.readJsonSync(packageJsonPath) : {};

  Object.assign(packageJson, extension);
  if (packageJson._files) {
    packageJson.files = packageJson._files;
    delete packageJson._files;
  }

  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  await replaceConstants(root, packageJson);
}

/**
 * Templates ship a `gitignore` file (no leading dot, so npm doesn't strip
 * it during publish). After copying we either rename it to `.gitignore` or
 * append it to an existing one.
 */
export function adoptTemplateGitignore(root: string): void {
  const sourceFilename = path.join(root, 'gitignore');
  const targetFilename = path.join(root, '.gitignore');

  if (!fs.existsSync(sourceFilename)) return;

  if (fs.existsSync(targetFilename)) {
    fs.appendFileSync(targetFilename, fs.readFileSync(sourceFilename));
    fs.unlinkSync(sourceFilename);
    return;
  }

  fs.moveSync(sourceFilename, targetFilename);
}

/**
 * Initialize a git repository in `root` and create the first commit.
 * Returns false if any step failed; callers should treat this as a soft
 * failure and report a warning, not abort.
 */
export async function tryInitialGitCommit(root: string, packageName: string): Promise<boolean> {
  const { code: codeInit } = await execQuick('git init', { cwd: root });
  if (codeInit !== 0) return false;

  const { code: codeAdd } = await execQuick('git add -A', { cwd: root });
  const { code: codeCommit } = await execQuick(
    `git commit -m "initialize ${packageName}" --no-verify`,
    { cwd: root }
  );

  return codeAdd === 0 && codeCommit === 0;
}
