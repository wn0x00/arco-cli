import { Skeleton, Statistic, Typography } from '@arco-design/web-react';
import cs from 'classnames';
import { Tiny, Pie } from '@ant-design/charts';
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

const sparkSize = { autoFit: true, height: 80 } as const;

function SimpleLine({ chartData }: { chartData: PublicOpinionCardProps['chartData'] }) {
  // Tiny charts work best on a flat array of numbers; pick the primary series.
  const values = (chartData ?? []).map((d) => d.y);
  return (
    <Tiny.Line
      {...sparkSize}
      data={values}
      smooth
      style={{ stroke: '#165DFF', lineWidth: 2 }}
    />
  );
}

function SimpleInterval({ chartData }: { chartData: PublicOpinionCardProps['chartData'] }) {
  const values = (chartData ?? []).map((d) => d.y);
  return (
    <Tiny.Column
      {...sparkSize}
      data={values}
      style={{ fill: (datum: number, idx: number) => (idx % 2 === 0 ? '#2CAB40' : '#86DF6C') }}
    />
  );
}

function SimplePie({ chartData }: { chartData: PublicOpinionCardProps['chartData'] }) {
  return (
    <Pie
      autoFit
      height={80}
      data={chartData as Array<{ name: string; count: number }>}
      angleField="count"
      colorField="name"
      innerRadius={0.7}
      radius={0.8}
      scale={{ color: { range: ['#8D4EDA', '#00B2FF', '#165DFF'] } }}
      label={false}
      legend={{ color: { position: 'right' } }}
      interaction={{ elementSelect: true }}
    />
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
            {chartType === 'interval' && <SimpleInterval chartData={chartData} />}
            {chartType === 'line' && <SimpleLine chartData={chartData} />}
            {chartType === 'pie' && <SimplePie chartData={chartData} />}
          </>
        )}
      </div>
    </div>
  );
}

export default PublicOpinionCard;
