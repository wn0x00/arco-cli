import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export const TEMPLATE_CACHE_DIR = path.resolve(os.homedir(), '.arco_template_cache');

const TEMPLATE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Best-effort sweep of template cache entries older than the TTL. Each entry
 * is wrapped in its own try/catch so a single locked directory doesn't stop
 * the rest of the cleanup.
 */
export function cleanStaleTemplateCache(): void {
  if (!fs.existsSync(TEMPLATE_CACHE_DIR)) return;
  const cutoff = Date.now() - TEMPLATE_CACHE_TTL_MS;
  let entries: string[];
  try {
    entries = fs.readdirSync(TEMPLATE_CACHE_DIR);
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryPath = path.join(TEMPLATE_CACHE_DIR, entry);
    try {
      if (fs.statSync(entryPath).mtimeMs < cutoff) {
        fs.removeSync(entryPath);
      }
    } catch {
      // ignore individual failures
    }
  }
}

export function newCacheEntryPath(): string {
  return path.resolve(TEMPLATE_CACHE_DIR, `${Date.now()}`);
}
