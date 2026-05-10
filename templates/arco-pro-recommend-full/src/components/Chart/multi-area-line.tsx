import { Area } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';

const lineColorMap = ['#722ED1', '#33D1C9', '#F77234', '#165DFF'];

// Soft gradient fills under each line (BizCharts → G2 gradient syntax).
const areaColorMap = [
  'l(270) 0:rgba(131, 100, 255, 0.5) 1:rgba(80, 52, 255, 0.001)',
  'l(270) 0:rgba(100, 255, 236, 0.5) 1:rgba(52, 255, 243, 0.001)',
  'l(270) 0:rgba(255, 211, 100, 0.5) 1:rgba(255, 235, 52, 0.001)',
  'l(270) 0:rgba(100, 162, 255, 0.5) 1:rgba(52, 105, 255, 0.001)',
];

function MultiAreaLine({
  data,
  loading,
}: {
  data?: Array<{ time: string; count: number; name: string }>;
  loading: boolean;
}) {
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Area
        autoFit
        height={352}
        data={data ?? []}
        xField="time"
        yField="count"
        colorField="name"
        scale={{ color: { range: lineColorMap } }}
        shapeField="smooth"
        line={{ shapeField: 'smooth', style: { lineWidth: 2 } }}
        style={{
          fill: ({ name }: { name: string }) => {
            const i = ['line1', 'line2', 'line3', 'line4'].indexOf(name);
            return areaColorMap[i >= 0 ? i : 0];
          },
        }}
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
