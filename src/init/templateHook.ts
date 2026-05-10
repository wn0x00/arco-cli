import path from 'path';

/**
 * Load and invoke a template hook (init.js / after-init.js).
 *
 * Templates routinely shell out to `npm run ...` from inside their hook
 * without setting `cwd`, expecting their own package directory to be the
 * working directory. Hooks live two levels deep inside the package
 * (e.g. `<pkg>/.arco-cli/init.js`, `<pkg>/hook/after-init.js`), so the
 * package root is always two parents up from the hook path. We chdir to
 * that root for the duration of the hook call and restore the previous
 * cwd in finally so a thrown hook doesn't leave the process stranded.
 *
 * Failures are wrapped to attribute the error to the template package
 * rather than dumping a raw stack from arco-cli.
 */
export async function runTemplateHook(
  hookPath: string,
  templateName: string,
  hookKind: 'init' | 'after-init',
  hookArgs: Record<string, unknown>
): Promise<unknown> {
  let hook: (args: unknown) => unknown;
  try {
    hook = require(hookPath);
  } catch (err) {
    throw new Error(
      `Failed to load ${hookKind} hook from template "${templateName}".\n` +
        `  Hook path: ${hookPath}\n` +
        `  This is likely a bug in the template package, not arco-cli.\n` +
        `  Underlying error: ${(err as Error).message || String(err)}`
    );
  }

  const templatePackageRoot = path.dirname(path.dirname(hookPath));
  const previousCwd = process.cwd();
  process.chdir(templatePackageRoot);
  try {
    return await hook(hookArgs);
  } catch (err) {
    throw new Error(
      `Template "${templateName}" ${hookKind} hook threw an error.\n` +
        `  Hook path: ${hookPath}\n` +
        `  This is likely a bug in the template package, not arco-cli.\n` +
        `  Underlying error: ${(err as Error).message || String(err)}`
    );
  } finally {
    try {
      process.chdir(previousCwd);
    } catch {
      // best-effort restore; ignore
    }
  }
}
