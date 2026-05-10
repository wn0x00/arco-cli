import type { MockRoute } from '../vite-plugins/mock';

const routes: MockRoute[] = [
  {
    url: '/api/form/submit',
    method: 'POST',
    delay: 400,
    handler: ({ body }) => ({
      ok: true,
      id: `SUB-${Date.now()}`,
      received: body,
    }),
  },
];

export default routes;
