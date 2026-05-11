import { VChart } from '@visactor/react-vchart';
import { Spin } from '@arco-design/web-react';

const stackColors = ['#81E2FF', '#00B2FF', '#246EFF'];

function MultiInterval({
  data,
  loading,
}: {
  data: Array<{ time: string; count: number; name: string }>;
  loading: boolean;
}) {
  const values = data ?? [];
  const spec = {
    type: 'bar' as const,
    data: [{ id: 'stack', values }],
    xField: 'time',
    yField: 'count',
    seriesField: 'name',
    stack: true,
    color: stackColors,
    bar: { style: { cornerRadius: [2, 2, 0, 0] } },
    axes: [
      { orient: 'left', label: { formatMethod: (v: number) => `${Number(v) / 1000}k` } },
      { orient: 'bottom' },
    ],
    legends: { visible: true, orient: 'bottom', item: { shape: { style: { symbolType: 'circle' } } } },
    tooltip: {
      mark: {
        content: [
          { key: (d: { name: string }) => d.name, value: (d: { count: number }) => Number(d.count).toLocaleString() },
        ],
      },
    },
  };

  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <div style={{ width: '100%', height: 370 }}>
        {/* Bar charts in VChart 2.0.22 don't bind their band-axis scale
            when mounted with empty data — gate render until data arrives. */}
        {values.length > 0 && <VChart spec={spec} />}
      </div>
    </Spin>
  );
}

export default MultiInterval;
