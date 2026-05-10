import { useEffect, useState, useMemo } from 'react';
import { Statistic, Typography, Spin, Grid, Card, Skeleton } from '@arco-design/web-react';
import cs from 'classnames';
import { Line, Column } from '@ant-design/charts';
import axios from 'axios';
import useLocale from '@/utils/useLocale';
import useChartTheme from '@/utils/useChartTheme';
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

const sparkConfig = {
  autoFit: true,
  height: 80,
  paddingLeft: 10,
  paddingRight: 10,
  paddingTop: 0,
  paddingBottom: 0,
  legend: false,
  axis: false,
} as const;

function SimpleLine({ chartData }: { chartData: CardProps['chartData'] }) {
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
      lineWidth={2}
      tooltip={{
        items: [{ field: 'y', valueFormatter: (v: number) => Number(v).toLocaleString() }],
      }}
    />
  );
}

function SimpleInterval({ chartData }: { chartData: CardProps['chartData'] }) {
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
          Number(datum.x) % 2 === 0 ? '#86DF6C' : '#468DFF',
        radiusTopLeft: 2,
        radiusTopRight: 2,
      }}
      tooltip={{
        items: [{ field: 'y', valueFormatter: (v: number) => Number(v).toLocaleString() }],
      }}
    />
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
    cardInfo.map((item) => ({
      key: item.key,
      chartType: item.type,
    }))
  );

  const getData = async () => {
    const requestList = cardInfo.map(async (info) => {
      const { data } = await axios
        .get(`/api/multi-dimension/card?type=${info.type}`)
        .catch(() => ({ data: {} }));
      return {
        ...data,
        key: info.key,
        chartType: info.type,
      };
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
