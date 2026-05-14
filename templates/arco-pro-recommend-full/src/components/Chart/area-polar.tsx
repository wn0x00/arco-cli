import { useMemo } from 'react';
import { VChart, type ISpec } from '@visactor/react-vchart';
import { Spin } from '@arco-design/web-react';

const radarColors = ['#313CA9', '#21CCFF', '#249EFF'];

interface AreaPolarProps {
  /** Rows shaped like `{ item, A, B, C }` — one numeric column per series. */
  data: Array<Record<string, number | string>>;
  loading: boolean;
  /** Numeric columns of `data` to render as separate radar series. */
  fields: string[];
  height: number;
}

function AreaPolar({ data, loading, fields, height }: AreaPolarProps) {
  // Fold `{ item, A, B, C }` into `{ item, category, score }` so each
  // numeric field becomes its own radar series.
  const folded = useMemo(() => {
    const out: Array<{ item: unknown; category: string; score: number }> = [];
    for (const row of data ?? []) {
      for (const f of fields ?? []) {
        out.push({ item: row.item, category: f, score: Number(row[f]) || 0 });
      }
    }
    return out;
  }, [data, fields]);

  const spec: ISpec = {
    type: 'radar' as const,
    data: [{ id: 'radar', values: folded }],
    categoryField: 'item',
    valueField: 'score',
    seriesField: 'category',
    color: radarColors,
    area: { visible: true, style: { fillOpacity: 0.25 } },
    line: { style: { lineWidth: 2 } },
    point: { visible: true, style: { size: 4 } },
    axes: [
      { orient: 'angle' },
      { orient: 'radius', visible: false, min: 0, max: 80 },
    ],
    legends: {
      visible: true,
      orient: 'right',
      item: { shape: { style: { symbolType: 'circle' } } },
    },
    tooltip: {
      mark: {
        content: [
          {
            key: (d: { category: string }) => d.category,
            value: (d: { score: number }) => String(d.score),
          },
        ],
      },
    },
  };

  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <div style={{ width: '100%', height: height || 400 }}>
        <VChart spec={spec} />
      </div>
    </Spin>
  );
}

export default AreaPolar;
