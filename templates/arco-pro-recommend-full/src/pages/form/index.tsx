import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Message,
  Select,
  Space,
  Switch,
  Typography,
} from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import { request } from '@/utils/request';
import locale from './locale';
import styles from './style/index.module.less';

const FormItem = Form.Item;

export default function FormPage() {
  const t = useLocale(locale);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const { data } = await request.post('/form/submit', values);
      Message.success(`${t['form.success']} (${(data as { id: string }).id})`);
      form.resetFields();
    } catch {
      Message.error(t['form.error']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={styles.container}>
      <Typography.Title heading={5} style={{ marginTop: 0 }}>
        {t['form.title']}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{t['form.subtitle']}</Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        onSubmit={onSubmit}
        initialValues={{ priority: 'normal', notify: true }}
        className={styles.form}
      >
        <FormItem
          field="title"
          label={t['form.field.title']}
          rules={[{ required: true, message: t['form.field.title.required'] }]}
        >
          <Input placeholder={t['form.field.title.placeholder']} />
        </FormItem>
        <FormItem
          field="description"
          label={t['form.field.description']}
          rules={[{ required: true, message: t['form.field.description.required'] }]}
        >
          <Input.TextArea rows={4} placeholder={t['form.field.description.placeholder']} />
        </FormItem>
        <FormItem field="priority" label={t['form.field.priority']}>
          <Select
            options={[
              { label: t['form.priority.low'], value: 'low' },
              { label: t['form.priority.normal'], value: 'normal' },
              { label: t['form.priority.high'], value: 'high' },
            ]}
          />
        </FormItem>
        <FormItem field="notify" label={t['form.field.notify']} triggerPropName="checked">
          <Switch />
        </FormItem>
        <FormItem>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t['form.submit']}
            </Button>
            <Button onClick={() => form.resetFields()} disabled={submitting}>
              {t['form.reset']}
            </Button>
          </Space>
        </FormItem>
      </Form>
    </Card>
  );
}
