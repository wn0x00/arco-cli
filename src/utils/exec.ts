import { spawn } from 'child_process';

export type ExecResult = { code: number; stdout: string; stderr: string };

export type ExecOptions = {
  cwd?: string;
  silent?: boolean;
  shell?: boolean;
};

/**
 * Run `command` through the shell and capture stdout/stderr.
 *
 * `command` is interpreted by the platform shell (cmd on Windows, sh on
 * POSIX), so callers should only pass commands that they themselves
 * built — never untrusted input.
 */
export function execQuick(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  return execFileQuick(command, [], { ...options, shell: true });
}

/**
 * Run a command with structured arguments and capture stdout/stderr.
 *
 * Prefer this over `execQuick` whenever any argument comes from user input,
 * project metadata, or another file. `shell:true` remains available for
 * Windows npm/yarn shims, but the command itself is no longer assembled by
 * manual string concatenation.
 */
export function execFileQuick(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const result: ExecResult = { code: 0, stdout: '', stderr: '' };
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: options.shell ?? false,
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      result.stdout += output;
      if (options.silent === false) process.stdout.write(output);
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      result.stderr += output;
      if (options.silent === false) process.stderr.write(output);
    });

    child.on('error', (err) => {
      result.code = 1;
      result.stderr += err.message;
      resolve(result);
    });

    child.on('close', (code) => {
      result.code = code || 0;
      resolve(result);
    });
  });
}

function quoteArg(arg: string): string {
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(arg)) return arg;
  return JSON.stringify(arg);
}

export function formatCommand(command: string, args: string[] = []): string {
  return [command, ...args].map(quoteArg).join(' ');
}
