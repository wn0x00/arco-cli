import { Card, Descriptions, Radio, Space, Typography } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import { useThemeStore, type Theme } from '@/store/theme';
import { useLocaleStore, type LocaleCode } from '@/store/locale';
import { useSidebarStore } from '@/store/sidebar';
import locale from './locale';
import styles from './style/index.module.less';

export default function SettingsPage() {
  const t = useLocale(locale);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.set);
  const localeCode = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.set);
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);

  return (
    <Card className={styles.container}>
      <Typography.Title heading={5} style={{ marginTop: 0 }}>
        {t['settings.title']}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{t['settings.subtitle']}</Typography.Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 8 }}>
        <div>
          <Typography.Title heading={6}>{t['settings.theme.title']}</Typography.Title>
          <Radio.Group
            type="button"
            value={theme}
            onChange={(v: Theme) => setTheme(v)}
            options={[
              { label: t['settings.theme.light'], value: 'light' },
              { label: t['settings.theme.dark'], value: 'dark' },
            ]}
          />
        </div>

        <div>
          <Typography.Title heading={6}>{t['settings.locale.title']}</Typography.Title>
          <Radio.Group
            type="button"
            value={localeCode}
            onChange={(v: LocaleCode) => setLocale(v)}
            options={[
              { label: 'English', value: 'en-US' },
              { label: '中文', value: 'zh-CN' },
            ]}
          />
        </div>

        <div>
          <Typography.Title heading={6}>{t['settings.about.title']}</Typography.Title>
          <Descriptions
            colon=":"
            column={1}
            data={[
              { label: t['settings.about.user'], value: t['settings.about.guest'] },
              { label: t['settings.about.theme'], value: theme },
              { label: t['settings.about.locale'], value: localeCode },
              {
                label: t['settings.about.sidebar'],
                value: sidebarCollapsed
                  ? t['settings.about.sidebar.collapsed']
                  : t['settings.about.sidebar.expanded'],
              },
            ]}
          />
        </div>
      </Space>
    </Card>
  );
}
