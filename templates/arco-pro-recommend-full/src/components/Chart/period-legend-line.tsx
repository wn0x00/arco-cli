import { VChart, type ISpec } from '@visactor/react-vchart';
import { Spin } from '@arco-design/web-react';

const lineColor = ['#21CCFF', '#313CA9', '#249EFF'];

function PeriodLine({
  data,
  loading,
}: {
  data: Array<{ time: string; rate: number; name: string }>;
  loading: boolean;
}) {
  const spec: ISpec = {
    type: 'line' as const,
    data: [{ id: 'series', values: data ?? [] }],
    xField: 'time',
    yField: 'rate',
    seriesField: 'name',
    color: lineColor,
    line: { style: { curveType: 'monotone', lineWidth: 2 } },
    point: { visible: false },
    axes: [
      { orient: 'left', label: { formatMethod: (v) => `${v} %` } },
      { orient: 'bottom' },
    ],
    legends: {
      visible: true,
      orient: 'bottom',
      item: { shape: { style: { symbolType: 'circle' } } },
    },
    dataZoom: [{ orient: 'bottom' }],
    tooltip: {
      mark: {
        content: [
          {
            key: (d: { name: string }) => d.name,
            value: (d: { rate: number }) => `${d.rate} %`,
          },
        ],
      },
    },
  };

  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <div style={{ width: '100%', height: 370 }}>
        <VChart spec={spec} />
      </div>
    </Spin>
  );
}

export default PeriodLine;
