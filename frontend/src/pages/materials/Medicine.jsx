import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Card, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const MEDICINE_TYPES = [
  'Kháng sinh (Amoxicillin)',
  'Kháng sinh (Penicillin)',
  'Thuốc bổ (Vitamin C)',
  'Thuốc sát trùng (Iodine)',
  'Thuốc tẩy giun',
  'Khác'
];

const UNIT_TYPES = ['ml', 'mg', 'lọ', 'gói', 'viên'];

export default function Medicine() {
  const { token, user } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [medicineUsages, setMedicineUsages] = useState([]);
  const [barns, setBarns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  // Phân quyền
  const canEdit = user?.role === 'ADMIN' || user?.role === 'VET_DOCTOR';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resUsages, resBarns] = await Promise.all([
        axios.get(`${API}/medicine-usages`, { headers }),
        axios.get(`${API}/barns`, { headers })
      ]);
      setMedicineUsages(resUsages.data?.data || []);
      setBarns(resBarns.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu sử dụng thuốc');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/medicine-usages/${id}`, { headers });
      message.success('Đã xóa bản ghi sử dụng thuốc');
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

      await axios.post(`${API}/medicine-usages`, payload, { headers });
      message.success('Ghi nhận sử dụng thuốc thành công');
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
    { title: 'Tên thuốc/Vật tư', dataIndex: 'medicine_name', key: 'medicine_name', render: text => <strong className="text-primary">{text}</strong> },
    { title: 'Số lượng', key: 'quantity', render: (_, r) => `${r.quantity} ${r.unit}` },
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
    <div className="medicine-page">
      <PageHeader
        title="Sử dụng Thuốc & Vật tư thú y"
        subtitle="Ghi nhận và theo dõi lịch sử cấp phát thuốc tại các chuồng"
        actions={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Ghi nhận thuốc
          </Button>
        )}
      />

      <Card className="table-card">
        <Table columns={columns} dataSource={medicineUsages} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal 
        title="Ghi nhận sử dụng thuốc/vật tư" 
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
          <Form.Item name="used_at" label="Ngày cấp/sử dụng" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => current && current > dayjs().endOf('day')} />
          </Form.Item>
          <Form.Item name="barn_id" label="Chuồng" rules={[{ required: true, message: 'Chọn chuồng' }]}>
            <Select showSearch options={barns.map(b => ({ label: b.name, value: b.id }))} placeholder="Chọn chuồng..." />
          </Form.Item>
          <Form.Item name="medicine_name" label="Tên thuốc/Vật tư" rules={[{ required: true, message: 'Nhập hoặc chọn tên thuốc' }]}>
            <Select mode="tags" maxCount={1} options={MEDICINE_TYPES.map(t => ({ label: t, value: t }))} placeholder="VD: Kháng sinh, Vitamin..." />
          </Form.Item>
          <Space align="baseline">
            <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }]}>
              <InputNumber min={0.1} step={0.1} className="w-100" />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị" rules={[{ required: true, message: 'Chọn đơn vị' }]}>
              <Select options={UNIT_TYPES.map(u => ({ label: u, value: u }))} placeholder="VD: ml" className="w-120" />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Liệu trình, mục đích sử dụng..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}