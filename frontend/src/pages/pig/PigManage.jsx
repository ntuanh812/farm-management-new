import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input,
  Select, DatePicker, InputNumber, message, Popconfirm, Card, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, ShoppingCartOutlined, HeartOutlined, DashboardOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CATEGORY_MAP = {
  'SOW': 'Nái',
  'BOAR': 'Đực',
  'PIGLET': 'Lợn con',
  'FATTENING': 'Lợn thịt'
};

const STATUS_MAP = {
  'ACTIVE': { text: 'Khỏe mạnh', color: 'green' },
  'SOLD': { text: 'Đã xuất bán', color: 'blue' },
  'DEAD': { text: 'Đã chết', color: 'red' }
};

const GENDER_MAP = {
  'male': 'Đực',
  'female': 'Cái'
};

export default function PigManage() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [pigs, setPigs] = useState([]);
  const [barns, setBarns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPigs, resBarns] = await Promise.all([
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/barns`, { headers })
      ]);

      if (resPigs.data.success) setPigs(resPigs.data.data);
      if (resBarns.data.success) setBarns(resBarns.data.data);
    } catch (error) {
      message.error('Không thể tải dữ liệu đàn lợn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tính toán thống kê từ danh sách lợn
  const stats = useMemo(() => {
    const activePigs = pigs.filter(p => p.lifecycleStatus === 'ACTIVE');
    return {
      total: activePigs.length,
      fattening: activePigs.filter(p => p.category === 'FATTENING').length,
      breeding: activePigs.filter(p => p.category === 'SOW' || p.category === 'BOAR').length,
      piglet: activePigs.filter(p => p.category === 'PIGLET').length,
    };
  }, [pigs]);

  const handleOpenAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ lifecycle_status: 'ACTIVE', gender: 'male' });
    setOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      pig_code: record.earTag,
      name: record.name,
      barn_id: record.barnId,
      category: record.category,
      lifecycle_status: record.lifecycleStatus,
      breed: record.breed,
      gender: record.gender,
      dob: record.dob ? dayjs(record.dob) : null,
      entry_date: record.arrivedAt ? dayjs(record.arrivedAt) : null,
      entry_weight: record.entry_weight,
      current_weight: record.weightKg,
      note: record.note
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/pigs/${id}`, { headers });
      message.success('Đã xóa lợn thành công');
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xóa bản ghi này');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const payload = {
        ...values,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        entry_date: values.entry_date ? values.entry_date.format('YYYY-MM-DD') : null,
      };

      if (editingId) {
        await axios.put(`${API}/pigs/${editingId}`, payload, { headers });
        message.success('Cập nhật thông tin lợn thành công');
      } else {
        await axios.post(`${API}/pigs`, payload, { headers });
        message.success('Thêm lợn mới thành công');
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
      title: 'Mã (Số tai)',
      dataIndex: 'earTag',
      key: 'earTag',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Chuồng',
      dataIndex: 'barnName',
      key: 'barnName',
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => CATEGORY_MAP[cat] || cat,
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      render: (g) => GENDER_MAP[g] || g,
    },
    {
      title: 'Tuổi (ngày)',
      dataIndex: 'ageDays',
      key: 'ageDays',
      render: (days) => (days !== null ? `${days} ngày` : '-'),
    },
    {
      title: 'Trọng lượng',
      dataIndex: 'weightKg',
      key: 'weightKg',
      render: (w) => (w ? `${w} kg` : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'lifecycleStatus',
      key: 'lifecycleStatus',
      render: (status) => {
        const cfg = STATUS_MAP[status];
        return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : <Tag>{status}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => canEdit && (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            className={['DEAD', 'SOLD'].includes(record.lifecycleStatus) ? "" : "text-primary"}
            onClick={() => handleOpenEdit(record)}
            title={['DEAD', 'SOLD'].includes(record.lifecycleStatus) ? "Không thể sửa cá thể lợn đã chết hoặc xuất bán" : "Sửa"}
            disabled={['DEAD', 'SOLD'].includes(record.lifecycleStatus)}
          />
          {canDelete && (
            <Popconfirm
              title="Chắc chắn xóa bản ghi này?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} title="Xóa" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="dashboard pig-manage-page">
      <PageHeader
        title="Quản lý Đàn Lợn"
        subtitle="Thêm mới, theo dõi trạng thái và cập nhật thông tin cá thể lợn"
        actions={
          canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Nhập đàn mới
            </Button>
          )
        }
      />

      <Row gutter={[20, 20]} className="dashboard-stats mb-24 mt-24">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--pigs">
            <div className="stat-card__header">
              <span className="stat-card__title">Tổng đàn hiện tại</span>
              <div className="stat-card__icon"><TeamOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.total}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--daily-tasks">
            <div className="stat-card__header">
              <span className="stat-card__title">Lợn thịt (Vỗ béo)</span>
              <div className="stat-card__icon"><ShoppingCartOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.fattening}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--staff">
            <div className="stat-card__header">
              <span className="stat-card__title">Lợn sinh sản (Nái/Đực)</span>
              <div className="stat-card__icon"><HeartOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.breeding}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card--barn">
            <div className="stat-card__header">
              <span className="stat-card__title">Lợn con (Theo mẹ/Cai sữa)</span>
              <div className="stat-card__icon"><DashboardOutlined /></div>
            </div>
            <div className="stat-card__value">
              {stats.piglet}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={pigs}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Cập nhật cá thể lợn' : 'Thêm lợn mới'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText="Lưu thông tin"
        cancelText="Hủy"
        width={750}
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="pig_code" label="Mã lợn / Số tai" rules={[{ required: true, message: 'Nhập mã' }]}><Input placeholder="VD: P001" /></Form.Item></Col>
            <Col span={8}><Form.Item name="name" label="Tên gọi (nếu có)"><Input placeholder="VD: Nái Mẹ 1" /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="barn_id" label="Chuồng trại" rules={[{ required: true, message: 'Chọn chuồng' }]}>
                <Select showSearch options={barns.map(b => ({ label: b.name, value: b.id }))} placeholder="Chọn..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="category" label="Phân loại" rules={[{ required: true, message: 'Chọn loại' }]}>
                <Select options={Object.entries(CATEGORY_MAP).map(([val, label]) => ({ label, value: val }))} />
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item name="breed" label="Giống lợn"><Input placeholder="VD: Duroc, Landrace" /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="gender" label="Giới tính" rules={[{ required: true }]}>
                <Select options={Object.entries(GENDER_MAP).map(([val, label]) => ({ label, value: val }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="dob" label="Ngày sinh"><DatePicker className="w-100" format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={8}><Form.Item name="entry_date" label="Ngày nhập đàn" rules={[{ required: true }]}><DatePicker className="w-100" format="DD/MM/YYYY" /></Form.Item></Col>
            {editingId && (
              <Col span={8}>
                <Form.Item name="lifecycle_status" label="Trạng thái sống" rules={[{ required: true }]}>
                  <Select options={Object.entries(STATUS_MAP).map(([val, cfg]) => ({ label: cfg.text, value: val }))} />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="entry_weight" label="Trọng lượng lúc nhập (kg)"><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="current_weight" label="Trọng lượng hiện tại (kg)"><InputNumber min={0} className="w-100" /></Form.Item></Col>
          </Row>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Các đặc điểm nhận dạng hoặc ghi chú khác..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}