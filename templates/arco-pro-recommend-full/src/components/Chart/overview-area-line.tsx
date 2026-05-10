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
        smooth
        line={{ size: 3 }}
        style={{
          fill: 'linear-gradient(180deg, rgba(17, 126, 255, 0.5), rgba(17, 128, 255, 0))',
          stroke: 'linear-gradient(0deg, #1EE7FF, #249AFF, #6F42FB)',
        }}
        axis={{
          y: {
            labelFormatter: (text: number) => `${text / 1000}k`,
            grid: { lineDash: [4, 4] },
          },
          x: { grid: { stroke: '#E5E8EF' } },
        }}
        tooltip={{ items: [{ field: 'count', name: 'Count' }] }}
      />
    </Spin>
  );
}

export default OverviewAreaLine;
