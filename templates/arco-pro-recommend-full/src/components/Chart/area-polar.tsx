import { Radar } from '@ant-design/charts';
import { Spin } from '@arco-design/web-react';
import useChartTheme from '@/utils/useChartTheme';

interface AreaPolarProps {
  /** Each row has one numeric column per field plus an `item` label. */
  data?: Array<Record<string, number | string>>;
  loading: boolean;
  /** Numeric columns of `data` to fold into one series each. */
  fields: string[];
  height: number;
}

const colors = ['#313CA9', '#21CCFF', '#249EFF'];

function AreaPolar(props: AreaPolarProps) {
  const { data, loading, fields, height } = props;
  const theme = useChartTheme();

  // Replace the @antv/data-set "fold" transform with a plain JS pivot:
  // turn { item, A, B, C } rows into { item, category, score } rows.
  const folded: Array<{ item: unknown; category: string; score: number }> = [];
  for (const row of data ?? []) {
    for (const f of fields) {
      folded.push({ item: row.item, category: f, score: Number(row[f]) || 0 });
    }
  }

  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Radar
        theme={theme}
        autoFit
        height={height || 400}
        data={folded}
        xField="item"
        yField="score"
        colorField="category"
        scale={{
          color: { range: colors },
          y: { domain: [0, 80] },
        }}
        area={{ style: { fillOpacity: 0.4 } }}
        line={{ size: 2 }}
        legend={{ color: { position: 'right', itemMarker: 'circle' } }}
        axis={{ y: { label: false } }}
      />
    </Spin>
  );
}

export default AreaPolar;
