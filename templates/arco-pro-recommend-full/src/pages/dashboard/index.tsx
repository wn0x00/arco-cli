import { useEffect, useState } from 'react';
import { Card, Grid, Statistic, Space, Spin, Typography } from '@arco-design/web-react';
import {
  IconUser,
  IconUserAdd,
  IconStorage,
  IconTags,
} from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
import { request } from '@/utils/request';
import locale from './locale';
import styles from './style/index.module.less';

const { Row, Col } = Grid;

type Stats = {
  activeUsers: number;
  newSignups: number;
  revenueToday: number;
  pendingTickets: number;
};

export default function Dashboard() {
  const t = useLocale(locale);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request
      .get<Stats>('/dashboard/stats')
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <Typography.Title heading={5}>{t['dashboard.title']}</Typography.Title>
      <Typography.Paragraph type="secondary">{t['dashboard.subtitle']}</Typography.Paragraph>

      <Spin loading={loading} block>
        <Row gutter={16} className={styles.row}>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Space>
                <IconUser className={styles.icon} />
                <Statistic
                  title={t['dashboard.stat.activeUsers']}
                  value={stats?.activeUsers ?? 0}
                  groupSeparator
                />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Space>
                <IconUserAdd className={styles.icon} />
                <Statistic title={t['dashboard.stat.newSignups']} value={stats?.newSignups ?? 0} />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Space>
                <IconStorage className={styles.icon} />
                <Statistic
                  title={t['dashboard.stat.revenueToday']}
                  value={stats?.revenueToday ?? 0}
                  precision={2}
                  prefix="$"
                />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Space>
                <IconTags className={styles.icon} />
                <Statistic
                  title={t['dashboard.stat.pendingTickets']}
                  value={stats?.pendingTickets ?? 0}
                />
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>

      <Card title={t['dashboard.welcome.title']} className={styles.welcome}>
        <Typography.Paragraph>{t['dashboard.welcome.body']}</Typography.Paragraph>
      </Card>
    </div>
  );
}
