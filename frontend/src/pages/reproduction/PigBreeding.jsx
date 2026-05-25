import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Card, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const STATUS_CONFIG = {
  'PENDING': { text: 'Chờ khám thai', color: 'orange' },
  'SUCCESS': { text: 'Đậu thai', color: 'green' },
  'FAILED': { text: 'Trượt (Phối lại)', color: 'red' },
};

export default function PigBreeding() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [breedings, setBreedings] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resBreed, resPigs, resStaff] = await Promise.all([
        axios.get(`${API}/breedings`, { headers }),
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/staff`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      setBreedings(resBreed.data?.data || []);
      setPigs(resPigs.data?.data || []);
      setStaffList(resStaff.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu phối giống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSows = useMemo(() => pigs.filter(p => p.lifecycleStatus === 'ACTIVE' && p.category === 'SOW'), [pigs]);
  const activeBoars = useMemo(() => pigs.filter(p => p.lifecycleStatus === 'ACTIVE' && p.category === 'BOAR'), [pigs]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/breedings/${id}`, { headers });
      message.success('Đã xóa bản ghi phối giống');
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
        breeding_date: values.breeding_date.format('YYYY-MM-DD'),
        expected_farrow_date: values.expected_farrow_date ? values.expected_farrow_date.format('YYYY-MM-DD') : null,
      };

      await axios.post(`${API}/breedings`, payload, { headers });
      message.success('Ghi nhận phối giống thành công');
      setOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleBreedingDateChange = (date) => {
    if (date) {
      // Lợn thường chửa 114 ngày (3 tháng, 3 tuần, 3 ngày)
      form.setFieldsValue({ expected_farrow_date: date.add(114, 'day') });
    } else {
      form.setFieldsValue({ expected_farrow_date: null });
    }
  };

  const columns = [
    {
      title: 'Ngày phối',
      dataIndex: 'breeding_date',
      key: 'breeding_date',
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Nái (Cái)',
      dataIndex: 'sow_code',
      key: 'sow_code',
      render: (text) => <span className="text-pink fw-500">{text}</span>
    },
    {
      title: 'Đực giống',
      dataIndex: 'boar_code',
      key: 'boar_code',
      render: (text) => <span className="text-primary fw-500">{text}</span>
    },
    {
      title: 'Dự kiến đẻ',
      dataIndex: 'expected_farrow_date',
      key: 'expected_farrow_date',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const cfg = STATUS_CONFIG[status] || { text: status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      }
    },
    {
      title: 'Người phối',
      dataIndex: 'staff_name',
      key: 'staff_name'
    },
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
    <div className="pig-breeding-page">
      <PageHeader
        title="Quản lý Phối giống"
        subtitle="Ghi nhận lịch sử phối giống và theo dõi lịch dự sinh"
        actions={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Thêm lượt phối giống
          </Button>
        )}
      />

      <Card className="table-card">
        <Table 
          columns={columns} 
          dataSource={breedings} 
          rowKey="id" 
          loading={loading} 
          pagination={{ pageSize: 10 }} 
        />
      </Card>

      <Modal 
        title="Ghi nhận lượt phối giống" 
        open={open} 
        onCancel={() => setOpen(false)} 
        onOk={handleSubmit} 
        okText="Lưu thông tin" 
        cancelText="Hủy"
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Space className="flex-baseline mb-8" align="baseline">
            <Form.Item name="sow_id" label="Lợn nái (Cái)" rules={[{ required: true, message: 'Chọn nái' }]} className="w-220">
              <Select showSearch placeholder="Chọn lợn nái">
                {activeSows.map(p => <Select.Option key={p.id} value={p.id}>{p.earTag}</Select.Option>)}
              </Select>
            </Form.Item>

            <span className="text-lg text-gray px-8">+</span>

            <Form.Item name="boar_id" label="Lợn đực giống" rules={[{ required: true, message: 'Chọn đực' }]} className="w-220">
              <Select showSearch placeholder="Chọn lợn đực">
                {activeBoars.map(p => <Select.Option key={p.id} value={p.id}>{p.earTag}</Select.Option>)}
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="breeding_date" label="Ngày phối giống" rules={[{ required: true, message: 'Chọn ngày phối' }]}>
            <DatePicker className="w-100" format="DD/MM/YYYY" onChange={handleBreedingDateChange} />
          </Form.Item>

          <Form.Item name="expected_farrow_date" label="Ngày dự kiến sinh (Tự động +114 ngày)">
            <DatePicker className="w-100" format="DD/MM/YYYY" disabled />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái" initialValue="PENDING" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="PENDING">Chờ khám thai (Chưa rõ kết quả)</Select.Option>
              <Select.Option value="SUCCESS">Đậu thai (Thành công)</Select.Option>
              <Select.Option value="FAILED">Trượt (Phối thất bại)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="staff_name" label="Người thực hiện phối">
            <Select showSearch placeholder="Chọn nhân viên">
              {staffList.map((x) => <Select.Option key={x.id} value={x.full_name}>{x.full_name}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Ghi chú về tinh, biểu hiện..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}