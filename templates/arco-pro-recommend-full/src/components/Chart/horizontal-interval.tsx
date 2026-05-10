import { Bar } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';

function HorizontalInterval({
  data,
  loading,
  height,
}: {
  data?: Array<{ name: string; count: number }>;
  loading: boolean;
  height?: number;
}) {
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Bar
        autoFit
        height={height || 370}
        data={data ?? []}
        xField="count"
        yField="name"
        sort={{ reverse: true }}
        style={{
          fill: '#4086FF',
          radius: 5,
          maxWidth: 12,
        }}
        axis={{
          x: { labelFormatter: (v: number) => `${v / 1000}k` },
        }}
      />
    </Spin>
  );
}

export default HorizontalInterval;
