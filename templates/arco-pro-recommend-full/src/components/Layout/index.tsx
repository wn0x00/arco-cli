import { Layout as ArcoLayout, Menu, Breadcrumb, Button } from '@arco-design/web-react';
import {
  IconMenuFold,
  IconMenuUnfold,
  IconDashboard,
  IconList,
  IconFile,
  IconSettings,
} from '@arco-design/web-react/icon';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useLocale from '@/utils/useLocale';
import { useSidebarStore } from '@/store/sidebar';
import { routes, type IRoute } from '@/routes';
import locale from '@/locale';
import ThemeToggle from '@/components/ThemeToggle';
import LocaleToggle from '@/components/LocaleToggle';
import UserMenu from '@/components/UserMenu';
import styles from './style.module.less';

const { Sider, Header, Content } = ArcoLayout;

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <IconDashboard />,
  list: <IconList />,
  form: <IconFile />,
  settings: <IconSettings />,
};

function renderMenuItems(items: IRoute[], t: Record<string, string>) {
  return items.map((item) => {
    if (item.ignore) return null;
    if (item.children?.length) {
      return (
        <Menu.SubMenu
          key={item.key}
          title={
            <span>
              {ICONS[item.key]}
              {t[item.name] ?? item.name}
            </span>
          }
        >
          {renderMenuItems(item.children, t)}
        </Menu.SubMenu>
      );
    }
    return (
      <Menu.Item key={item.key}>
        {ICONS[item.key]}
        {t[item.name] ?? item.name}
      </Menu.Item>
    );
  });
}

export default function Layout() {
  const t = useLocale(locale);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = location.pathname.replace(/^\//, '') || 'dashboard';

  // Build breadcrumb from the active path segments.
  const segments = activeKey.split('/').filter(Boolean);
  const crumbs = segments.map((seg) => t[`menu.${seg}`] ?? seg);

  return (
    <ArcoLayout className={styles.layout}>
      <Sider
        collapsed={collapsed}
        collapsible
        trigger={null}
        breakpoint="xl"
        className={styles.sider}
        width={220}
      >
        <div className={styles.logo}>{collapsed ? 'A' : 'Arco Pro'}</div>
        <Menu
          selectedKeys={[activeKey]}
          autoOpen
          style={{ width: '100%' }}
          onClickMenuItem={(key) => navigate(`/${key}`)}
        >
          {renderMenuItems(routes, t)}
        </Menu>
      </Sider>
      <ArcoLayout>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
            onClick={toggleSidebar}
          />
          <Breadcrumb className={styles.breadcrumb}>
            {crumbs.map((c) => (
              <Breadcrumb.Item key={c}>{c}</Breadcrumb.Item>
            ))}
          </Breadcrumb>
          <div className={styles.headerActions}>
            <LocaleToggle />
            <ThemeToggle />
            <UserMenu />
          </div>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </ArcoLayout>
    </ArcoLayout>
  );
}
