import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { clack } from '../utils/clack';
import {
  AddPageOptions,
  ScaffoldResult,
  camelFromKebab,
  displayFromKebab,
  scaffoldPage,
} from '../addPage/scaffold';
import { insertRoute, parseRoutesSource, RouteNode } from '../addPage/routesEdit';
import { addMenuTranslation } from '../addPage/localeEdit';

export type { AddPageOptions, PageType } from '../addPage/scaffold';

/**
 * `arco add page` only supports two structural placements: at the menu's
 * top level, or under one existing top-level group as a 2nd-level child.
 * Brand-new menu groups should be created in two steps — `add page` the
 * group first as a top-level page, then `add page` more under it. This
 * keeps the routes.ts diff small and predictable for each invocation.
 */
type Placement = { mode: 'top' } | { mode: 'under'; parentKey: string };

async function pickPlacement(
  options: AddPageOptions,
  routesPath: string,
  source: string,
  c: Awaited<ReturnType<typeof clack>>
): Promise<Placement | null> {
  const parsed = parseRoutesSource(source);
  if (!parsed) {
    c.log.warn(
      `Could not parse ${path.relative(options.root, routesPath)} — falling back to printing snippets instead of editing it.`
    );
    return null;
  }

  // String tokens so clack's `select` doesn't widen across a discriminated
  // union value type. `__top__` means flat top-level; `under:<key>` means
  // appended as a child of that existing top-level group.
  const choices: { value: string; label: string; hint?: string }[] = [
    { value: '__top__', label: 'As a top-level page' },
  ];
  for (const r of parsed.routes) {
    choices.push({
      value: `under:${r.key}`,
      label: `Under ${r.name}`,
      hint: r.children?.length
        ? `${r.children.length} existing sub-menu${r.children.length > 1 ? 's' : ''}`
        : 'will become a 2nd-level menu',
    });
  }

  const picked = await c.select({
    message: 'Where should this page live?',
    options: choices,
  });
  if (c.isCancel(picked)) {
    c.cancel('Canceled');
    process.exit(0);
  }
  const pickedValue = picked as string;

  if (pickedValue === '__top__') return { mode: 'top' };
  return { mode: 'under', parentKey: pickedValue.slice('under:'.length) };
}

/**
 * Interactive arco-design-pro page scaffolder. Lets the caller pick where
 * the new page lives in the menu tree (existing top-level group, or a
 * brand-new top-level menu), then writes the page files AND splices the
 * new route into src/routes.ts and the menu translation into
 * src/locale/index.ts. Falls back to print-snippets mode if either source
 * file is missing or can't be parsed.
 */
export default async function addPage(options: AddPageOptions): Promise<void> {
  const c = await clack();
  c.intro(chalk.bold('arco add page'));

  const pagesParent = path.resolve(options.root, 'src/pages');
  if (!fs.existsSync(pagesParent)) {
    c.log.warn(
      `${pagesParent} does not exist — creating it. ` +
        'Make sure you are running this in an arco-design-pro project root.'
    );
  }

  const routesPath = path.resolve(options.root, 'src/routes.ts');
  const localePath = path.resolve(options.root, 'src/locale/index.ts');
  const hasRoutes = fs.existsSync(routesPath);

  let placement: Placement | null = null;
  if (hasRoutes) {
    placement = await pickPlacement(options, routesPath, fs.readFileSync(routesPath, 'utf8'), c);
  }

  let result: ScaffoldResult;
  try {
    result = scaffoldPage({
      ...options,
      parentKey: placement?.mode === 'under' ? placement.parentKey : undefined,
    });
  } catch (err) {
    c.log.error((err as Error).message);
    process.exit(1);
  }

  const relativePath = path.relative(options.root, result.pageRoot) || result.pageRoot;
  c.log.success(`Created ${chalk.cyan(relativePath)} (${options.type})`);

  if (hasRoutes && placement) {
    const pageLocaleKey = camelFromKebab(options.name);
    const displayName = displayFromKebab(options.name);
    const menuKeyToTranslate =
      placement.mode === 'under'
        ? `menu.${camelFromKebab(placement.parentKey)}.${pageLocaleKey}`
        : `menu.${pageLocaleKey}`;
    const newRoute: RouteNode = { name: menuKeyToTranslate, key: result.routeKey };

    let routesUpdated = false;
    let localeUpdated = false;

    try {
      const source = fs.readFileSync(routesPath, 'utf8');
      const parsed = parseRoutesSource(source);
      if (parsed) {
        const nextSource =
          placement.mode === 'top'
            ? insertRoute(parsed, null, newRoute)
            : insertRoute(parsed, placement.parentKey, newRoute);
        fs.writeFileSync(routesPath, nextSource);
        routesUpdated = true;
      }
    } catch (err) {
      c.log.warn(`Could not update routes.ts automatically: ${(err as Error).message}`);
    }

    if (fs.existsSync(localePath)) {
      try {
        const localeSrc = fs.readFileSync(localePath, 'utf8');
        const updated = addMenuTranslation(localeSrc, menuKeyToTranslate, displayName, displayName);
        if (updated) {
          fs.writeFileSync(localePath, updated);
          localeUpdated = true;
        }
      } catch (err) {
        c.log.warn(`Could not update locale/index.ts automatically: ${(err as Error).message}`);
      }
    }

    if (routesUpdated) {
      c.log.success(`Updated ${chalk.cyan(path.relative(options.root, routesPath))}`);
    }
    if (localeUpdated) {
      c.log.success(`Updated ${chalk.cyan(path.relative(options.root, localePath))}`);
      c.note(
        `Translate '${menuKeyToTranslate}' for zh-CN in src/locale/index.ts to a Chinese label.`,
        'Reminder'
      );
    }
    if (!routesUpdated || !localeUpdated) {
      c.note(result.routeSnippet, 'Register the route');
      c.note(result.menuSnippet, 'Add menu translation');
    }
  } else {
    c.note(result.routeSnippet, 'Register the route');
    c.note(result.menuSnippet, 'Add menu translation');
  }

  c.outro(chalk.green('Done'));
}
