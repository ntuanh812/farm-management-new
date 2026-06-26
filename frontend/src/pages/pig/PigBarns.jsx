import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input,
  Select, InputNumber, message, Popconfirm, Card, Row, Col, Progress
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, CheckCircleOutlined, WarningOutlined, TeamOutlined } from '@ant-design/icons';
import axiosClient from '@/utils/axiosClient';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { BARN_TYPES, BARN_STATUS_MAP } from '@/utils/constants';

export default function PigBarns() {
  const { user } = useAuthStore();

  const [barns, setBarns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  const canAdd = user?.role === 'ADMIN';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/barns`);
      if (data.success) {
        setBarns(data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách chuồng trại');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Thêm computedStatus cho chuồng
  const augmentedBarns = useMemo(() => {
    return barns.map(b => ({
      ...b,
      computedStatus: b.status === 'MAINTENANCE' ? 'MAINTENANCE' : ((b.current_quantity || 0) >= (b.capacity || 1) ? 'FULL' : 'ACTIVE')
    }));
  }, [barns]);

  // Tính toán thống kê chuồng trại
  const stats = useMemo(() => {
    const active = augmentedBarns.filter(b => b.computedStatus === 'ACTIVE').length;
    const full = augmentedBarns.filter(b => b.computedStatus === 'FULL').length;
    const totalPigs = augmentedBarns.reduce((sum, b) => sum + (b.current_quantity || 0), 0);
    const totalCapacity = augmentedBarns.reduce((sum, b) => sum + (b.capacity || 0), 0);
    return { total: augmentedBarns.length, active, full, totalPigs, totalCapacity };
  }, [augmentedBarns]);

  // Lọc dữ liệu hiển thị trên bảng
  const filteredBarns = useMemo(() => {
    return augmentedBarns.filter(b => {
      const matchSearch = !searchText || 
        (b.code || '').toLowerCase().includes(searchText.toLowerCase()) || 
        (b.name || '').toLowerCase().includes(searchText.toLowerCase());
      const matchType = !filterType || b.barn_type === filterType;
      const matchStatus = !filterStatus || b.computedStatus === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [augmentedBarns, searchText, filterType, filterStatus]);

  const editingBarn = useMemo(() => {
    if (!editingId) return null;
    return augmentedBarns.find(b => b.id === editingId);
  }, [editingId, augmentedBarns]);

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
      await axiosClient.delete(`/barns/${id}`);
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
        await axiosClient.put(`/barns/${editingId}`, values);
        message.success('Cập nhật chuồng thành công');
      } else {
        await axiosClient.post(`/barns`, values);
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
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
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
      key: 'computedStatus',
      render: (_, record) => {
        const cfg = BARN_STATUS_MAP[record.computedStatus];
        return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : <Tag>{record.computedStatus}</Tag>;
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
      render: (_, record) => (
        <Space size="middle">
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              className="text-primary"
              onClick={() => handleOpenEdit(record)}
              title="Sửa"
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Chắc chắn xóa chuồng này?"
              description="Chỉ xóa được nếu chuồng không còn lợn."
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
    <div className="dashboard pig-barns-page">
      <PageHeader
        title="Quản lý Chuồng trại"
        subtitle="Theo dõi sức chứa, loại chuồng và trạng thái hoạt động"
        actions={
          canAdd && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Thêm chuồng mới
            </Button>
          )
        }
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
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

      <Card className="table-card" style={{ marginTop: 24 }}>
        <Form 
          layout="inline" 
          style={{ marginBottom: 16 }}
          onValuesChange={(_, values) => {
            setSearchText(values.search);
            setFilterType(values.type);
            setFilterStatus(values.status);
          }}
        >
          <Form.Item name="search">
            <Input.Search placeholder="Tìm mã hoặc tên chuồng..." allowClear style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="type">
            <Select placeholder="Loại chuồng" allowClear options={Object.entries(BARN_TYPES).map(([val, label]) => ({ label, value: val }))} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="Trạng thái" allowClear options={Object.entries(BARN_STATUS_MAP).map(([val, cfg]) => ({ label: cfg.text, value: val }))} style={{ width: 160 }} />
          </Form.Item>
        </Form>
        <Table
          columns={columns}
          dataSource={filteredBarns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Cập nhật thông tin chuồng' : 'Thêm chuồng mới'}
        open={open}
        onCancel={() => { setOpen(false); setEditingId(null); form.resetFields(); }}
        onOk={handleSubmit}
        okText="Lưu thông tin"
        cancelText="Hủy"
        width={600}
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="code" 
                label="Mã chuồng" 
                rules={[
                  { required: true, message: 'Vui lòng nhập mã chuồng' },
                  () => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      const exists = barns.find(b => b.code === value);
                      if (exists && exists.id !== editingId) {
                        return Promise.reject(new Error('Mã chuồng này đã tồn tại!'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
                <Input placeholder="VD: B01, NAI-01..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên chuồng"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên chuồng' },
                  () => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      const exists = barns.find(
                        b => b.name.trim().toLowerCase() === value.trim().toLowerCase()
                      );
                      if (exists && exists.id !== editingId) {
                        return Promise.reject(new Error('Tên chuồng này đã tồn tại!'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
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
            <Form.Item label="Trạng thái">
              {editingBarn?.computedStatus === 'FULL' ? (
                <Input value="Đã đầy" disabled />
              ) : (
                <Form.Item name="status" noStyle rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}>
                  <Select options={[
                    { label: 'Hoạt động', value: 'ACTIVE' },
                    { label: 'Bảo trì', value: 'MAINTENANCE' }
                  ]} />
                </Form.Item>
              )}
            </Form.Item>
          )}

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Ghi chú thêm về chuồng (nếu có)..." />
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </div>
  );
}