import path from 'path';
import fs from 'fs-extra';

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
 */
export function scaffoldPage(options: AddPageOptions): ScaffoldResult {
  if (!NAME_PATTERN.test(options.name)) {
    throw new Error(
      `Invalid page name "${options.name}". Use kebab-case, e.g. "user-list" or "data-analysis".`
    );
  }

  const componentName = toPascalCase(options.name);
  const localeKey = camelFromKebab(options.name);
  const displayName = displayFromKebab(options.name);

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
