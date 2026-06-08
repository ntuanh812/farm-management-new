import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Card, Space, Tag, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, FallOutlined, TeamOutlined } from '@ant-design/icons';
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
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [deaths, setDeaths] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  // Phân quyền
  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resDeaths, resPigs] = await Promise.all([
        axios.get(`${API}/deaths`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/pigs`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);
      setDeaths(resDeaths.data?.data || []);
      setPigs(resPigs.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu ghi nhận lợn chết');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lọc ra lợn đang còn sống (ACTIVE) để đưa vào dropdown
  const activePigs = useMemo(() => {
    return pigs.filter(p => p.lifecycle_status === 'ACTIVE');
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
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Ngày ghi nhận',
      key: 'death_date',
      render: (_, r) => dayjs(r.death_date).format('DD/MM/YYYY')
    },
    {
      title: 'Mã lợn',
      key: 'pig_id',
      render: (_, r) => {
        const pig = pigs.find(p => p.id === r.pig_id);
        return <strong>PIG{String(pig ? pig.id : (r.pig_id || '—')).padStart(3, "0")}</strong>;
      }
    },
    {
      title: 'Chuồng (Lúc chết)',
      key: 'barn_name',
      render: (_, r) => <span>{r.barn_name || '—'}</span>
    },
    {
      title: 'Nguyên nhân chết',
      key: 'reason',
      render: (_, r) => <span className="text-danger fw-500">{r.reason || '—'}</span>
    },
    {
      title: 'Phương pháp xử lý xác',
      key: 'disposal_method',
      render: (_, r) => <Tag color="orange">{r.disposal_method || '—'}</Tag>
    },
    {
      title: 'Người ghi nhận',
      key: 'recorded_by',
      render: (_, r) => <span>{r.recorded_by_name || '—'}</span>
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
    <div className="dashboard pig-dead-page">
      <PageHeader
        title="Ghi nhận Lợn chết"
        subtitle="Quản lý và thống kê lợn thiệt hại, phương án tiêu hủy"
        actions={canEdit && (
          <Button type="primary" danger icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Ghi nhận thiệt hại
          </Button>
        )}
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
        <Col xs={24} sm={12} lg={12}>
          <Card className="stat-card stat-card--daily-tasks">
            <div className="stat-card__header">
              <span className="stat-card__title">{user?.role === 'FARM_WORKER' ? 'Lợn chết (chuồng quản lý)' : 'Tổng số lợn chết'}</span>
              <div className="stat-card__icon"><FallOutlined /></div>
            </div>
            <div className="stat-card__value">
              {deaths.length}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card className="stat-card stat-card--pigs">
            <div className="stat-card__header">
              <span className="stat-card__title">{user?.role === 'FARM_WORKER' ? 'Tổng đàn đang quản lý' : 'Tổng đàn hiện tại'}</span>
              <div className="stat-card__icon"><TeamOutlined /></div>
            </div>
            <div className="stat-card__value">
              {activePigs.length}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="table-card" style={{ marginTop: 24 }}>
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
        onCancel={() => { setOpen(false); form.resetFields(); }} 
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
            label: `PIG${String(p.id).padStart(3, "0")} - Chuồng: ${p.barn_name || 'Không rõ'}`, 
                value: p.id 
              }))}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.pig_id !== curr.pig_id}>
            {({ getFieldValue }) => {
              const pid = getFieldValue('pig_id');
              const pig = activePigs.find(p => p.id === pid);
              const minDate = pig?.entry_date;
              return (
                <Form.Item name="death_date" label="Ngày chết" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => current && ((minDate && current < dayjs(minDate).startOf('day')) || current > dayjs().endOf('day'))} />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item name="reason" label="Nguyên nhân (Chẩn đoán)" rules={[{ required: true, message: 'Nhập nguyên nhân' }]}>
            <Input placeholder="VD: Bệnh dịch tả, Còi cọc..." />
          </Form.Item>

          <Form.Item name="disposal_method" label="Phương pháp xử lý xác" rules={[{ required: true, message: 'Chọn phương pháp' }]}>
            <Select options={DISPOSAL_METHODS.map(t => ({ label: t, value: t }))} placeholder="Chọn phương pháp xử lý..." />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Ghi chú bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </div>
  );
}