import path from 'path';
import os from 'os';
import fs from 'fs-extra';

function samePath(a: string, b: string): boolean {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

export function getUnsafeProjectRootReason(root: string): string | null {
  const resolved = path.resolve(root);
  const parsed = path.parse(resolved);

  if (samePath(resolved, parsed.root)) {
    return 'filesystem root';
  }

  if (samePath(resolved, os.homedir())) {
    return 'home directory';
  }

  if (fs.pathExistsSync(path.join(resolved, '.git'))) {
    return 'existing Git repository';
  }

  return null;
}

export function assertSafeProjectRoot(root: string): void {
  const reason = getUnsafeProjectRootReason(root);
  if (!reason) return;

  throw new Error(
    `Refusing to initialize into ${root} because it is an ${reason}. ` +
      'Choose a new child directory instead.'
  );
}
