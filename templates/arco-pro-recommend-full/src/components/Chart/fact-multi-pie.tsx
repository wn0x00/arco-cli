import { useMemo } from 'react';
import { VChart, type ISpec } from '@visactor/react-vchart';
import { Grid } from '@arco-design/web-react';

const colors = ['#249EFF', '#846BCE', '#21CCFF', '#86DF6C', '#0E42D2'];

interface Item {
  type: string;
  value: number;
  name: string;
  category: string;
}

interface FactMultiPieProps {
  data: Item[];
  loading: boolean;
  height: number;
}

function Donut({ rows, title }: { rows: Item[]; title: string }) {
  const spec: ISpec = {
    type: 'pie' as const,
    data: [{ id: 'donut', values: rows }],
    valueField: 'value',
    categoryField: 'type',
    color: colors,
    innerRadius: 0.7,
    outerRadius: 0.85,
    label: {
      visible: true,
      formatMethod: (_: unknown, d: Item) => `${(d.value * 100).toFixed(0)}%`,
    },
    legends: { visible: false },
    tooltip: {
      mark: {
        content: [
          { key: 'type', value: (d: Item) => `${(d.value * 100).toFixed(2)}%` },
        ],
      },
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <VChart spec={spec} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          color: 'var(--color-text-1)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {title}
      </div>
    </div>
  );
}

function FactMultiPie({ data, loading, height }: FactMultiPieProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const row of data ?? []) {
      const existing = map.get(row.category);
      if (existing) {
        existing.push(row);
      } else {
        map.set(row.category, [row]);
      }
    }
    return Array.from(map.entries());
  }, [data]);

  const span = grouped.length > 0 ? Math.floor(24 / grouped.length) : 24;
  const h = height || 400;

  return (
    <div style={{ width: '100%', height: h, opacity: loading ? 0.5 : 1 }}>
      <Grid.Row gutter={12} style={{ height: '100%' }}>
        {grouped.map(([cat, rows]) => (
          <Grid.Col key={cat} span={span} style={{ height: '100%' }}>
            <Donut rows={rows} title={cat} />
          </Grid.Col>
        ))}
      </Grid.Row>
    </div>
  );
}

export default FactMultiPie;
