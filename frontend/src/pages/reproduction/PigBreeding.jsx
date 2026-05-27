import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Card, Space, Tag, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, HeartOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const STATUS_CONFIG = {
  'PENDING': { text: 'Chờ kết quả (18-24 ngày)', color: 'orange' },
  'SUCCESS': { text: 'Đậu thai', color: 'green' },
  'FAILED': { text: 'Trượt (Phối lại)', color: 'red' },
  'FARROWED': { text: 'Đã đẻ', color: 'purple' },
};

export default function PigBreeding() {
  const { token, user } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [breedings, setBreedings] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resBreed, resPigs] = await Promise.all([
        axios.get(`${API}/breedings`, { headers }),
        axios.get(`${API}/pigs`, { headers }),
      ]);
      setBreedings(resBreed.data?.data || []);
      setPigs(resPigs.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu phối giống');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeSows = useMemo(() => pigs.filter(p => (p.lifecycleStatus === 'ACTIVE' || p.lifecycle_status === 'ACTIVE') && p.category === 'SOW'), [pigs]);
  const activeBoars = useMemo(() => pigs.filter(p => (p.lifecycleStatus === 'ACTIVE' || p.lifecycle_status === 'ACTIVE') && p.category === 'BOAR'), [pigs]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/breedings/${id}`, { headers });
      message.success('Đã xóa bản ghi phối giống');
      fetchData();
    } catch (error) {
      message.error('Không thể xóa bản ghi này');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/breedings/${id}/status`, { status: newStatus }, { headers });
      message.success('Cập nhật trạng thái thành công');
      fetchData();
    } catch (error) {
      message.error('Không thể cập nhật trạng thái');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        breeding_date: values.breeding_date.format('YYYY-MM-DD'),
        expected_farrow_date: values.breeding_date.add(114, 'day').format('YYYY-MM-DD'),
        status: 'PENDING',
        staff_name: user?.full_name || user?.username || 'Hệ thống',
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
      render: (status, record) => {
        const daysSinceBreeding = dayjs().diff(dayjs(record.breeding_date), 'day');
        const isEditable = canEdit && daysSinceBreeding >= 18 && status === 'PENDING';

        if (!isEditable) {
          const cfg = STATUS_CONFIG[status] || { text: status, color: 'default' };
          const tooltip = (canEdit && status === 'PENDING' && daysSinceBreeding < 18)
            ? `Cần chờ thêm ${18 - daysSinceBreeding} ngày nữa mới được cập nhật kết quả` 
            : '';
          return <Tag color={cfg.color} title={tooltip}>{cfg.text}</Tag>;
        }

        const options = Object.entries(STATUS_CONFIG)
          .filter(([val]) => {
            if (val === 'FARROWED') return false; // Không tự chọn "Đã đẻ" thủ công từ dropdown
            if (status !== 'PENDING' && val === 'PENDING') return false; // Đã có kết quả thì không quay lại PENDING
            return true;
          })
          .map(([val, cfg]) => ({ 
            value: val, 
            label: <span style={{ color: cfg.color === 'orange' ? '#faad14' : cfg.color === 'green' ? '#52c41a' : cfg.color === 'purple' ? '#722ed1' : '#ff4d4f', fontWeight: 500 }}>{cfg.text}</span> 
          }));

        return (
          <Select 
            value={status} 
            onChange={(val) => handleUpdateStatus(record.id, val)}
            bordered={false}
            style={{ minWidth: 200 }}
            options={options}
          />
        );
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
    <div className="dashboard pig-breeding-page">
      <PageHeader
        title="Quản lý Phối giống"
        subtitle="Ghi nhận lịch sử phối giống và theo dõi lịch dự sinh"
        actions={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            form.resetFields();
            form.setFieldsValue({ breeding_date: dayjs() });
            setOpen(true);
          }}>
            Thêm lượt phối giống
          </Button>
        )}
      />

      <Row gutter={[20, 20]} className="dashboard-stats mb-24 mt-24">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--pigs">
            <div className="stat-card__header">
              <span className="stat-card__title">Tổng lượt phối</span>
              <div className="stat-card__icon"><HeartOutlined /></div>
            </div>
            <div className="stat-card__value">
              {breedings.length}
              <span className="stat-card__label"> lượt</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--barn">
            <div className="stat-card__header">
              <span className="stat-card__title">Chờ kết quả</span>
              <div className="stat-card__icon"><ClockCircleOutlined /></div>
            </div>
            <div className="stat-card__value">
              {breedings.filter(b => b.status === 'PENDING').length}
              <span className="stat-card__label"> lượt</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--staff">
            <div className="stat-card__header">
              <span className="stat-card__title">Đang mang thai</span>
              <div className="stat-card__icon"><CheckCircleOutlined /></div>
            </div>
            <div className="stat-card__value">
              {breedings.filter(b => b.status === 'SUCCESS').length}
              <span className="stat-card__label"> lượt</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--daily-tasks">
            <div className="stat-card__header">
              <span className="stat-card__title">Phối trượt</span>
              <div className="stat-card__icon"><CloseCircleOutlined /></div>
            </div>
            <div className="stat-card__value">
              {breedings.filter(b => b.status === 'FAILED').length}
              <span className="stat-card__label"> lượt</span>
            </div>
          </Card>
        </Col>
      </Row>

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
          <Space className="flex-baseline mb-8" align="baseline">
            <Form.Item name="sow_id" label="Lợn nái (Cái)" rules={[{ required: true, message: 'Chọn nái' }]} className="w-220">
              <Select showSearch placeholder="Chọn lợn nái">
                {activeSows.map(p => <Select.Option key={p.id} value={p.id}>{p.pig_code || p.pigCode || p.earTag}</Select.Option>)}
              </Select>
            </Form.Item>

            <span className="text-lg text-gray px-8">+</span>

            <Form.Item name="boar_id" label="Lợn đực giống" rules={[{ required: true, message: 'Chọn đực' }]} className="w-220">
              <Select showSearch placeholder="Chọn lợn đực">
                {activeBoars.map(p => <Select.Option key={p.id} value={p.id}>{p.pig_code || p.pigCode || p.earTag}</Select.Option>)}
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="breeding_date" label="Ngày phối giống" rules={[{ required: true, message: 'Vui lòng chọn ngày phối' }]}>
            <DatePicker 
              format="DD/MM/YYYY" 
              style={{ width: '100%' }} 
              disabledDate={(current) => current && current > dayjs().endOf('day')} 
            />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {() => {
              const bDate = form.getFieldValue('breeding_date');
              if (!bDate) return null;
              return (
                <div style={{ background: '#f0f5ff', padding: '12px 16px', borderRadius: 8, border: '1px solid #adc6ff', marginBottom: 16 }}>
                  <div style={{ color: '#d46b08', fontWeight: 500 }}>⏳ Dự kiến sinh: {bDate.add(114, 'day').format('DD/MM/YYYY')} (Tự động +114 ngày)</div>
                </div>
              );
            }}
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Ghi chú về tinh, biểu hiện..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}