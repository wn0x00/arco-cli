import { Skeleton, Statistic, Typography } from '@arco-design/web-react';
import cs from 'classnames';
import { Line, Column, Pie } from '@ant-design/charts';
import { IconArrowRise, IconArrowFall } from '@arco-design/web-react/icon';
import useChartTheme from '@/utils/useChartTheme';
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

const sparkConfig = {
  autoFit: true,
  height: 80,
  paddingLeft: 10,
  paddingRight: 10,
  paddingTop: 10,
  paddingBottom: 0,
  legend: false,
  axis: false,
  tooltip: false,
} as const;

function SimpleLine({ chartData }: { chartData: PublicOpinionCardProps['chartData'] }) {
  const theme = useChartTheme();
  return (
    <Line
      theme={theme}
      {...sparkConfig}
      data={chartData ?? []}
      xField="x"
      yField="y"
      colorField="name"
      shapeField="smooth"
      scale={{ color: { range: ['#165DFF', 'rgba(106,161,255,0.3)'] } }}
      lineWidth={3}
    />
  );
}

function SimpleInterval({ chartData }: { chartData: PublicOpinionCardProps['chartData'] }) {
  const theme = useChartTheme();
  return (
    <Column
      theme={theme}
      {...sparkConfig}
      data={chartData ?? []}
      xField="x"
      yField="y"
      style={{
        fill: (datum: { x: number | string }) =>
          Number(datum.x) % 2 === 0 ? '#2CAB40' : '#86DF6C',
        radiusTopLeft: 2,
        radiusTopRight: 2,
      }}
    />
  );
}

function SimplePie({ chartData }: { chartData: PublicOpinionCardProps['chartData'] }) {
  const theme = useChartTheme();
  return (
    <Pie
      theme={theme}
      autoFit
      height={80}
      paddingLeft={0}
      paddingRight={20}
      paddingTop={0}
      paddingBottom={0}
      data={(chartData ?? []) as Array<{ name: string; count: number }>}
      angleField="count"
      colorField="name"
      innerRadius={0.55}
      radius={0.9}
      scale={{ color: { range: ['#8D4EDA', '#00B2FF', '#165DFF'] } }}
      label={false}
      legend={{ color: { position: 'right' } }}
      tooltip={false}
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
