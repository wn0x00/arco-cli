import { Pie } from '@ant-design/charts';
import { Grid } from '@arco-design/web-react';
import useChartTheme from '@/utils/useChartTheme';

const { Row, Col } = Grid;

const palette = ['#249eff', '#846BCE', '#21CCFF', '#86DF6C', '#0E42D2'];

interface FactMultiPieProps {
  /** Each row has { category, type, value }. The chart is faceted by category. */
  data?: Array<{ category: string; type: string; value: number }>;
  loading: boolean;
  height: number;
}

function FactMultiPie(props: FactMultiPieProps) {
  const theme = useChartTheme();
  // Group rows by category — one donut per group.
  const grouped: Record<string, Array<{ type: string; value: number }>> = {};
  for (const row of props.data ?? []) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push({ type: row.type, value: row.value });
  }

  const categories = Object.keys(grouped);
  const span = categories.length > 0 ? Math.max(6, Math.floor(24 / categories.length)) : 24;
  const pieHeight = props.height || 240;

  return (
    <Row gutter={16}>
      {categories.map((cat) => (
        <Col span={span} key={cat}>
          <div style={{ position: 'relative' }}>
            <Pie
              theme={theme}
              autoFit
              height={pieHeight}
              data={grouped[cat]}
              angleField="value"
              colorField="type"
              innerRadius={0.7}
              radius={0.8}
              scale={{ color: { range: palette } }}
              label={{
                text: (d: { value: number }) => `${(d.value * 100).toFixed(0)}%`,
                position: 'inside',
                style: { fill: '#fff', fontSize: 12 },
              }}
              legend={{ color: { position: 'bottom' } }}
              interaction={{ elementSelect: true }}
            />
            {/* Donut center label — overlay because @ant-design/charts v2 Pie
                doesn't honor inline `annotations` of type 'text'. */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 40, // leave room for the bottom legend
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--color-text-1)',
              }}
            >
              {cat}
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
}

export default FactMultiPie;
