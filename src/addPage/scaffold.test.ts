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

    assert.match(result.routeSnippet, /key: 'user-list'/);
    assert.match(result.routeSnippet, /name: 'menu\.userList'/);
    assert.match(result.menuSnippet, /'menu\.userList'/);
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
