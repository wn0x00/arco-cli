import path from 'path';
import fs from 'fs-extra';

export type PageType = 'blank' | 'table';

export type AddPageOptions = {
  /** kebab-case directory name, e.g. "user-list". */
  name: string;
  type: PageType;
  /** Project root that contains src/pages. Defaults to process.cwd(). */
  root: string;
  /**
   * Parent route key when adding a 2nd-level page. Files are written to
   * `src/pages/<parentKey>/<name>/` and the route key becomes
   * `<parentKey>/<name>`. Leave undefined for a top-level page.
   */
  parentKey?: string;
};

export type ScaffoldResult = {
  pageRoot: string;
  /** Final route key — `name` for top-level, `parent/name` for nested. */
  routeKey: string;
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

export function camelFromKebab(name: string): string {
  const parts = name.split('-').filter(Boolean);
  return parts.map((p, i) => (i === 0 ? p : p[0].toUpperCase() + p.slice(1))).join('');
}

export function displayFromKebab(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

function blankIndexTsx(componentName: string, localeKey: string): string {
  return `import { Card, Typography } from '@arco-design/web-react';
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
  return `import { useState } from 'react';
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
 */
export function scaffoldPage(options: AddPageOptions): ScaffoldResult {
  if (!NAME_PATTERN.test(options.name)) {
    throw new Error(
      `Invalid page name "${options.name}". Use kebab-case, e.g. "user-list" or "data-analysis".`
    );
  }
  if (options.parentKey !== undefined && !NAME_PATTERN.test(options.parentKey)) {
    throw new Error(
      `Invalid parent key "${options.parentKey}". Use kebab-case, e.g. "dashboard" or "data-analysis".`
    );
  }

  const componentName = toPascalCase(options.name);
  const pageLocaleKey = camelFromKebab(options.name);
  const displayName = displayFromKebab(options.name);
  // Route key mirrors the URL hierarchy: top-level = "<name>",
  // 2nd-level = "<parent>/<name>". The page directory under src/pages also
  // mirrors this so the App.tsx lazy resolver can map routeKey directly to
  // a file path.
  const routeKey = options.parentKey ? `${options.parentKey}/${options.name}` : options.name;
  // Menu translation key: namespaced under the parent for nested pages.
  const menuKey = options.parentKey
    ? `menu.${camelFromKebab(options.parentKey)}.${pageLocaleKey}`
    : `menu.${pageLocaleKey}`;

  const pageRoot = options.parentKey
    ? path.resolve(options.root, 'src/pages', options.parentKey, options.name)
    : path.resolve(options.root, 'src/pages', options.name);
  if (fs.existsSync(pageRoot)) {
    throw new Error(`Page already exists: ${pageRoot}`);
  }

  fs.mkdirSync(path.join(pageRoot, 'style'), { recursive: true });
  fs.mkdirSync(path.join(pageRoot, 'locale'), { recursive: true });

  const isTable = options.type === 'table';
  const indexContent = isTable
    ? tableIndexTsx(componentName, pageLocaleKey)
    : blankIndexTsx(componentName, pageLocaleKey);
  const localeContent = isTable
    ? tableLocaleIndexTs(pageLocaleKey, displayName)
    : blankLocaleIndexTs(pageLocaleKey, displayName);
  const styleContent = isTable ? STYLE_TABLE : STYLE_BLANK;

  fs.writeFileSync(path.join(pageRoot, 'index.tsx'), indexContent);
  fs.writeFileSync(path.join(pageRoot, 'style', 'index.module.less'), styleContent);
  fs.writeFileSync(path.join(pageRoot, 'locale', 'index.ts'), localeContent);

  const routeSnippet = options.parentKey
    ? `// in src/routes.ts, append to the children of '${options.parentKey}':
{
  name: '${menuKey}',
  key: '${routeKey}',
},`
    : `// in src/routes.ts, append to the top-level routes array:
{
  name: '${menuKey}',
  key: '${routeKey}',
},`;

  const menuSnippet = `// in src/locale/index.ts, add to BOTH 'en-US' and 'zh-CN' blocks:
'${menuKey}': '${displayName}',  // EN — keep or translate
'${menuKey}': '${displayName}',  // ZH — translate to Chinese`;

  return { pageRoot, routeKey, routeSnippet, menuSnippet };
}
