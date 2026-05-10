import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flattenForMenu, insertRoute, parseRoutesSource, serializeRoutes } from './routesEdit';

const SAMPLE = `import { useEffect, useState } from 'react';

export type IRoute = {
  name: string;
  key: string;
  children?: IRoute[];
};

export const routes: IRoute[] = [
  {
    name: 'menu.dashboard',
    key: 'dashboard',
    children: [
      {
        name: 'menu.dashboard.workplace',
        key: 'dashboard/workplace',
      },
    ],
  },
  {
    name: 'menu.list',
    key: 'list',
  },
];

export default routes;
`;

describe('parseRoutesSource', () => {
  it('parses the routes array into a JS tree and locates its offsets', () => {
    const parsed = parseRoutesSource(SAMPLE);
    assert.notEqual(parsed, null);
    assert.equal(parsed!.routes.length, 2);
    assert.equal(parsed!.routes[0].name, 'menu.dashboard');
    assert.equal(parsed!.routes[0].children?.[0].key, 'dashboard/workplace');
    assert.equal(SAMPLE[parsed!.arrayStart], '[');
    assert.equal(SAMPLE[parsed!.arrayEnd], ']');
  });

  it('returns null when the routes declaration is missing', () => {
    assert.equal(parseRoutesSource('// nothing to see\nexport const x = 1;\n'), null);
  });
});

describe('insertRoute', () => {
  it('appends a new route at the root level', () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const next = insertRoute(parsed, null, { name: 'menu.user', key: 'user' });
    assert.match(next, /name: 'menu\.user'/);
    assert.match(next, /key: 'user'/);
    // Original routes survive the round-trip.
    const reparsed = parseRoutesSource(next)!;
    assert.deepEqual(
      reparsed.routes.map((r) => r.key),
      ['dashboard', 'list', 'user']
    );
  });

  it("appends to an existing parent's children array", () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const next = insertRoute(parsed, 'dashboard', {
      name: 'menu.dashboard.monitor',
      key: 'dashboard/monitor',
    });
    const reparsed = parseRoutesSource(next)!;
    const dashboard = reparsed.routes.find((r) => r.key === 'dashboard');
    assert.deepEqual(
      dashboard?.children?.map((c) => c.key),
      ['dashboard/workplace', 'dashboard/monitor']
    );
  });

  it('creates children: [] when the parent had no children before', () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const next = insertRoute(parsed, 'list', {
      name: 'menu.list.search',
      key: 'list/search',
    });
    const reparsed = parseRoutesSource(next)!;
    const list = reparsed.routes.find((r) => r.key === 'list');
    assert.deepEqual(
      list?.children?.map((c) => c.key),
      ['list/search']
    );
  });

  it('preserves passthrough fields like requiredPermissions', () => {
    const sourceWithPerms = SAMPLE.replace(
      "key: 'dashboard/workplace',\n      },",
      "key: 'dashboard/workplace',\n        requiredPermissions: [{ resource: 'm.dash.work', actions: ['read'] }],\n      },"
    );
    const parsed = parseRoutesSource(sourceWithPerms)!;
    const next = insertRoute(parsed, null, { name: 'menu.x', key: 'x' });
    const reparsed = parseRoutesSource(next)!;
    const wp = reparsed.routes[0].children![0];
    assert.deepEqual(wp.requiredPermissions, [{ resource: 'm.dash.work', actions: ['read'] }]);
  });
});

describe('flattenForMenu', () => {
  it('returns top-level groups and their direct children with level annotations', () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const flat = flattenForMenu(parsed.routes);
    assert.deepEqual(flat, [
      { key: 'dashboard', label: 'menu.dashboard', level: 1, hasChildren: true },
      {
        key: 'dashboard/workplace',
        label: 'menu.dashboard.workplace',
        level: 2,
        hasChildren: false,
      },
      { key: 'list', label: 'menu.list', level: 1, hasChildren: false },
    ]);
  });
});

describe('serializeRoutes', () => {
  it('round-trips a parsed tree to a re-parseable form', () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const text = serializeRoutes(parsed.routes);
    assert.equal(text.startsWith('['), true);
    const reparsed = parseRoutesSource(`export const routes = ${text};`);
    assert.deepEqual(
      reparsed?.routes.map((r) => r.key),
      ['dashboard', 'list']
    );
  });
});
