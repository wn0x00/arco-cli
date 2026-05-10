import { Line } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';

const lineColor = ['#21CCFF', '#313CA9', '#249EFF'];

function PeriodLine({
  data,
  loading,
}: {
  data?: Array<{ time: string; rate: number; name: string }>;
  loading: boolean;
}) {
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Line
        autoFit
        height={370}
        data={data ?? []}
        xField="time"
        yField="rate"
        colorField="name"
        scale={{ color: { range: lineColor } }}
        smooth
        slider={{ x: { values: [0, 1] } }}
        legend={{ color: { itemMarker: 'circle' } }}
        axis={{
          y: { labelFormatter: (v: number) => `${v} %` },
        }}
        tooltip={{ channel: 'y' }}
      />
    </Spin>
  );
}

export default PeriodLine;
