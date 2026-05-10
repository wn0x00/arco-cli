import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { clack } from './utils/clack';
import { insertRoute, parseRoutesSource, RouteNode } from './routesEdit';
import { addMenuTranslation } from './localeEdit';

export type PageType = 'blank' | 'table';

export type AddPageOptions = {
  /** kebab-case directory name, e.g. "user-list". Becomes the route key too. */
  name: string;
  type: PageType;
  /** Project root that contains src/pages. Defaults to process.cwd(). */
  root: string;
};

export type ScaffoldResult = {
  pageRoot: string;
  /** Snippet to paste into src/routes.ts to register the new page in the menu. */
  routeSnippet: string;
  /** Snippet to paste into src/locale/index.ts for the sidebar menu translation. */
  menuSnippet: string;
};

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function toPascalCase(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal[0].toLowerCase() + pascal.slice(1);
}

function toDisplayName(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function blankIndexTsx(componentName: string, localeKey: string): string {
  return `import React from 'react';
import { Card, Typography } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import styles from './style/index.module.less';

function ${componentName}() {
  const t = useLocale(locale);

  return (
    <Card className={styles.container}>
      <Typography.Title heading={5}>{t['${localeKey}.title']}</Typography.Title>
      <Typography.Paragraph>{t['${localeKey}.description']}</Typography.Paragraph>
    </Card>
  );
}

export default ${componentName};
`;
}

function tableIndexTsx(componentName: string, localeKey: string): string {
  return `import React, { useState } from 'react';
import { Button, Card, Space, Table, Typography } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import styles from './style/index.module.less';

type Row = {
  id: string;
  name: string;
  createdAt: string;
};

function ${componentName}() {
  const t = useLocale(locale);
  const [loading] = useState(false);
  const [data] = useState<Row[]>([]);

  const columns = [
    { title: t['${localeKey}.column.id'], dataIndex: 'id' },
    { title: t['${localeKey}.column.name'], dataIndex: 'name' },
    { title: t['${localeKey}.column.createdAt'], dataIndex: 'createdAt' },
    {
      title: t['${localeKey}.column.operations'],
      dataIndex: 'operations',
      render: () => (
        <Space>
          <Button type="text" size="mini">
            {t['${localeKey}.action.view']}
          </Button>
          <Button type="text" size="mini">
            {t['${localeKey}.action.edit']}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <Typography.Title heading={5} style={{ margin: 0 }}>
          {t['${localeKey}.title']}
        </Typography.Title>
        <Button type="primary" icon={<IconPlus />}>
          {t['${localeKey}.action.create']}
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        data={data}
        pagination={{ sizeCanChange: true, showTotal: true, pageSize: 10 }}
      />
    </Card>
  );
}

export default ${componentName};
`;
}

function blankLocaleIndexTs(localeKey: string, displayName: string): string {
  return `const i18n = {
  'en-US': {
    '${localeKey}.title': '${displayName}',
    '${localeKey}.description': 'Replace this with your page description.',
  },
  'zh-CN': {
    '${localeKey}.title': '${displayName}',
    '${localeKey}.description': '在此替换为页面描述。',
  },
};

export default i18n;
`;
}

function tableLocaleIndexTs(localeKey: string, displayName: string): string {
  return `const i18n = {
  'en-US': {
    '${localeKey}.title': '${displayName}',
    '${localeKey}.action.create': 'Create',
    '${localeKey}.action.view': 'View',
    '${localeKey}.action.edit': 'Edit',
    '${localeKey}.column.id': 'ID',
    '${localeKey}.column.name': 'Name',
    '${localeKey}.column.createdAt': 'Created at',
    '${localeKey}.column.operations': 'Operations',
  },
  'zh-CN': {
    '${localeKey}.title': '${displayName}',
    '${localeKey}.action.create': '新建',
    '${localeKey}.action.view': '查看',
    '${localeKey}.action.edit': '编辑',
    '${localeKey}.column.id': 'ID',
    '${localeKey}.column.name': '名称',
    '${localeKey}.column.createdAt': '创建时间',
    '${localeKey}.column.operations': '操作',
  },
};

export default i18n;
`;
}

const STYLE_BLANK = `.container {
  padding: 20px;
}
`;

const STYLE_TABLE = `.container {
  padding: 20px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
}
`;

/**
 * Pure file-IO half of the add-page flow: validate, write files, build the
 * snippet text. Throws on bad input or directory conflict instead of
 * touching stdout, so the function is straightforward to unit test.
 *
 * The CLI wrapper `addPage` (default export) calls this and renders the
 * result through clack — those UI bits aren't testable under jest's CJS VM
 * because @clack/prompts is ESM and we load it via a Function-constructor
 * dynamic import.
 */
export function scaffoldPage(options: AddPageOptions): ScaffoldResult {
  if (!NAME_PATTERN.test(options.name)) {
    throw new Error(
      `Invalid page name "${options.name}". Use kebab-case, e.g. "user-list" or "data-analysis".`
    );
  }

  const componentName = toPascalCase(options.name);
  const localeKey = toCamelCase(options.name);
  const displayName = toDisplayName(options.name);

  const pageRoot = path.resolve(options.root, 'src/pages', options.name);
  if (fs.existsSync(pageRoot)) {
    throw new Error(`Page already exists: ${pageRoot}`);
  }

  fs.mkdirSync(path.join(pageRoot, 'style'), { recursive: true });
  fs.mkdirSync(path.join(pageRoot, 'locale'), { recursive: true });

  const isTable = options.type === 'table';
  const indexContent = isTable
    ? tableIndexTsx(componentName, localeKey)
    : blankIndexTsx(componentName, localeKey);
  const localeContent = isTable
    ? tableLocaleIndexTs(localeKey, displayName)
    : blankLocaleIndexTs(localeKey, displayName);
  const styleContent = isTable ? STYLE_TABLE : STYLE_BLANK;

  fs.writeFileSync(path.join(pageRoot, 'index.tsx'), indexContent);
  fs.writeFileSync(path.join(pageRoot, 'style', 'index.module.less'), styleContent);
  fs.writeFileSync(path.join(pageRoot, 'locale', 'index.ts'), localeContent);

  const routeSnippet = `// in src/routes.ts, add to the appropriate \`routes\` array:
{
  name: 'menu.${localeKey}',
  key: '${options.name}',
},`;

  const menuSnippet = `// in src/locale/index.ts, add to BOTH 'en-US' and 'zh-CN' blocks:
'menu.${localeKey}': '${displayName}',  // EN — keep or translate
'menu.${localeKey}': '${displayName}',  // ZH — translate to Chinese`;

  return { pageRoot, routeSnippet, menuSnippet };
}

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
 * the new page lives in the menu tree (existing top-level group, existing
 * sub-menu's parent, or a brand-new top-level menu), then writes the page
 * files AND splices the new route into src/routes.ts and the menu
 * translation into src/locale/index.ts. Falls back to print-snippets mode
 * if either source file is missing or can't be parsed.
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
    let menuLabelEn = displayName;

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
          menuLabelEn = displayName;
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

function camelFromKebab(name: string): string {
  const parts = name.split('-').filter(Boolean);
  return parts.map((p, i) => (i === 0 ? p : p[0].toUpperCase() + p.slice(1))).join('');
}

function displayFromKebab(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}
