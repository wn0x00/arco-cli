import { VChart, type ISpec } from '@visactor/react-vchart';
import { Spin } from '@arco-design/web-react';

const lineStops = [
  { offset: 0, color: '#1EE7FF' },
  { offset: 0.57, color: '#249AFF' },
  { offset: 0.85, color: '#6F42FB' },
];
const areaStops = [
  { offset: 0, color: 'rgba(17, 126, 255, 0.5)' },
  { offset: 1, color: 'rgba(17, 128, 255, 0)' },
];

function OverviewAreaLine({
  data,
  loading,
}: {
  data: Array<{ date: string; count: number }>;
  loading: boolean;
}) {
  const spec: ISpec = {
    type: 'area' as const,
    data: [{ id: 'overview', values: data ?? [] }],
    xField: 'date',
    yField: 'count',
    line: {
      visible: true,
      style: {
        curveType: 'monotone',
        lineWidth: 3,
        stroke: {
          gradient: 'linear',
          x0: 0,
          y0: 0.5,
          x1: 1,
          y1: 0.5,
          stops: lineStops,
        },
      },
    },
    area: {
      style: {
        curveType: 'monotone',
        fill: {
          gradient: 'linear',
          x0: 0,
          y0: 0,
          x1: 0,
          y1: 1,
          stops: areaStops,
        },
      },
    },
    point: { visible: false },
    axes: [
      {
        orient: 'left',
        label: { formatMethod: (v) => `${Number(v) / 1000}k` },
      },
    ],
    tooltip: {
      mark: {
        content: [
          {
            key: 'date',
            value: (d: { count: number }) => Number(d.count).toLocaleString(),
          },
        ],
      },
    },
  };

  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <div style={{ width: '100%', height: 300 }}>
        <VChart spec={spec} />
      </div>
    </Spin>
  );
}

export default OverviewAreaLine;
