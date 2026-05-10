import { Dropdown, Button, Menu } from '@arco-design/web-react';
import { IconLanguage } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
import { useLocaleStore, type LocaleCode } from '@/store/locale';
import locale from '@/locale';

const OPTIONS: LocaleCode[] = ['en-US', 'zh-CN'];

export default function LocaleToggle() {
  const t = useLocale(locale);
  const current = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.set);

  const overlay = (
    <Menu onClickMenuItem={(key) => setLocale(key as LocaleCode)} selectedKeys={[current]}>
      {OPTIONS.map((code) => (
        <Menu.Item key={code}>{t[`app.locale.${code}`]}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Dropdown droplist={overlay} trigger="click" position="br">
      <Button type="text" shape="circle" icon={<IconLanguage />} />
    </Dropdown>
  );
}
