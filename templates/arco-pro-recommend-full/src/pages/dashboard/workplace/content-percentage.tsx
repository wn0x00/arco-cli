import { useEffect, useState } from 'react';
import { Card, Spin, Typography } from '@arco-design/web-react';
import { Pie } from '@ant-design/charts';
import axios from 'axios';
import useLocale from '@/utils/useLocale';
import locale from './locale';

type Slice = { type: string; count: number };

function PopularContent() {
  const t = useLocale(locale);
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
        <Pie
          autoFit
          height={340}
          data={data}
          angleField="count"
          colorField="type"
          innerRadius={0.65}
          radius={0.7}
          scale={{ color: { range: ['#21CCFF', '#313CA9', '#249EFF'] } }}
          label={{
            text: (d: { count: number }) =>
              `${total ? ((d.count / total) * 100).toFixed(0) : 0}%`,
            position: 'outside',
            style: { fill: '#86909C', fontSize: 14 },
          }}
          legend={{ color: { position: 'bottom' } }}
          annotations={[
            {
              type: 'text',
              style: {
                text: `内容量\n${Number(total).toLocaleString()}`,
                x: '50%',
                y: '50%',
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 500,
              },
            },
          ]}
          interaction={{ elementSelect: true }}
        />
      </Spin>
    </Card>
  );
}

export default PopularContent;
