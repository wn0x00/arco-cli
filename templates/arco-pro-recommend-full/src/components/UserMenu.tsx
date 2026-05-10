import { Avatar, Button, Tooltip } from '@arco-design/web-react';
import { IconUser } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
import locale from '@/locale';

/**
 * Placeholder user menu. Without authentication wired up, the avatar just
 * shows "Guest" and the action button hints at sign-in. Once you run
 * `arco add auth` (planned), this component is replaced with one that
 * reads the real user from the auth store and offers Profile / Sign-out.
 */
export default function UserMenu() {
  const t = useLocale(locale);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Tooltip content={t['app.user.guest']}>
        <Avatar size={28} style={{ backgroundColor: 'var(--color-fill-3)' }}>
          <IconUser />
        </Avatar>
      </Tooltip>
      <Button type="text" size="small">
        {t['app.user.signin']}
      </Button>
    </div>
  );
}
