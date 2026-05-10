import type { MockRoute } from '../vite-plugins/mock';

const STATUSES = ['active', 'paused', 'archived'];

function generateRows(total: number) {
  const rows = [];
  for (let i = 1; i <= total; i++) {
    rows.push({
      id: `ITEM-${1000 + i}`,
      name: `Sample item ${i}`,
      status: STATUSES[i % STATUSES.length],
      createdAt: new Date(2026, 0, (i % 28) + 1).toISOString(),
      owner: ['Alice', 'Bob', 'Carol', 'Dan'][i % 4],
    });
  }
  return rows;
}

const ALL = generateRows(48);

const routes: MockRoute[] = [
  {
    url: '/api/list',
    method: 'GET',
    delay: 200,
    handler: ({ query }) => {
      const page = Number(query.page ?? 1);
      const pageSize = Number(query.pageSize ?? 10);
      const filtered = query.status
        ? ALL.filter((row) => row.status === query.status)
        : ALL;
      const start = (page - 1) * pageSize;
      return {
        data: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    },
  },
];

export default routes;
