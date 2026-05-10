import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { scaffoldPage } from './scaffold';

describe('scaffoldPage', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arco-cli-addpage-'));
    fs.mkdirSync(path.join(tempRoot, 'src', 'pages'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('writes blank-page files with the expected names and casing', () => {
    const result = scaffoldPage({ name: 'user-list', type: 'blank', root: tempRoot });

    assert.equal(fs.existsSync(path.join(result.pageRoot, 'index.tsx')), true);
    assert.equal(fs.existsSync(path.join(result.pageRoot, 'style', 'index.module.less')), true);
    assert.equal(fs.existsSync(path.join(result.pageRoot, 'locale', 'index.ts')), true);

    const indexContent = fs.readFileSync(path.join(result.pageRoot, 'index.tsx'), 'utf8');
    // PascalCase component name + camelCase locale key derived from kebab-case input.
    assert.match(indexContent, /function UserList\(\)/);
    assert.match(indexContent, /t\['userList\.title'\]/);
  });

  it('writes table-page files with extra Table imports and locale keys', () => {
    const result = scaffoldPage({ name: 'data-analysis', type: 'table', root: tempRoot });

    const indexContent = fs.readFileSync(path.join(result.pageRoot, 'index.tsx'), 'utf8');
    assert.match(indexContent, /Table/);
    assert.match(indexContent, /IconPlus/);

    const localeContent = fs.readFileSync(path.join(result.pageRoot, 'locale', 'index.ts'), 'utf8');
    assert.match(localeContent, /'dataAnalysis\.column\.id'/);
    assert.match(localeContent, /'dataAnalysis\.action\.create'/);
    assert.match(localeContent, /'en-US'/);
    assert.match(localeContent, /'zh-CN'/);
  });

  it('returns snippets that reference the kebab-case key and camelCase i18n key', () => {
    const result = scaffoldPage({ name: 'user-list', type: 'blank', root: tempRoot });

    assert.equal(result.routeKey, 'user-list');
    assert.match(result.routeSnippet, /key: 'user-list'/);
    assert.match(result.routeSnippet, /name: 'menu\.userList'/);
    assert.match(result.menuSnippet, /'menu\.userList'/);
  });

  it('writes nested files and namespaced keys when parentKey is set', () => {
    const result = scaffoldPage({
      name: 'user-list',
      type: 'blank',
      root: tempRoot,
      parentKey: 'dashboard',
    });

    // Files land under src/pages/<parent>/<name>/, mirroring the URL
    // hierarchy so the App.tsx lazy resolver can find them.
    const expected = path.join(tempRoot, 'src', 'pages', 'dashboard', 'user-list');
    assert.equal(result.pageRoot, expected);
    assert.equal(fs.existsSync(path.join(expected, 'index.tsx')), true);

    // Route key and menu i18n key are namespaced under the parent.
    assert.equal(result.routeKey, 'dashboard/user-list');
    assert.match(result.routeSnippet, /key: 'dashboard\/user-list'/);
    assert.match(result.routeSnippet, /name: 'menu\.dashboard\.userList'/);
    assert.match(result.menuSnippet, /'menu\.dashboard\.userList'/);
  });

  it('rejects an invalid parentKey', () => {
    assert.throws(
      () =>
        scaffoldPage({
          name: 'foo',
          type: 'blank',
          root: tempRoot,
          parentKey: 'BadParent',
        }),
      /Invalid parent key/
    );
  });

  it('rejects names that are not kebab-case', () => {
    assert.throws(
      () => scaffoldPage({ name: 'UserList', type: 'blank', root: tempRoot }),
      /Invalid page name/
    );
    assert.throws(
      () => scaffoldPage({ name: 'user_list', type: 'blank', root: tempRoot }),
      /Invalid page name/
    );
    assert.throws(
      () => scaffoldPage({ name: 'user/list', type: 'blank', root: tempRoot }),
      /Invalid page name/
    );
  });

  it('refuses to overwrite an existing page directory', () => {
    fs.mkdirSync(path.join(tempRoot, 'src', 'pages', 'existing'), { recursive: true });
    assert.throws(
      () => scaffoldPage({ name: 'existing', type: 'blank', root: tempRoot }),
      /Page already exists/
    );
  });
});
