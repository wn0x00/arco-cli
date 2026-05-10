import { Area } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';

const lineColorMap = ['#722ED1', '#33D1C9', '#F77234', '#165DFF'];

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
        smooth
        line={{ size: 2 }}
        legend={false}
        axis={{
          y: { labelFormatter: (v: number) => `${v / 100} k` },
        }}
        tooltip={{ channel: 'y', valueFormatter: (v: number) => Number(v).toLocaleString() }}
      />
    </Spin>
  );
}

export default MultiAreaLine;
