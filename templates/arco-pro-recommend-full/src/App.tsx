import { useEffect, lazy, Suspense } from 'react';
import { ConfigProvider, Spin } from '@arco-design/web-react';
import enUS from '@arco-design/web-react/es/locale/en-US';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useThemeStore } from '@/store/theme';
import { useLocaleStore } from '@/store/locale';
import { routes } from '@/routes';
import type { IRoute } from '@/routes';

// Deep glob so a page added under a parent (`arco add page` 2nd-level)
// at `src/pages/<parent>/<page>/index.tsx` is picked up alongside flat
// top-level pages at `src/pages/<page>/index.tsx`.
const pageModules = import.meta.glob('./pages/**/index.tsx');

function lazyPage(routeKey: string) {
  // The route key directly mirrors the directory path under src/pages.
  // 'dashboard' → ./pages/dashboard/index.tsx
  // 'dashboard/user-list' → ./pages/dashboard/user-list/index.tsx
  const importer = pageModules[`./pages/${routeKey}/index.tsx`];
  if (!importer) {
    return () => <div style={{ padding: 24 }}>Page not found: {routeKey}</div>;
  }
  return lazy(importer as () => Promise<{ default: React.ComponentType }>);
}

function flattenLeaves(items: IRoute[]): IRoute[] {
  const out: IRoute[] = [];
  for (const r of items) {
    if (r.children?.length) out.push(...flattenLeaves(r.children));
    else out.push(r);
  }
  return out;
}

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const localeCode = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.body.setAttribute('arco-theme', theme === 'dark' ? 'dark' : '');
  }, [theme]);

  const arcoLocale = localeCode === 'zh-CN' ? zhCN : enUS;
  const leaves = flattenLeaves(routes);

  return (
    <ConfigProvider locale={arcoLocale}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to={leaves[0]?.key ?? 'dashboard'} replace />} />
            {leaves.map((leaf) => {
              const Page = lazyPage(leaf.key);
              return (
                <Route
                  key={leaf.key}
                  path={leaf.key}
                  element={
                    <Suspense fallback={<Spin block style={{ margin: 40 }} />}>
                      <Page />
                    </Suspense>
                  }
                />
              );
            })}
            <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
