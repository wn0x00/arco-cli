import { Column } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';
import useChartTheme from '@/utils/useChartTheme';

const colorRange = ['#81E2FF', '#00B2FF', '#246EFF'];

function MultiInterval({
  data,
  loading,
}: {
  data?: Array<{ time: string; count: number; name: string }>;
  loading: boolean;
}) {
  const theme = useChartTheme();
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Column
        theme={theme}
        autoFit
        height={370}
        data={data ?? []}
        xField="time"
        yField="count"
        colorField="name"
        scale={{ color: { range: colorRange } }}
        stack
        style={{ maxWidth: 16, radiusTopLeft: 2, radiusTopRight: 2 }}
        legend={{ color: { itemMarker: 'circle' } }}
        axis={{
          y: { labelFormatter: (v: number) => `${v / 1000}k` },
        }}
      />
    </Spin>
  );
}

export default MultiInterval;
