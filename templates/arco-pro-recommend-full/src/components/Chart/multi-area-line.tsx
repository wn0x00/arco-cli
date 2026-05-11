import { VChart } from '@visactor/react-vchart';
import { Spin } from '@arco-design/web-react';

const lineColors = ['#722ED1', '#33D1C9', '#F77234', '#165DFF'];

function MultiAreaLine({
  data,
  loading,
}: {
  data: Array<{ time: string; count: number; name: string }>;
  loading: boolean;
}) {
  const spec = {
    type: 'area' as const,
    data: [{ id: 'multi', values: data ?? [] }],
    xField: 'time',
    yField: 'count',
    seriesField: 'name',
    stack: false,
    color: lineColors,
    line: { visible: true, style: { curveType: 'monotone', lineWidth: 2 } },
    area: { style: { curveType: 'monotone', fillOpacity: 0.3 } },
    point: { visible: false },
    axes: [
      { orient: 'left', label: { formatMethod: (v: number) => `${Number(v) / 100} k` } },
      { orient: 'bottom' },
    ],
    legends: { visible: false },
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
      <div style={{ width: '100%', height: 352 }}>
        <VChart spec={spec} />
      </div>
    </Spin>
  );
}

export default MultiAreaLine;
