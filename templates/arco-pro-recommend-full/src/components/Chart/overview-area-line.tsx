import { Area } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';

function OverviewAreaLine({
  data,
  loading,
}: {
  data?: Array<{ date: string; count: number }>;
  loading: boolean;
  name?: string;
  color?: string;
}) {
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Area
        autoFit
        height={300}
        data={data ?? []}
        xField="date"
        yField="count"
        shapeField="smooth"
        line={{ shapeField: 'smooth', style: { lineWidth: 3 } }}
        style={{
          // G2 gradient syntax: `l(angle) stop:color ...`
          fill: 'l(270) 0:rgba(17, 126, 255, 0.5) 1:rgba(17, 128, 255, 0)',
          stroke: 'l(0) 0:#1EE7FF 0.57:#249AFF 0.85:#6F42FB',
        }}
        axis={{
          y: {
            labelFormatter: (text: number) => `${text / 1000}k`,
            grid: true,
            gridLineDash: [4, 4],
          },
          x: { grid: true, gridStroke: '#E5E8EF' },
        }}
        tooltip={{
          items: [
            { field: 'count', valueFormatter: (v: number) => Number(v).toLocaleString() },
          ],
        }}
      />
    </Spin>
  );
}

export default OverviewAreaLine;
