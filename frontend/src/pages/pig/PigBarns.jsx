import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input,
  Select, InputNumber, message, Popconfirm, Card, Row, Col, Progress
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, CheckCircleOutlined, WarningOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const BARN_TYPES = {
  'SOW': 'Chuồng Nái',
  'BOAR': 'Chuồng Đực',
  'PIGLET': 'Chuồng Lợn Con',
  'FATTENING': 'Chuồng Vỗ Béo',
  'QUARANTINE': 'Chuồng Cách Ly'
};

const STATUS_CONFIG = {
  'ACTIVE': { text: 'Hoạt động', color: 'green' },
  'MAINTENANCE': { text: 'Bảo trì', color: 'orange' },
  'FULL': { text: 'Đã đầy', color: 'red' }
};

export default function PigBarns() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [barns, setBarns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // Phân quyền: Admin và Nhân viên có quyền thao tác
  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/barns`, { headers });
      if (data.success) {
        setBarns(data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách chuồng trại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tính toán thống kê chuồng trại
  const stats = useMemo(() => {
    const active = barns.filter(b => b.status === 'ACTIVE').length;
    const full = barns.filter(b => (b.current_quantity || 0) >= (b.capacity || 1)).length;
    const totalPigs = barns.reduce((sum, b) => sum + (b.current_quantity || 0), 0);
    const totalCapacity = barns.reduce((sum, b) => sum + (b.capacity || 0), 0);
    return { total: barns.length, active, full, totalPigs, totalCapacity };
  }, [barns]);

  const handleOpenAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVE' });
    setOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/barns/${id}`, { headers });
      message.success('Đã xóa chuồng thành công');
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xóa chuồng này');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingId) {
        await axios.put(`${API}/barns/${editingId}`, values, { headers });
        message.success('Cập nhật chuồng thành công');
      } else {
        await axios.post(`${API}/barns`, values, { headers });
        message.success('Thêm chuồng mới thành công');
      }

      setOpen(false);
      fetchData();
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Có lỗi xảy ra');
      }
    }
  };

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Tên chuồng',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Loại chuồng',
      dataIndex: 'barn_type',
      key: 'barn_type',
      render: (type) => BARN_TYPES[type] || type,
    },
    {
      title: 'Sức chứa / Hiện tại',
      key: 'capacity',
      width: 180,
      render: (_, record) => {
        const current = record.current_quantity || 0;
        const capacity = record.capacity || 1;
        const percent = Math.round((current / capacity) * 100);
        return (
          <div className="w-100">
            <div className="flex-between text-xs mb-4">
              <span className={percent >= 100 ? "text-danger fw-500" : "fw-500"}>{current} con</span>
              <span className="text-muted">/ {capacity}</span>
            </div>
            <Progress
              percent={percent}
              size="small"
              status={percent >= 100 ? 'exception' : 'active'}
              strokeColor={percent >= 100 ? '#ff4d4f' : '#52c41a'}
              showInfo={false}
            />
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const cfg = STATUS_CONFIG[status];
        return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : <Tag>{status}</Tag>;
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record) => canEdit && (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            className="text-primary"
            onClick={() => handleOpenEdit(record)}
            title="Sửa"
          />
          <Popconfirm
            title="Chắc chắn xóa chuồng này?"
            description="Chỉ xóa được nếu chuồng không còn lợn."
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} title="Xóa" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="dashboard pig-barns-page">
      <PageHeader
        title="Quản lý Chuồng trại"
        subtitle="Theo dõi sức chứa, loại chuồng và trạng thái hoạt động"
        actions={
          canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Thêm chuồng mới
            </Button>
          )
        }
      />

      <Row gutter={[20, 20]} className="dashboard-stats mb-24 mt-24">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--barn">
            <div className="stat-card__header">
              <span className="stat-card__title">Tổng số chuồng</span>
              <div className="stat-card__icon"><HomeOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.total}
              <span className="stat-card__label"> chuồng</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--pigs">
            <div className="stat-card__header">
              <span className="stat-card__title">Đang hoạt động</span>
              <div className="stat-card__icon"><CheckCircleOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.active}
              <span className="stat-card__label"> chuồng</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--daily-tasks">
            <div className="stat-card__header">
              <span className="stat-card__title">Chuồng quá tải</span>
              <div className="stat-card__icon"><WarningOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.full}
              <span className="stat-card__label"> chuồng</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--staff">
            <div className="stat-card__header">
              <span className="stat-card__title">Sức chứa lợn</span>
              <div className="stat-card__icon"><TeamOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.totalPigs}
              <span className="stat-card__label"> / {stats.totalCapacity}</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={barns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Cập nhật thông tin chuồng' : 'Thêm chuồng mới'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText="Lưu thông tin"
        cancelText="Hủy"
        width={600}
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Mã chuồng" rules={[{ required: true, message: 'Vui lòng nhập mã chuồng' }]}>
                <Input placeholder="VD: B01, NAI-01..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Tên chuồng" rules={[{ required: true, message: 'Vui lòng nhập tên chuồng' }]}>
                <Input placeholder="VD: Chuồng nái 1..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="barn_type" label="Loại chuồng" rules={[{ required: true, message: 'Vui lòng chọn loại chuồng' }]}>
                <Select placeholder="Chọn loại...">
                  {Object.entries(BARN_TYPES).map(([key, val]) => (
                    <Select.Option key={key} value={key}>{val}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="capacity" label="Sức chứa (con)" rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}>
                <InputNumber min={1} className="w-100" placeholder="VD: 50" />
              </Form.Item>
            </Col>
          </Row>

          {editingId && (
            <Form.Item name="status" label="Trạng thái" rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}>
              <Select>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <Select.Option key={key} value={key}>{val.text}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Ghi chú thêm về chuồng (nếu có)..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}