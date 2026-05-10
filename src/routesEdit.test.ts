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
    expect(parsed).not.toBeNull();
    expect(parsed!.routes).toHaveLength(2);
    expect(parsed!.routes[0].name).toBe('menu.dashboard');
    expect(parsed!.routes[0].children?.[0].key).toBe('dashboard/workplace');
    expect(SAMPLE[parsed!.arrayStart]).toBe('[');
    expect(SAMPLE[parsed!.arrayEnd]).toBe(']');
  });

  it('returns null when the routes declaration is missing', () => {
    expect(parseRoutesSource('// nothing to see\nexport const x = 1;\n')).toBeNull();
  });
});

describe('insertRoute', () => {
  it('appends a new route at the root level', () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const next = insertRoute(parsed, null, { name: 'menu.user', key: 'user' });
    expect(next).toContain("name: 'menu.user'");
    expect(next).toContain("key: 'user'");
    // Original routes survive the round-trip.
    const reparsed = parseRoutesSource(next)!;
    expect(reparsed.routes.map((r) => r.key)).toEqual(['dashboard', 'list', 'user']);
  });

  it("appends to an existing parent's children array", () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const next = insertRoute(parsed, 'dashboard', {
      name: 'menu.dashboard.monitor',
      key: 'dashboard/monitor',
    });
    const reparsed = parseRoutesSource(next)!;
    const dashboard = reparsed.routes.find((r) => r.key === 'dashboard');
    expect(dashboard?.children?.map((c) => c.key)).toEqual([
      'dashboard/workplace',
      'dashboard/monitor',
    ]);
  });

  it('creates children: [] when the parent had no children before', () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const next = insertRoute(parsed, 'list', {
      name: 'menu.list.search',
      key: 'list/search',
    });
    const reparsed = parseRoutesSource(next)!;
    const list = reparsed.routes.find((r) => r.key === 'list');
    expect(list?.children?.map((c) => c.key)).toEqual(['list/search']);
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
    expect(wp.requiredPermissions).toEqual([{ resource: 'm.dash.work', actions: ['read'] }]);
  });
});

describe('flattenForMenu', () => {
  it('returns top-level groups and their direct children with level annotations', () => {
    const parsed = parseRoutesSource(SAMPLE)!;
    const flat = flattenForMenu(parsed.routes);
    expect(flat).toEqual([
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
    expect(text.startsWith('[')).toBe(true);
    const reparsed = parseRoutesSource(`export const routes = ${text};`);
    expect(reparsed?.routes.map((r) => r.key)).toEqual(['dashboard', 'list']);
  });
});
