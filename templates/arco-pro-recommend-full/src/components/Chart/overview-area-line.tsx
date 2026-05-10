import { Area } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';
import useChartTheme from '@/utils/useChartTheme';

function OverviewAreaLine({
  data,
  loading,
}: {
  data?: Array<{ date: string; count: number }>;
  loading: boolean;
  name?: string;
  color?: string;
}) {
  const theme = useChartTheme();
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Area
        theme={theme}
        autoFit
        height={300}
        data={data ?? []}
        xField="date"
        yField="count"
        shapeField="smooth"
        line={{
          shapeField: 'smooth',
          style: {
            // G2 gradient syntax: `l(angle) stop:color ...`. The line ranges
            // from cyan on the left, through blue, to purple on the right —
            // matching the upstream arco-design-pro hero chart.
            stroke: 'l(0) 0:#1EE7FF 0.57:#249AFF 0.85:#6F42FB',
            lineWidth: 3,
          },
        }}
        style={{
          fill: 'l(270) 0:rgba(17, 126, 255, 0.4) 1:rgba(17, 128, 255, 0)',
          fillOpacity: 0.6,
        }}
        scale={{
          // Let the y axis auto-fit to the data range, like the upstream chart
          // — start above 0 so the curve uses the visible band.
          count: { nice: true },
        }}
        axis={{
          y: {
            labelFormatter: (text: number) => `${text / 1000}k`,
            grid: true,
            gridLineDash: [4, 4],
          },
          x: {
            grid: true,
            gridStroke: '#E5E8EF',
            // Keep x-axis labels horizontal — without this v2 rotates them
            // vertically once they crowd, which doesn't match the upstream look.
            labelAutoRotate: false,
            labelAutoHide: true,
          },
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
