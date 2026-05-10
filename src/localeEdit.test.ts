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
    expect(updated).not.toBeNull();
    expect(updated).toContain("'menu.user': 'User Center'");
    expect(updated).toContain("'menu.user': '用户中心'");
    // Pre-existing keys are still there.
    expect(updated).toContain("'menu.dashboard': 'Dashboard'");
    expect(updated).toContain("'menu.dashboard': '仪表盘'");
  });

  it('places the new entry immediately before the closing brace of each block', () => {
    const updated = addMenuTranslation(SAMPLE, 'menu.user', 'User Center', '用户中心')!;
    // The new en-US line should sit between the last existing en entry and the
    // closing brace, so it ends up adjacent to the zh-CN block opener.
    const enIdx = updated.indexOf("'menu.user': 'User Center'");
    const zhBlockIdx = updated.indexOf("'zh-CN'");
    expect(enIdx).toBeLessThan(zhBlockIdx);
  });

  it("preserves the file's trailing content (e.g. export default)", () => {
    const updated = addMenuTranslation(SAMPLE, 'menu.user', 'User Center', '用户中心')!;
    expect(updated).toContain('export default i18n;');
  });

  it('returns null if the en-US block cannot be located', () => {
    const broken = `const i18n = { 'fr-FR': {} };\nexport default i18n;\n`;
    expect(addMenuTranslation(broken, 'menu.user', 'a', 'b')).toBeNull();
  });

  it('escapes single quotes in values', () => {
    const updated = addMenuTranslation(SAMPLE, 'menu.user', "User's Page", '用户页')!;
    expect(updated).toContain("'menu.user': 'User\\'s Page'");
  });
});
