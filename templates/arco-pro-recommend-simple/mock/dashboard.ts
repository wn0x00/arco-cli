import type { MockRoute } from '../vite-plugins/mock';

const stats: MockRoute[] = [
  {
    url: '/api/dashboard/stats',
    method: 'GET',
    handler: () => ({
      activeUsers: 1248,
      newSignups: 42,
      revenueToday: 8920.5,
      pendingTickets: 7,
    }),
  },
];

export default stats;
