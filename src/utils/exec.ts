import { spawn } from 'child_process';

export type ExecResult = { code: number; stdout: string; stderr: string };

export type ExecOptions = {
  cwd?: string;
  silent?: boolean;
};

/**
 * Run `command` through the shell and capture stdout/stderr.
 *
 * `command` is interpreted by the platform shell (cmd on Windows, sh on
 * POSIX), so callers should only pass commands that they themselves
 * built — never untrusted input.
 */
export function execQuick(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    const result: ExecResult = { code: 0, stdout: '', stderr: '' };
    const child = spawn(command, [], {
      cwd: options.cwd,
      shell: true,
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

    child.on('close', (code) => {
      result.code = code || 0;
      resolve(result);
    });
  });
}
