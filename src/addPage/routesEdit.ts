/**
 * Parse and edit arco-design-pro's `src/routes.ts` to support interactive
 * menu placement when running `arco add page`. We deliberately treat the
 * file as text plus a single JS-evaluable array literal — we do NOT depend
 * on the TypeScript compiler at runtime (it would balloon the install).
 *
 * The supported shape, mirroring what `arco-design-pro` ships:
 *
 *     export const routes: IRoute[] = [
 *       { name: 'menu.foo', key: 'foo' },
 *       { name: 'menu.bar', key: 'bar', children: [
 *         { name: 'menu.bar.baz', key: 'bar/baz' },
 *       ] },
 *     ];
 *
 * Unknown fields on a route (e.g. `requiredPermissions`, `breadcrumb`,
 * `ignore`) survive a parse-then-serialize round-trip; comments inside the
 * array do not.
 */

export type RouteNode = {
  name: string;
  key: string;
  children?: RouteNode[];
  // Preserve passthrough fields like `requiredPermissions`, `breadcrumb`, `ignore`.
  [extra: string]: unknown;
};

export type ParsedRoutes = {
  source: string;
  /** Top-level routes array, post-eval. */
  routes: RouteNode[];
  /** Offset of the opening `[` of the routes array. */
  arrayStart: number;
  /** Offset of the closing `]` of the routes array. */
  arrayEnd: number;
};

const ROUTES_DECL = /export\s+const\s+routes\b[^=]*=\s*/;

/**
 * Parse a routes.ts source string. Returns null if the expected
 * `export const routes ... = [...]` declaration is missing or the array
 * fails to evaluate as a plain JS literal (e.g. it contains identifier
 * references like `lazy(...)` from a router-driven setup).
 */
export function parseRoutesSource(source: string): ParsedRoutes | null {
  const match = source.match(ROUTES_DECL);
  if (!match || match.index === undefined) return null;

  const declEnd = match.index + match[0].length;
  // Skip whitespace to the opening `[`.
  let pos = declEnd;
  while (pos < source.length && /\s/.test(source[pos])) pos++;
  if (source[pos] !== '[') return null;
  const arrayStart = pos;

  // Walk to the matching `]`, tracking string state so brackets inside
  // strings don't confuse the depth counter.
  let depth = 0;
  let inString: string | null = null;
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
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) break;
    }
    pos++;
  }
  if (depth !== 0 || source[pos] !== ']') return null;
  const arrayEnd = pos;

  const arrayText = source.substring(arrayStart, arrayEnd + 1);
  let routes: RouteNode[];
  try {
    routes = new Function(`return ${arrayText};`)() as RouteNode[];
  } catch {
    return null;
  }
  if (!Array.isArray(routes)) return null;
  return { source, routes, arrayStart, arrayEnd };
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function quote(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function serializeValue(value: unknown, indent: number): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const inner = '  '.repeat(indent + 1);
    const close = '  '.repeat(indent);
    const items = value.map((v) => `${inner}${serializeValue(v, indent + 1)},`);
    return `[\n${items.join('\n')}\n${close}]`;
  }
  if (typeof value === 'object') {
    return serializeObject(value as Record<string, unknown>, indent);
  }
  return JSON.stringify(value) ?? 'null';
}

function serializeObject(obj: Record<string, unknown>, indent: number): string {
  // Skip undefined-valued keys so a cloned RouteNode without children
  // doesn't render `children: undefined` (which JSON.stringify turns into
  // the literal string "null", which then makes the file un-reparseable).
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined);
  if (keys.length === 0) return '{}';
  const inner = '  '.repeat(indent + 1);
  const close = '  '.repeat(indent);
  const lines = keys.map((k) => {
    const keyText = IDENT.test(k) ? k : JSON.stringify(k);
    return `${inner}${keyText}: ${serializeValue(obj[k], indent + 1)},`;
  });
  return `{\n${lines.join('\n')}\n${close}}`;
}

/** Serialize a routes array back into source text using single quotes,
 * trailing commas, and 2-space indentation — matching arco-design-pro style. */
export function serializeRoutes(routes: RouteNode[], baseIndent = 0): string {
  return serializeValue(routes, baseIndent);
}

/** Splice a new route into the parsed tree.
 *
 * - parentKey === null  → append to the top-level routes array
 * - parentKey === '<key>' → append to that node's `children` array, creating
 *   `children: []` if it doesn't exist
 *
 * Returns the new file source. The original source's pre-array prefix and
 * post-array suffix are preserved verbatim; only the routes array literal
 * is re-serialized.
 */
export function insertRoute(
  parsed: ParsedRoutes,
  parentKey: string | null,
  newRoute: RouteNode
): string {
  const next = cloneRoutes(parsed.routes);

  if (parentKey === null) {
    next.push(newRoute);
  } else {
    const parent = findByKey(next, parentKey);
    if (!parent) {
      throw new Error(`Parent route with key '${parentKey}' not found`);
    }
    parent.children = parent.children ? [...parent.children, newRoute] : [newRoute];
  }

  const baseIndent = detectIndent(parsed.source, parsed.arrayStart);
  const replacement = serializeRoutes(next, baseIndent);
  return (
    parsed.source.substring(0, parsed.arrayStart) +
    replacement +
    parsed.source.substring(parsed.arrayEnd + 1)
  );
}

function cloneRoutes(nodes: RouteNode[]): RouteNode[] {
  return nodes.map((n) => ({
    ...n,
    children: n.children ? cloneRoutes(n.children) : undefined,
  }));
}

function findByKey(nodes: RouteNode[], key: string): RouteNode | null {
  for (const n of nodes) {
    if (n.key === key) return n;
    if (n.children) {
      const found = findByKey(n.children, key);
      if (found) return found;
    }
  }
  return null;
}

/** Count the leading spaces on the line containing `offset`. */
function detectIndent(source: string, offset: number): number {
  let i = offset;
  while (i > 0 && source[i - 1] !== '\n') i--;
  let spaces = 0;
  while (i < source.length && source[i] === ' ') {
    spaces++;
    i++;
  }
  return Math.floor(spaces / 2);
}

/** Flatten the route tree to a list useful for menu pickers — top-level
 * groups (level 1) and their direct children (level 2). */
export type FlatMenu = {
  key: string;
  label: string;
  level: 1 | 2;
  hasChildren: boolean;
};

export function flattenForMenu(routes: RouteNode[]): FlatMenu[] {
  const out: FlatMenu[] = [];
  for (const r of routes) {
    out.push({
      key: r.key,
      label: r.name,
      level: 1,
      hasChildren: !!(r.children && r.children.length),
    });
    if (r.children) {
      for (const c of r.children) {
        out.push({ key: c.key, label: c.name, level: 2, hasChildren: false });
      }
    }
  }
  return out;
}
