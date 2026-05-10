import type * as ClackPrompts from '@clack/prompts';

/**
 * @clack/prompts is ESM-only since 1.x. With `module: CommonJS`, TypeScript
 * lowers `await import('@clack/prompts')` to `Promise.resolve(require(...))`,
 * which fails at runtime for ESM-only packages. Using `new Function` keeps
 * the dynamic import as a real native ESM import that the JS engine
 * evaluates without TS's interference.
 */
const dynamicImport = new Function('specifier', 'return import(specifier)') as <T>(
  specifier: string
) => Promise<T>;

let cache: typeof ClackPrompts | null = null;

/** Lazily load and cache the @clack/prompts module. */
export async function clack(): Promise<typeof ClackPrompts> {
  if (cache) return cache;
  cache = await dynamicImport<typeof ClackPrompts>('@clack/prompts');
  return cache;
}
