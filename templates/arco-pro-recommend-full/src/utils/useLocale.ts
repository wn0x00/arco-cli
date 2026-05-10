import { useMemo } from 'react';
import { useLocaleStore } from '@/store/locale';

/**
 * Tiny i18n hook. Each page (and the app-level locale) defines its own
 * `locale/index.ts` with the shape
 *
 *     { 'en-US': { 'page.key': '...' }, 'zh-CN': { 'page.key': '...' } }
 *
 * Pass it here and you get back the active translation map keyed by the
 * locale string. No external dep, no provider, no namespace machinery.
 *
 *   const t = useLocale(locale);
 *   t['page.key']
 *
 * The return type is intentionally `Record<string, string>` so callers
 * can index by computed keys (e.g. `t[item.name]` from a menu config)
 * without TS narrowing complaints. If you want stricter typing for a
 * specific page, write a thin wrapper that asserts the key set.
 */
export type LocaleBundle = Record<string, Record<string, string>>;

export default function useLocale(bundle: LocaleBundle): Record<string, string> {
  const code = useLocaleStore((s) => s.locale);
  return useMemo(() => bundle[code] ?? bundle['en-US'] ?? {}, [bundle, code]);
}
