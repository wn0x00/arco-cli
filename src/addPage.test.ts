import path from 'path';
import os from 'os';
import fs from 'fs';
import { scaffoldPage } from './addPage';

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

    expect(fs.existsSync(path.join(result.pageRoot, 'index.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(result.pageRoot, 'style', 'index.module.less'))).toBe(true);
    expect(fs.existsSync(path.join(result.pageRoot, 'locale', 'index.ts'))).toBe(true);

    const indexContent = fs.readFileSync(path.join(result.pageRoot, 'index.tsx'), 'utf8');
    // PascalCase component name + camelCase locale key derived from kebab-case input.
    expect(indexContent).toMatch(/function UserList\(\)/);
    expect(indexContent).toMatch(/t\['userList\.title'\]/);
  });

  it('writes table-page files with extra Table imports and locale keys', () => {
    const result = scaffoldPage({ name: 'data-analysis', type: 'table', root: tempRoot });

    const indexContent = fs.readFileSync(path.join(result.pageRoot, 'index.tsx'), 'utf8');
    expect(indexContent).toMatch(/Table/);
    expect(indexContent).toMatch(/IconPlus/);

    const localeContent = fs.readFileSync(path.join(result.pageRoot, 'locale', 'index.ts'), 'utf8');
    expect(localeContent).toMatch(/'dataAnalysis\.column\.id'/);
    expect(localeContent).toMatch(/'dataAnalysis\.action\.create'/);
    expect(localeContent).toMatch(/'en-US'/);
    expect(localeContent).toMatch(/'zh-CN'/);
  });

  it('returns snippets that reference the kebab-case key and camelCase i18n key', () => {
    const result = scaffoldPage({ name: 'user-list', type: 'blank', root: tempRoot });

    expect(result.routeSnippet).toMatch(/key: 'user-list'/);
    expect(result.routeSnippet).toMatch(/name: 'menu\.userList'/);
    expect(result.menuSnippet).toMatch(/'menu\.userList'/);
  });

  it('rejects names that are not kebab-case', () => {
    expect(() => scaffoldPage({ name: 'UserList', type: 'blank', root: tempRoot })).toThrow(
      /Invalid page name/
    );
    expect(() => scaffoldPage({ name: 'user_list', type: 'blank', root: tempRoot })).toThrow(
      /Invalid page name/
    );
    expect(() => scaffoldPage({ name: 'user/list', type: 'blank', root: tempRoot })).toThrow(
      /Invalid page name/
    );
  });

  it('refuses to overwrite an existing page directory', () => {
    fs.mkdirSync(path.join(tempRoot, 'src', 'pages', 'existing'), { recursive: true });
    expect(() => scaffoldPage({ name: 'existing', type: 'blank', root: tempRoot })).toThrow(
      /Page already exists/
    );
  });
});
