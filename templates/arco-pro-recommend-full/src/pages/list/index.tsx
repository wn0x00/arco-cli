import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconPlus, IconRefresh } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
import { request } from '@/utils/request';
import locale from './locale';
import styles from './style/index.module.less';

type Row = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  owner: string;
};

type ListResponse = {
  data: Row[];
  total: number;
  page: number;
  pageSize: number;
};

const STATUS_COLORS: Record<Row['status'], string> = {
  active: 'green',
  paused: 'orange',
  archived: 'gray',
};

export default function ListPage() {
  const t = useLocale(locale);
  const [data, setData] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<{ name?: string; status?: string }>({});

  const fetchData = (p = page, ps = pageSize, f = filters) => {
    setLoading(true);
    request
      .get<ListResponse>('/list', { params: { page: p, pageSize: ps, ...f } })
      .then((res) => {
        setData(res.data.data);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData(page, pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const columns = [
    { title: t['list.column.id'], dataIndex: 'id' },
    { title: t['list.column.name'], dataIndex: 'name' },
    {
      title: t['list.column.status'],
      dataIndex: 'status',
      render: (s: Row['status']) => <Tag color={STATUS_COLORS[s]}>{t[`list.status.${s}`]}</Tag>,
    },
    { title: t['list.column.owner'], dataIndex: 'owner' },
    {
      title: t['list.column.createdAt'],
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
  ];

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <Typography.Title heading={5} style={{ margin: 0 }}>
          {t['list.title']}
        </Typography.Title>
        <Space>
          <Button icon={<IconRefresh />} onClick={() => fetchData()}>
            {t['list.action.refresh']}
          </Button>
          <Button type="primary" icon={<IconPlus />}>
            {t['list.action.create']}
          </Button>
        </Space>
      </div>

      <Form
        layout="inline"
        className={styles.filters}
        onSubmit={(values) => {
          setFilters(values);
          setPage(1);
          fetchData(1, pageSize, values);
        }}
      >
        <Form.Item field="name" label={t['list.filter.name']}>
          <Input placeholder={t['list.filter.name.placeholder']} allowClear />
        </Form.Item>
        <Form.Item field="status" label={t['list.filter.status']}>
          <Select
            placeholder={t['list.filter.status.placeholder']}
            allowClear
            style={{ width: 160 }}
            options={[
              { label: t['list.status.active'], value: 'active' },
              { label: t['list.status.paused'], value: 'paused' },
              { label: t['list.status.archived'], value: 'archived' },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {t['list.filter.apply']}
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        data={data}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: true,
          sizeCanChange: true,
          onChange: (current, size) => {
            setPage(current);
            setPageSize(size);
          },
        }}
      />
    </Card>
  );
}
