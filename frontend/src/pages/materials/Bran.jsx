import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Danh mục cám (Có thể mở rộng lấy từ DB sau)
const FEED_TYPES = [
  'Cám lợn con tập ăn', 
  'Cám lợn thịt 15-30kg', 
  'Cám lợn thịt 30-60kg', 
  'Cám lợn xuất chuồng', 
  'Cám nái mang thai'
];

export default function Bran() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [feedUsages, setFeedUsages] = useState([]);
  const [barns, setBarns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  // Phân quyền
  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUsages, resBarns] = await Promise.all([
        axios.get(`${API}/feed-usages`, { headers }),
        axios.get(`${API}/barns`, { headers })
      ]);
      setFeedUsages(resUsages.data?.data || []);
      setBarns(resBarns.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu sử dụng cám');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/feed-usages/${id}`, { headers });
      message.success('Đã xóa bản ghi tiêu thụ cám');
      fetchData();
    } catch (error) {
      message.error('Không thể xóa bản ghi này');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        used_at: values.used_at.format('YYYY-MM-DD'),
        staff_name: user?.full_name || user?.username
      };

      await axios.post(`${API}/feed-usages`, payload, { headers });
      message.success('Ghi nhận sử dụng cám thành công');
      setOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const columns = [
    { title: 'Ngày', dataIndex: 'used_at', key: 'used_at', render: (date) => dayjs(date).format('DD/MM/YYYY') },
    { title: 'Chuồng', dataIndex: 'barn_name', key: 'barn_name' },
    { title: 'Loại cám', dataIndex: 'feed_type', key: 'feed_type' },
    { title: 'Số lượng (kg)', dataIndex: 'quantity_kg', key: 'quantity_kg', render: (val) => <strong>{val} kg</strong> },
    { title: 'Người thực hiện', dataIndex: 'staff_name', key: 'staff_name' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => canDelete && (
        <Popconfirm title="Chắc chắn xóa bản ghi này?" onConfirm={() => handleDelete(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} title="Xóa" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="bran-page">
      <PageHeader
        title="Sử dụng Thức ăn (Cám)"
        subtitle="Ghi nhận và theo dõi lịch sử tiêu thụ cám của các chuồng"
        actions={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Ghi nhận cám
          </Button>
        )}
      />

      <Card className="table-card">
        <Table columns={columns} dataSource={feedUsages} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal 
        title="Ghi nhận sử dụng cám" 
        open={open} 
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }} 
        onOk={handleSubmit} 
        okText="Lưu thông tin" 
        cancelText="Hủy" 
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Form.Item name="used_at" label="Ngày cho ăn" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => current && current > dayjs().endOf('day')} />
          </Form.Item>
          <Form.Item name="barn_id" label="Chuồng" rules={[{ required: true, message: 'Chọn chuồng' }]}>
            <Select showSearch options={barns.map(b => ({ label: b.name, value: b.id }))} placeholder="Chọn chuồng..." />
          </Form.Item>
          <Form.Item name="feed_type" label="Loại cám" rules={[{ required: true, message: 'Chọn loại cám' }]}>
            <Select options={FEED_TYPES.map(t => ({ label: t, value: t }))} placeholder="Chọn loại cám..." />
          </Form.Item>
          <Form.Item name="quantity_kg" label="Số lượng (kg)" rules={[{ required: true, message: 'Nhập số lượng kg' }]}>
            <InputNumber min={0.1} step={0.1} className="w-100" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}