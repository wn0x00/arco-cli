import Module from 'module';
import * as originalChildProcess from 'child_process';

let patched = false;

/**
 * Older template packages (e.g. arco-design-pro, arco-design-pro-vue) call
 * spawn/spawnSync with `npm.cmd` directly. Since the CVE-2024-27980 fix,
 * Node refuses to invoke .cmd/.bat files without `shell: true`.
 *
 * Node 22+ marks the child_process exports as non-configurable getters, so
 * we cannot mutate them in place. Instead we hook Module.prototype.require
 * and return a wrapped child_process module to any caller (e.g. a template
 * hook script) that requires it. Must run before loading template hooks.
 */
export function patchChildProcessForWindows(): void {
  if (patched || process.platform !== 'win32') return;
  patched = true;

  const isBatchFile = (cmd: unknown): boolean =>
    typeof cmd === 'string' && /\.(cmd|bat)$/i.test(cmd);

  const originalSpawn = originalChildProcess.spawn;
  const originalSpawnSync = originalChildProcess.spawnSync;

  const patchedSpawn = function patchedSpawn(command: unknown, ...rest: unknown[]) {
    if (isBatchFile(command)) {
      const args = Array.isArray(rest[0]) ? rest[0] : [];
      const opts = (Array.isArray(rest[0]) ? rest[1] : rest[0]) as Record<string, unknown>;
      return (originalSpawn as unknown as (...a: unknown[]) => unknown)(command, args, {
        ...(opts || {}),
        shell: true,
      });
    }
    return (originalSpawn as unknown as (...a: unknown[]) => unknown)(command, ...rest);
  };

  const patchedSpawnSync = function patchedSpawnSync(command: unknown, ...rest: unknown[]) {
    if (isBatchFile(command)) {
      const args = Array.isArray(rest[0]) ? rest[0] : [];
      const opts = (Array.isArray(rest[0]) ? rest[1] : rest[0]) as Record<string, unknown>;
      return (originalSpawnSync as unknown as (...a: unknown[]) => unknown)(command, args, {
        ...(opts || {}),
        shell: true,
      });
    }
    return (originalSpawnSync as unknown as (...a: unknown[]) => unknown)(command, ...rest);
  };

  // Build a wrapper module that mirrors child_process but with patched
  // spawn/spawnSync. Reading via direct property access invokes any getters
  // and copies the resolved values as plain data properties.
  const wrapped: Record<string | symbol, unknown> = {};
  for (const key of Reflect.ownKeys(originalChildProcess)) {
    wrapped[key] = (originalChildProcess as Record<string | symbol, unknown>)[
      key as keyof typeof originalChildProcess
    ];
  }
  wrapped.spawn = patchedSpawn;
  wrapped.spawnSync = patchedSpawnSync;

  const moduleProto = Module.prototype as { require: (id: string) => unknown };
  const originalRequire = moduleProto.require;
  moduleProto.require = function patchedRequire(id: string) {
    if (id === 'child_process' || id === 'node:child_process') {
      return wrapped;
    }
    return originalRequire.call(this, id);
  };
}
