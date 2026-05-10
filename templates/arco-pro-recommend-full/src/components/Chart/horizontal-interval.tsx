import { Bar } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';
import useChartTheme from '@/utils/useChartTheme';

function HorizontalInterval({
  data,
  loading,
  height,
}: {
  data?: Array<{ name: string; count: number }>;
  loading: boolean;
  height?: number;
}) {
  const theme = useChartTheme();
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Bar
        theme={theme}
        autoFit
        height={height || 370}
        data={data ?? []}
        xField="name"
        yField="count"
        sort={{ reverse: true, by: 'y' }}
        style={{
          fill: '#4086FF',
          // BizCharts version drew much thicker bars; live demo's bars are
          // ~25-30px tall. Match by lifting maxWidth to 24.
          maxWidth: 24,
          radiusTopLeft: 12,
          radiusTopRight: 12,
          radiusBottomLeft: 12,
          radiusBottomRight: 12,
        }}
        axis={{
          y: { labelFormatter: (v: number) => `${v / 1000}k` },
        }}
        tooltip={{
          items: [{ field: 'count', valueFormatter: (v: number) => Number(v).toLocaleString() }],
        }}
      />
    </Spin>
  );
}

export default HorizontalInterval;
