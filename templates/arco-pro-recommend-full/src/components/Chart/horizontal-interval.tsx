import { VChart, type ISpec } from '@visactor/react-vchart';
import { Spin } from '@arco-design/web-react';

function HorizontalInterval({
  data,
  loading,
  height,
}: {
  data: Array<{ name: string; count: number }>;
  loading: boolean;
  height?: number;
}) {
  const values = data ?? [];
  const spec: ISpec = {
    type: 'bar' as const,
    direction: 'horizontal' as const,
    data: [{ id: 'bars', values }],
    xField: 'count',
    yField: 'name',
    barWidth: 10,
    // Pill shape — cornerRadius >= half-height fully rounds both ends,
    // matching the BizCharts custom `border-radius` original.
    bar: { style: { fill: '#4086FF', cornerRadius: 999 } },
    axes: [
      { orient: 'left' },
      {
        orient: 'bottom',
        label: { formatMethod: (v) => `${Number(v) / 1000}k` },
      },
    ],
    tooltip: {
      mark: {
        content: [
          {
            key: 'name',
            value: (d: { count: number }) => Number(d.count).toLocaleString(),
          },
        ],
      },
    },
  };

  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <div style={{ width: '100%', height: height || 370 }}>
        {values.length > 0 && <VChart spec={spec} />}
      </div>
    </Spin>
  );
}

export default HorizontalInterval;
