import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addMenuTranslation } from './localeEdit';

const SAMPLE = `const i18n = {
  'en-US': {
    'menu.dashboard': 'Dashboard',
    'menu.list': 'List',
  },
  'zh-CN': {
    'menu.dashboard': '仪表盘',
    'menu.list': '列表',
  },
};

export default i18n;
`;

describe('addMenuTranslation', () => {
  it('inserts the new key into both en-US and zh-CN blocks', () => {
    const updated = addMenuTranslation(SAMPLE, 'menu.user', 'User Center', '用户中心');
    assert.notEqual(updated, null);
    assert.match(updated!, /'menu\.user': 'User Center'/);
    assert.match(updated!, /'menu\.user': '用户中心'/);
    // Pre-existing keys are still there.
    assert.match(updated!, /'menu\.dashboard': 'Dashboard'/);
    assert.match(updated!, /'menu\.dashboard': '仪表盘'/);
  });

  it('places the new entry immediately before the closing brace of each block', () => {
    const updated = addMenuTranslation(SAMPLE, 'menu.user', 'User Center', '用户中心')!;
    // The new en-US line should sit between the last existing en entry and the
    // closing brace, so it ends up adjacent to the zh-CN block opener.
    const enIdx = updated.indexOf("'menu.user': 'User Center'");
    const zhBlockIdx = updated.indexOf("'zh-CN'");
    assert.ok(enIdx < zhBlockIdx, 'en entry must precede zh block opener');
  });

  it("preserves the file's trailing content (e.g. export default)", () => {
    const updated = addMenuTranslation(SAMPLE, 'menu.user', 'User Center', '用户中心')!;
    assert.match(updated, /export default i18n;/);
  });

  it('returns null if the en-US block cannot be located', () => {
    const broken = `const i18n = { 'fr-FR': {} };\nexport default i18n;\n`;
    assert.equal(addMenuTranslation(broken, 'menu.user', 'a', 'b'), null);
  });

  it('escapes single quotes in values', () => {
    const updated = addMenuTranslation(SAMPLE, 'menu.user', "User's Page", '用户页')!;
    assert.match(updated, /'menu\.user': 'User\\'s Page'/);
  });
});
