import { useEffect, useMemo, useState } from 'react';
import { Statistic, Typography, Spin, Grid, Card, Skeleton } from '@arco-design/web-react';
import cs from 'classnames';
import { VChart } from '@visactor/react-vchart';
import axios from 'axios';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import { IconArrowRise, IconArrowFall } from '@arco-design/web-react/icon';
import styles from './style/card-block.module.less';

const { Row, Col } = Grid;
const { Title } = Typography;

export interface CardProps {
  key: string;
  title?: string;
  chartData?: Array<{ x: number | string; y: number; name?: string }>;
  chartType: string;
  count?: number;
  increment?: boolean;
  diff?: number;
  loading?: boolean;
}

const sparkBox = { width: '100%', height: 80 } as const;

function SimpleLine({ chartData }: { chartData: CardProps['chartData'] }) {
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
        lineWidth: 2,
        lineDash: (datum: { name?: string }) => (datum.name === '类目2' ? [6, 6] : []),
      },
    },
    point: { visible: false },
    axes: [
      { orient: 'left', visible: false },
      { orient: 'bottom', visible: false },
    ],
    legends: { visible: false },
    tooltip: { mark: { content: [{ key: 'y', value: (d: { y: number }) => Number(d.y).toLocaleString() }] } },
  };
  return (
    <div style={sparkBox}>
      <VChart spec={spec} />
    </div>
  );
}

function SimpleInterval({ chartData }: { chartData: CardProps['chartData'] }) {
  const values = chartData ?? [];
  const spec = {
    type: 'bar' as const,
    data: [{ id: 'spark', values }],
    xField: 'x',
    yField: 'y',
    bar: {
      style: {
        fill: (datum: { x: number | string }) => (Number(datum.x) % 2 === 0 ? '#86DF6C' : '#468DFF'),
        cornerRadius: 2,
      },
    },
    axes: [
      { orient: 'left', visible: false },
      { orient: 'bottom', visible: false },
    ],
    legends: { visible: false },
    tooltip: { mark: { content: [{ key: 'x', value: (d: { y: number }) => Number(d.y).toLocaleString() }] } },
  };
  return (
    <div style={sparkBox}>
      {values.length > 0 && <VChart spec={spec} />}
    </div>
  );
}

function CardBlock(props: CardProps) {
  const { chartType, title, count, increment, diff, chartData, loading } = props;

  return (
    <Card className={styles.card}>
      <div className={styles.statistic}>
        <Statistic
          title={
            <Title heading={6} className={styles.title}>
              {title}
            </Title>
          }
          loading={loading}
          value={count}
          extra={
            <div className={styles['compare-yesterday']}>
              {loading ? (
                <Skeleton text={{ rows: 1 }} style={{ width: '100px' }} animation />
              ) : (
                <span
                  className={cs(styles['diff'], {
                    [styles['diff-increment']]: increment,
                  })}
                >
                  {diff}
                  {increment ? <IconArrowRise /> : <IconArrowFall />}
                </span>
              )}
            </div>
          }
          groupSeparator
        />
      </div>
      <div className={styles.chart}>
        <Spin style={{ width: '100%' }} loading={loading}>
          {chartType === 'interval' && <SimpleInterval chartData={chartData} />}
          {chartType === 'line' && <SimpleLine chartData={chartData} />}
        </Spin>
      </div>
    </Card>
  );
}

const cardInfo = [
  { key: 'userRetentionTrend', type: 'line' },
  { key: 'userRetention', type: 'interval' },
  { key: 'contentConsumptionTrend', type: 'line' },
  { key: 'contentConsumption', type: 'interval' },
];

function CardList() {
  const t = useLocale(locale);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CardProps[]>(
    cardInfo.map((item) => ({ key: item.key, chartType: item.type }))
  );

  const getData = async () => {
    const requestList = cardInfo.map(async (info) => {
      const { data } = await axios
        .get(`/api/multi-dimension/card?type=${info.type}`)
        .catch(() => ({ data: {} }));
      return { ...data, key: info.key, chartType: info.type };
    });

    setLoading(true);
    const result = await Promise.all(requestList).finally(() => setLoading(false));
    setData(result);
  };

  useEffect(() => {
    getData();
  }, []);

  const formatData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      title: t[`multiDAnalysis.cardList.${item.key}`],
    }));
  }, [t, data]);

  return (
    <Row gutter={16}>
      {formatData.map((item, index) => (
        <Col span={6} key={index}>
          <CardBlock {...item} loading={loading} />
        </Col>
      ))}
    </Row>
  );
}

export default CardList;
