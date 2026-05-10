import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Tiny self-hosted mock plugin. Drops a Connect middleware on the dev
 * server that intercepts `/api/*` and dispatches to handlers loaded from
 * `mock/*.ts`. The plugin is dev-only — production builds carry no
 * mock code at all.
 *
 * A handler module exports an array of routes:
 *
 *     // mock/user.ts
 *     export default [
 *       {
 *         method: 'GET',
 *         url: '/api/user/me',
 *         handler: () => ({ id: 1, name: 'Alice' }),
 *       },
 *     ];
 *
 * Re-import on file change so editing a handler hot-reloads without
 * restarting Vite.
 */

export type MockMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MockRoute = {
  url: string | RegExp;
  method?: MockMethod;
  handler: (req: {
    url: string;
    method: string;
    query: Record<string, string>;
    body: unknown;
  }) => unknown | Promise<unknown>;
  /** Optional artificial latency in ms. */
  delay?: number;
};

export function mockApiPlugin(): Plugin {
  let allRoutes: MockRoute[] = [];

  const loadAll = async (mockDir: string): Promise<MockRoute[]> => {
    if (!fs.existsSync(mockDir)) return [];
    const files = fs.readdirSync(mockDir).filter((f) => /\.(ts|js|mts|mjs)$/.test(f));
    const routes: MockRoute[] = [];
    for (const f of files) {
      const fullPath = path.join(mockDir, f);
      const url = pathToFileURL(fullPath).href + `?t=${Date.now()}`;
      try {
        const mod = (await import(url)) as { default: MockRoute[] };
        if (Array.isArray(mod.default)) routes.push(...mod.default);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[mock] failed to load ${f}:`, err);
      }
    }
    return routes;
  };

  return {
    name: 'arco-pro-mock',
    apply: 'serve',
    async configureServer(server: ViteDevServer) {
      const mockDir = path.resolve(server.config.root, 'mock');
      allRoutes = await loadAll(mockDir);

      // Reload mocks on any change inside mock/.
      server.watcher.add(`${mockDir}/**`);
      const reload = async () => {
        allRoutes = await loadAll(mockDir);
        // eslint-disable-next-line no-console
        console.log(`[mock] reloaded ${allRoutes.length} route(s)`);
      };
      server.watcher.on('change', (file) => {
        if (file.startsWith(mockDir)) void reload();
      });
      server.watcher.on('add', (file) => {
        if (file.startsWith(mockDir)) void reload();
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        const matched = matchRoute(allRoutes, req);
        if (!matched) return next();

        try {
          const body = await readBody(req);
          if (matched.delay) await new Promise((r) => setTimeout(r, matched.delay));
          const result = await matched.handler({
            url: req.url,
            method: req.method ?? 'GET',
            query: parseQuery(req.url),
            body,
          });
          respondJson(res, 200, result);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[mock] handler threw for ${req.url}:`, err);
          respondJson(res, 500, { error: String(err) });
        }
      });
    },
  };
}

function matchRoute(routes: MockRoute[], req: IncomingMessage): MockRoute | null {
  const method = (req.method ?? 'GET').toUpperCase();
  const pathOnly = (req.url ?? '').split('?')[0];
  for (const route of routes) {
    if (route.method && route.method !== method) continue;
    if (typeof route.url === 'string') {
      if (route.url === pathOnly) return route;
    } else if (route.url.test(pathOnly)) {
      return route;
    }
  }
  return null;
}

function parseQuery(url: string): Record<string, string> {
  const q: Record<string, string> = {};
  const queryStr = url.split('?')[1];
  if (!queryStr) return q;
  for (const part of queryStr.split('&')) {
    const [k, v = ''] = part.split('=');
    q[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return q;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve(text);
      }
    });
    req.on('error', reject);
  });
}

function respondJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
