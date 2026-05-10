import { Area } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';
import useChartTheme from '@/utils/useChartTheme';

const lineColorMap = ['#722ED1', '#33D1C9', '#F77234', '#165DFF'];

function MultiAreaLine({
  data,
  loading,
}: {
  data?: Array<{ time: string; count: number; name: string }>;
  loading: boolean;
}) {
  const theme = useChartTheme();
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Area
        theme={theme}
        autoFit
        height={352}
        data={data ?? []}
        xField="time"
        yField="count"
        colorField="name"
        scale={{ color: { range: lineColorMap } }}
        shapeField="smooth"
        // Light, near-transparent area fill so the line stays the focal point.
        // Each series gets the same opacity over its colorField-resolved hue.
        style={{ fillOpacity: 0.18, lineWidth: 2 }}
        line={{ shapeField: 'smooth', style: { lineWidth: 2 } }}
        legend={false}
        axis={{
          y: { labelFormatter: (v: number) => `${v / 100} k` },
        }}
        tooltip={{
          items: [{ field: 'count', valueFormatter: (v: number) => Number(v).toLocaleString() }],
        }}
      />
    </Spin>
  );
}

export default MultiAreaLine;
