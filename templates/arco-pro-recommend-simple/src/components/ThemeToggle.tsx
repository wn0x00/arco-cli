import { Button, Tooltip } from '@arco-design/web-react';
import { IconMoonFill, IconSunFill } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
import { useThemeStore } from '@/store/theme';
import locale from '@/locale';

export default function ThemeToggle() {
  const t = useLocale(locale);
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === 'dark';

  return (
    <Tooltip content={t[isDark ? 'app.theme.light' : 'app.theme.dark']}>
      <Button
        type="text"
        shape="circle"
        icon={isDark ? <IconSunFill /> : <IconMoonFill />}
        onClick={toggle}
      />
    </Tooltip>
  );
}
