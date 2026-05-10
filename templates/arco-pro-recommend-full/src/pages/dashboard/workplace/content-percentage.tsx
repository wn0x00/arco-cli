import { useEffect, useState } from 'react';
import { Card, Spin, Typography } from '@arco-design/web-react';
import { Pie } from '@ant-design/charts';
import axios from 'axios';
import useLocale from '@/utils/useLocale';
import useChartTheme from '@/utils/useChartTheme';
import locale from './locale';

type Slice = { type: string; count: number };

function PopularContent() {
  const t = useLocale(locale);
  const theme = useChartTheme();
  const [data, setData] = useState<Slice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    axios
      .get<Slice[]>('/api/workplace/content-percentage')
      .then((res) => {
        setData(res.data);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const total = data.reduce((a, b) => a + (b.count || 0), 0);

  return (
    <Card>
      <Typography.Title heading={6}>{t['workplace.contentPercentage']}</Typography.Title>
      <Spin loading={loading} style={{ display: 'block' }}>
        <div style={{ position: 'relative' }}>
          <Pie
            theme={theme}
            autoFit
            height={340}
            data={data}
            angleField="count"
            colorField="type"
            // The original BizCharts DonutChart accepted these as a thin band
            // but @ant-design/charts treats them as raw inner/outer fractions
            // — widen to a clearly visible ring like the upstream demo.
            innerRadius={0.6}
            radius={0.85}
            scale={{ color: { range: ['#21CCFF', '#313CA9', '#249EFF'] } }}
            label={{
              text: (d: { count: number }) =>
                `${total ? ((d.count / total) * 100).toFixed(0) : 0}%`,
              position: 'spider',
              connector: true,
              connectorLength: 12,
              style: { fill: '#86909C', fontSize: 14 },
            }}
            legend={{ color: { position: 'bottom', itemMarker: 'circle' } }}
            interaction={{ elementSelect: true }}
          />
          {/* Center label inside the donut — annotations API doesn't render
              text reliably on Pie in v2, so use a positioned HTML overlay. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 60, // above the bottom legend
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
