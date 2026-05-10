/**
 * Central route + menu config. Keep entries in this exact shape — the
 * Layout sidebar walks this list, and `arco add page` parses and edits
 * this file when you scaffold new pages.
 *
 * - `name` is an i18n key looked up against src/locale/index.ts
 * - `key` is the URL path segment AND the directory name under src/pages/
 * - Optional `requiredPermissions` is reserved for `arco add permissions`
 *   to wire up route guards later — leaves are inert when empty.
 */
export type IRoute = {
  name: string;
  key: string;
  children?: IRoute[];
  requiredPermissions?: string[];
  ignore?: boolean;
};

export const routes: IRoute[] = [
  {
    name: 'menu.dashboard',
    key: 'dashboard',
  },
];

export default routes;
