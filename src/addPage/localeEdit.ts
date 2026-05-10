/**
 * Insert a single key into both the 'en-US' and 'zh-CN' object literals
 * inside arco-design-pro's `src/locale/index.ts`. We work at the source
 * level so existing comments and key ordering are preserved.
 *
 * Expected file shape:
 *
 *     const i18n = {
 *       'en-US': {
 *         'menu.foo': 'Foo',
 *         ...
 *       },
 *       'zh-CN': {
 *         'menu.foo': '...',
 *         ...
 *       },
 *     };
 *
 * If either block can't be located, we fall through (the caller surfaces a
 * warning and prints the snippet instead).
 */

export function addMenuTranslation(
  source: string,
  key: string,
  enValue: string,
  zhValue: string
): string | null {
  const next = insertIntoBlock(source, "'en-US'", key, enValue);
  if (next === null) return null;
  const final = insertIntoBlock(next, "'zh-CN'", key, zhValue);
  return final;
}

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Find `<blockKey>: {` and walk to its matching `}`. Insert a new
 * `'<entryKey>': '<entryValue>'` line just before the closing brace,
 * picking up the indentation of an adjacent existing entry so the new
 * line matches surrounding style. Returns null if the block isn't found
 * or its braces don't balance.
 */
function insertIntoBlock(
  source: string,
  blockKey: string,
  entryKey: string,
  entryValue: string
): string | null {
  const headRegex = new RegExp(`${blockKey.replace(/'/g, "\\'")}\\s*:\\s*\\{`);
  const headMatch = source.match(headRegex);
  if (!headMatch || headMatch.index === undefined) return null;

  const openIdx = source.indexOf('{', headMatch.index + headMatch[0].length - 1);
  if (openIdx < 0) return null;

  let depth = 0;
  let inString: string | null = null;
  let pos = openIdx;
  while (pos < source.length) {
    const c = source[pos];
    if (inString) {
      if (c === '\\') {
        pos += 2;
        continue;
      }
      if (c === inString) inString = null;
    } else if (c === "'" || c === '"' || c === '`') {
      inString = c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) break;
    }
    pos++;
  }
  if (depth !== 0 || source[pos] !== '}') return null;
  const closeIdx = pos;

  const indent = detectEntryIndent(source, openIdx, closeIdx);
  const inserted = `${indent}'${escape(entryKey)}': '${escape(entryValue)}',\n`;

  // Insert before the line that contains the closing brace, to land between
  // the last entry and the closing line (which is typically `  },`).
  let insertAt = closeIdx;
  while (insertAt > openIdx && source[insertAt - 1] !== '\n') insertAt--;

  return source.substring(0, insertAt) + inserted + source.substring(insertAt);
}

/** Sniff the indentation used by an existing entry inside the block, falling
 * back to 4 spaces if the block is empty. */
function detectEntryIndent(source: string, openIdx: number, closeIdx: number): string {
  // Walk forward from the line after `{`, find the first non-blank line
  // that isn't the closing `}`, and copy its leading whitespace.
  let pos = openIdx + 1;
  while (pos < closeIdx) {
    if (source[pos] === '\n') {
      let lineStart = pos + 1;
      let p = lineStart;
      while (p < closeIdx && (source[p] === ' ' || source[p] === '\t')) p++;
      if (p < closeIdx && source[p] !== '}' && source[p] !== '\n') {
        return source.substring(lineStart, p);
      }
    }
    pos++;
  }
  return '    ';
}
