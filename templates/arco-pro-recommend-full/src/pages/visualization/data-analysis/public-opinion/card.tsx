import { Skeleton, Statistic, Typography } from '@arco-design/web-react';
import cs from 'classnames';
import { VChart } from '@visactor/react-vchart';
import { IconArrowRise, IconArrowFall } from '@arco-design/web-react/icon';
import styles from '../style/public-opinion.module.less';

const { Title, Text } = Typography;

export interface PublicOpinionCardProps {
  key: string;
  title: string;
  chartData?: Array<{ x: number | string; y: number; name?: string }>;
  chartType: 'line' | 'interval' | 'pie';
  count?: number;
  increment?: boolean;
  diff?: number;
  compareTime?: string;
  loading?: boolean;
}

const sparkBox = { width: '100%', height: 80 } as const;

function SimpleLine({ chartData }: { chartData: Array<{ x: number | string; y: number; name?: string }> }) {
  const spec = {
    type: 'line' as const,
    data: [{ id: 'spark', values: chartData ?? [] }],
    xField: 'x',
    yField: 'y',
    seriesField: 'name',
    color: ['#165DFF', 'rgba(106,161,255,0.3)'],
    line: {
      style: {
        curveType: 'monotone',
        lineWidth: 3,
        lineDash: (datum: { name?: string }) => (datum.name === '类目2' ? [8, 10] : []),
      },
    },
    point: { visible: false },
    axes: [
      { orient: 'left', visible: false },
      { orient: 'bottom', visible: false },
    ],
    legends: { visible: false },
    tooltip: { mark: { content: [{ key: 'name', value: 'y' }] } },
  };
  return (
    <div style={sparkBox}>
      <VChart spec={spec} />
    </div>
  );
}

function SimpleInterval({ chartData }: { chartData: Array<{ x: number | string; y: number }> }) {
  const values = chartData ?? [];
  const spec = {
    type: 'bar' as const,
    data: [{ id: 'spark', values }],
    xField: 'x',
    yField: 'y',
    bar: {
      style: {
        fill: (datum: { x: number | string }) => (Number(datum.x) % 2 === 0 ? '#2CAB40' : '#86DF6C'),
        cornerRadius: 999,
      },
    },
    barWidth: 6,
    axes: [
      { orient: 'left', visible: false },
      { orient: 'bottom', visible: false },
    ],
    legends: { visible: false },
    tooltip: { mark: { content: [{ key: 'x', value: 'y' }] } },
  };
  return (
    <div style={sparkBox}>
      {values.length > 0 && <VChart spec={spec} />}
    </div>
  );
}

function SimplePie({ chartData }: { chartData: Array<{ name: string; count: number }> }) {
  const spec = {
    type: 'pie' as const,
    data: [{ id: 'spark', values: chartData ?? [] }],
    valueField: 'count',
    categoryField: 'name',
    color: ['#8D4EDA', '#00B2FF', '#165DFF'],
    innerRadius: 0.7,
    outerRadius: 0.85,
    label: { visible: false },
    legends: { visible: true, orient: 'right', item: { shape: { style: { symbolType: 'circle' } } } },
    tooltip: { mark: { content: [{ key: 'name', value: 'count' }] } },
  };
  return (
    <div style={sparkBox}>
      <VChart spec={spec} />
    </div>
  );
}

function PublicOpinionCard(props: PublicOpinionCardProps) {
  const { chartType, title, count, increment, diff, chartData, loading } = props;
  const className = cs(styles.card, styles[`card-${chartType}`]);

  return (
    <div className={className}>
      <div className={styles.statistic}>
        <Statistic
          title={
            <Title heading={6} className={styles.title}>
              {title}
            </Title>
          }
          loading={loading}
          value={count}
          groupSeparator
        />
        <div className={styles['compare-yesterday']}>
          <Text type="secondary" className={styles['compare-yesterday-text']}>
            {props.compareTime}
          </Text>
          <span
            className={cs(styles['diff'], {
              [styles['diff-increment']]: increment,
            })}
          >
            {loading ? (
              <Skeleton text={{ rows: 1 }} animation />
            ) : (
              <>
                {diff}
                {increment ? <IconArrowRise /> : <IconArrowFall />}
              </>
            )}
          </span>
        </div>
      </div>
      <div className={styles.chart}>
        {loading ? (
          <Skeleton text={{ rows: 3, width: Array(3).fill('100%') }} animation />
        ) : (
          <>
            {chartType === 'interval' && <SimpleInterval chartData={chartData ?? []} />}
            {chartType === 'line' && <SimpleLine chartData={chartData ?? []} />}
            {chartType === 'pie' && (
              <SimplePie chartData={(chartData ?? []) as unknown as Array<{ name: string; count: number }>} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PublicOpinionCard;
