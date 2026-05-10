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

type Placement =
  | { mode: 'root' }
  | { mode: 'under'; parentKey: string }
  | { mode: 'new-top'; menuName: string; menuLabel: string };

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

  // Encode placements as string tokens so clack's `select` doesn't have to
  // widen across a discriminated-union value type. Tokens:
  //   __root__              → place at root
  //   __new-top__           → create a new top-level menu
  //   under:<existing-key>  → place under the named existing top-level group
  const choices: { value: string; label: string; hint?: string }[] = [
    { value: '__root__', label: 'At root (no parent menu)' },
  ];
  for (const r of parsed.routes) {
    choices.push({
      value: `under:${r.key}`,
      label: `Under ${r.name}`,
      hint: r.children?.length
        ? `${r.children.length} existing sub-menu${r.children.length > 1 ? 's' : ''}`
        : 'no children yet',
    });
  }
  choices.push({ value: '__new-top__', label: '+ Create a new top-level menu' });

  const picked = await c.select({
    message: 'Where should this page live?',
    options: choices,
  });
  if (c.isCancel(picked)) {
    c.cancel('Canceled');
    process.exit(0);
  }
  const pickedValue = picked as string;

  if (pickedValue === '__root__') return { mode: 'root' };
  if (pickedValue.startsWith('under:')) {
    return { mode: 'under', parentKey: pickedValue.slice('under:'.length) };
  }

  // __new-top__
  const menuKey = await c.text({
    message: 'New top-level menu key (kebab-case)',
    placeholder: 'admin',
    validate: (v: string | undefined): string | undefined => {
      if (!v || !v.trim()) return 'Menu key is required';
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(v.trim())) return 'Use kebab-case';
      if (parsed.routes.some((r) => r.key === v.trim())) return `Menu '${v.trim()}' already exists`;
      return undefined;
    },
  });
  if (c.isCancel(menuKey)) {
    c.cancel('Canceled');
    process.exit(0);
  }
  const trimmedKey = (menuKey as string).trim();
  const defaultLabel = trimmedKey
    .split('-')
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
  const menuLabel = await c.text({
    message: 'Menu display name (English)',
    placeholder: defaultLabel,
    defaultValue: defaultLabel,
    validate: (v: string | undefined) =>
      v === undefined || v.trim() || defaultLabel ? undefined : 'Display name is required',
  });
  if (c.isCancel(menuLabel)) {
    c.cancel('Canceled');
    process.exit(0);
  }
  return {
    mode: 'new-top',
    menuName: trimmedKey,
    menuLabel: ((menuLabel as string) || defaultLabel).trim(),
  };
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
    result = scaffoldPage(options);
  } catch (err) {
    c.log.error((err as Error).message);
    process.exit(1);
  }

  const relativePath = path.relative(options.root, result.pageRoot) || result.pageRoot;
  c.log.success(`Created ${chalk.cyan(relativePath)} (${options.type})`);

  if (hasRoutes && placement) {
    const localeKey = camelFromKebab(options.name);
    const displayName = displayFromKebab(options.name);
    const newPageRoute: RouteNode = { name: `menu.${localeKey}`, key: options.name };

    let routesUpdated = false;
    let localeUpdated = false;
    let menuKeyToTranslate = `menu.${localeKey}`;
    const menuLabelEn = displayName;

    try {
      const source = fs.readFileSync(routesPath, 'utf8');
      const parsed = parseRoutesSource(source);
      if (parsed) {
        let nextSource: string;
        if (placement.mode === 'root') {
          nextSource = insertRoute(parsed, null, newPageRoute);
        } else if (placement.mode === 'under') {
          // Place the new page as a child of the chosen group, with its key
          // namespaced under the parent (arco-design-pro convention).
          nextSource = insertRoute(parsed, placement.parentKey, {
            name: `menu.${camelFromKebab(placement.parentKey)}.${localeKey}`,
            key: `${placement.parentKey}/${options.name}`,
          });
          menuKeyToTranslate = `menu.${camelFromKebab(placement.parentKey)}.${localeKey}`;
        } else {
          // new-top: create a fresh top-level group containing this page.
          nextSource = insertRoute(parsed, null, {
            name: `menu.${camelFromKebab(placement.menuName)}`,
            key: placement.menuName,
            children: [
              {
                name: `menu.${camelFromKebab(placement.menuName)}.${localeKey}`,
                key: `${placement.menuName}/${options.name}`,
              },
            ],
          });
          menuKeyToTranslate = `menu.${camelFromKebab(placement.menuName)}.${localeKey}`;
          // Also write the parent menu's own label.
          const parentLabelKey = `menu.${camelFromKebab(placement.menuName)}`;
          const parentLabelEn = placement.menuLabel;
          if (fs.existsSync(localePath)) {
            const localeSrc = fs.readFileSync(localePath, 'utf8');
            const updated = addMenuTranslation(
              localeSrc,
              parentLabelKey,
              parentLabelEn,
              parentLabelEn
            );
            if (updated) {
              fs.writeFileSync(localePath, updated);
              localeUpdated = true;
            }
          }
        }
        fs.writeFileSync(routesPath, nextSource);
        routesUpdated = true;
      }
    } catch (err) {
      c.log.warn(`Could not update routes.ts automatically: ${(err as Error).message}`);
    }

    if (fs.existsSync(localePath)) {
      try {
        const localeSrc = fs.readFileSync(localePath, 'utf8');
        const updated = addMenuTranslation(localeSrc, menuKeyToTranslate, menuLabelEn, menuLabelEn);
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
