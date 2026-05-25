import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Card, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DISPOSAL_METHODS = [
  'Chôn lấp an toàn',
  'Tiêu hủy sinh học (Đốt)',
  'Chuyển cho đơn vị xử lý',
  'Khác'
];

export default function PigDead() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [deaths, setDeaths] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  // Phân quyền
  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDeaths, resPigs, resStaff] = await Promise.all([
        axios.get(`${API}/deaths`, { headers }),
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/employees`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      setDeaths(resDeaths.data?.data || []);
      setPigs(resPigs.data?.data || []);
      setStaffList(resStaff.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu ghi nhận lợn chết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lọc ra lợn đang còn sống (ACTIVE) để đưa vào dropdown
  const activePigs = useMemo(() => {
    return pigs.filter(p => p.lifecycleStatus === 'ACTIVE');
  }, [pigs]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/deaths/${id}`, { headers });
      message.success('Đã xóa bản ghi lợn chết');
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
        death_date: values.death_date.format('YYYY-MM-DD'),
      };

      await axios.post(`${API}/deaths`, payload, { headers });
      message.success('Ghi nhận lợn chết thành công');
      setOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const columns = [
    {
      title: 'Ngày ghi nhận',
      dataIndex: 'death_date',
      key: 'death_date',
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Mã Lợn',
      dataIndex: 'pig_code',
      key: 'pig_code',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Chuồng (Lúc chết)',
      dataIndex: 'barn_name',
      key: 'barn_name'
    },
    {
      title: 'Nguyên nhân chết',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => <span className="text-danger fw-500">{text}</span>
    },
    {
      title: 'Phương pháp xử lý xác',
      dataIndex: 'disposal_method',
      key: 'disposal_method',
      render: (text) => <Tag color="orange">{text}</Tag>
    },
    {
      title: 'Người ghi nhận',
      dataIndex: 'recorded_by',
      key: 'recorded_by'
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note'
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
    <div className="pig-dead-page">
      <PageHeader
        title="Ghi nhận Lợn chết"
        subtitle="Quản lý và thống kê lợn thiệt hại, phương án tiêu hủy"
        actions={canEdit && (
          <Button type="primary" danger icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Ghi nhận thiệt hại
          </Button>
        )}
      />

      <Card className="table-card">
        <Table 
          columns={columns} 
          dataSource={deaths} 
          rowKey="id" 
          loading={loading} 
          pagination={{ pageSize: 10 }} 
        />
      </Card>

      <Modal 
        title={<span className="text-danger">Ghi nhận cá thể lợn chết</span>}
        open={open} 
        onCancel={() => setOpen(false)} 
        onOk={handleSubmit} 
        okText="Lưu thông tin" 
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Form.Item name="pig_id" label="Chọn mã lợn" rules={[{ required: true, message: 'Vui lòng chọn lợn' }]}>
            <Select 
              showSearch 
              placeholder="Chỉ hiển thị các cá thể lợn đang sống"
              options={activePigs.map(p => ({ 
                label: `${p.earTag} - Chuồng: ${p.barnName || 'Không rõ'}`, 
                value: p.id 
              }))}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>

          <Form.Item name="death_date" label="Ngày chết" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker className="w-100" format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="reason" label="Nguyên nhân (Chẩn đoán)" rules={[{ required: true, message: 'Nhập nguyên nhân' }]}>
            <Input placeholder="VD: Bệnh dịch tả, Còi cọc..." />
          </Form.Item>

          <Form.Item name="disposal_method" label="Phương pháp xử lý xác" rules={[{ required: true, message: 'Chọn phương pháp' }]}>
            <Select options={DISPOSAL_METHODS.map(t => ({ label: t, value: t }))} placeholder="Chọn phương pháp xử lý..." />
          </Form.Item>

          <Form.Item name="recorded_by" label="Người phụ trách xử lý">
            <Select showSearch placeholder="Chọn nhân viên">
              {staffList.map((x) => <Select.Option key={x.id} value={x.full_name}>{x.full_name}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Ghi chú bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}