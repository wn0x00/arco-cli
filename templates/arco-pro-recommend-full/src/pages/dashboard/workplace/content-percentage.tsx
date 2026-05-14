import { useEffect, useState } from 'react';
import { Card, Spin, Typography } from '@arco-design/web-react';
import { VChart, type ISpec } from '@visactor/react-vchart';
import axios from 'axios';
import useLocale from '@/utils/useLocale';
import locale from './locale';

type Slice = { type: string; count: number };

function PopularContent() {
  const t = useLocale(locale);
  const [data, setData] = useState<Slice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get<Slice[]>('/api/workplace/content-percentage')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const total = data.reduce((a, b) => a + (b.count || 0), 0);

  const spec: ISpec = {
    type: 'pie' as const,
    data: [{ id: 'donut', values: data }],
    valueField: 'count',
    categoryField: 'type',
    color: ['#21CCFF', '#313CA9', '#249EFF'],
    innerRadius: 0.65,
    outerRadius: 0.85,
    label: {
      visible: true,
      position: 'outside',
      formatMethod: (_: unknown, d: Slice) =>
        `${total ? ((d.count / total) * 100).toFixed(0) : 0}%`,
    },
    legends: {
      visible: true,
      orient: 'bottom',
      item: { shape: { style: { symbolType: 'circle' } } },
    },
    tooltip: {
      mark: {
        content: [
          {
            key: 'type',
            value: (d: Slice) => Number(d.count).toLocaleString(),
          },
        ],
      },
    },
  };

  return (
    <Card>
      <Typography.Title heading={6}>
        {t['workplace.contentPercentage']}
      </Typography.Title>
      <Spin loading={loading} style={{ display: 'block' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: '100%', height: 340 }}>
            <VChart spec={spec} />
          </div>
          {/* Center label overlay — uses Arco CSS vars so dark mode tracks. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              bottom: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: 'var(--color-text-1)',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1.6 }}>内容量</span>
            <span style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.2 }}>
              {Number(total).toLocaleString()}
            </span>
          </div>
        </div>
      </Spin>
    </Card>
  );
}

export default PopularContent;
