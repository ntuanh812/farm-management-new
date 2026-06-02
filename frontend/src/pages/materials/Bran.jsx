import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Card, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, ImportOutlined, AppstoreOutlined, DatabaseOutlined, LineChartOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Bran() {
  const { token, user } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [feedUsages, setFeedUsages] = useState([]);
  const [barns, setBarns] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [addFeedForm] = Form.useForm();
  const [importForm] = Form.useForm();
  
  const [isAddFeedModalOpen, setIsAddFeedModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Phân quyền
  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resUsages, resBarns, resFeeds] = await Promise.all([
        axios.get(`${API}/feed-usages`, { headers }),
        axios.get(`${API}/barns`, { headers }),
        axios.get(`${API}/feeds`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      setFeedUsages(resUsages.data?.data || []);
      setBarns(resBarns.data?.data || []);
      setFeeds(resFeeds.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu sử dụng cám');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        used_at: values.used_at.format('YYYY-MM-DD')
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

  const handleAddFeed = async () => {
    try {
      const values = await addFeedForm.validateFields();
      await axios.post(`${API}/feeds`, values, { headers });
      message.success('Thêm loại cám thành công');
      setIsAddFeedModalOpen(false);
      addFeedForm.resetFields();
      fetchData(); 
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể thêm loại cám');
    }
  };

  const handleImportSubmit = async () => {
    try {
      const values = await importForm.validateFields();
      await axios.put(`${API}/feeds/${values.feed_id}/stock`, { quantity: values.quantity }, { headers });
      message.success('Nhập thêm cám vào kho thành công');
      setIsImportModalOpen(false);
      importForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể nhập kho');
    }
  };

  const stats = useMemo(() => {
    const totalFeedTypes = feeds.length;
    const totalStock = feeds.reduce((sum, f) => sum + (Number(f.stock) || 0), 0);
    const totalUsed = feedUsages.reduce((sum, u) => sum + (Number(u.quantity_kg) || 0), 0);
    const lowStock = feeds.filter(f => (Number(f.stock) || 0) < 50).length;

    return { totalFeedTypes, totalStock, totalUsed, lowStock };
  }, [feeds, feedUsages]);

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    { title: 'Ngày', dataIndex: 'used_at', key: 'used_at', render: (date) => dayjs(date).format('DD/MM/YYYY') },
    { title: 'Chuồng', dataIndex: 'barn_name', key: 'barn_name' },
    { title: 'Loại cám', dataIndex: 'feed_name', key: 'feed_name', render: (_, r) => <strong className="text-primary">{r.feed_name || r.feed_type}</strong> },
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
    <div className="dashboard bran-page">
      <PageHeader
        title="Sử dụng Thức ăn (Cám)"
        subtitle="Ghi nhận và theo dõi lịch sử tiêu thụ cám của các chuồng"
        actions={canEdit && (
          <Space>
            <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>Nhập kho cám</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Ghi nhận cho ăn
            </Button>
          </Space>
        )}
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--barn">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng loại cám</span>
                <div className="stat-card__icon"><AppstoreOutlined /></div>
              </div>
              <div className="stat-card__value">
                {stats.totalFeedTypes}
                <span className="stat-card__label"> loại</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--pigs">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng tồn kho</span>
                <div className="stat-card__icon"><DatabaseOutlined /></div>
              </div>
              <div className="stat-card__value">
                {Math.round(stats.totalStock).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                <span className="stat-card__label"> kg</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--daily-tasks">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng đã cho ăn</span>
                <div className="stat-card__icon"><LineChartOutlined /></div>
              </div>
              <div className="stat-card__value">
                {Math.round(stats.totalUsed).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                <span className="stat-card__label"> kg</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--staff">
              <div className="stat-card__header">
                <span className="stat-card__title">Sắp hết (Dưới 50kg)</span>
                <div className="stat-card__icon"><WarningOutlined /></div>
              </div>
              <div className="stat-card__value text-danger" style={{ color: stats.lowStock > 0 ? '#ff4d4f' : 'inherit' }}>
                {stats.lowStock}
                <span className="stat-card__label"> loại</span>
              </div>
            </Card>
          </Col>
        </Row>

        <Card className="table-card" style={{ marginTop: 24 }}>
          <Table columns={columns} dataSource={feedUsages} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
        </Card>

      <Modal 
        title="Ghi nhận sử dụng cám" 
        open={open} 
        onCancel={() => setOpen(false)} 
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
          <Form.Item label="Loại cám" required>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Form.Item name="feed_id" noStyle rules={[{ required: true, message: 'Chọn loại cám' }]}>
                <Select showSearch options={feeds.map(f => ({ label: `${f.name} (Tồn: ${f.stock || 0} kg)`, value: f.id }))} placeholder="Chọn loại cám..." style={{ flex: 1 }} />
              </Form.Item>
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsAddFeedModalOpen(true)} title="Thêm loại cám mới" />
            </div>
          </Form.Item>
          <Form.Item name="quantity_kg" label="Số lượng (kg)" rules={[{ required: true, message: 'Nhập số lượng kg' }]}>
            <InputNumber min={0.1} step={0.1} className="w-100" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title="Thêm loại cám mới" 
        open={isAddFeedModalOpen} 
        onCancel={() => setIsAddFeedModalOpen(false)}
        onOk={handleAddFeed}
        okText="Thêm mới"
        cancelText="Hủy"
      >
        <Form form={addFeedForm} layout="vertical">
          <Form.Item name="name" label="Tên loại cám" rules={[{ required: true, message: 'Vui lòng nhập tên cám' }]}>
            <Input placeholder="Ví dụ: Cám lợn con tập ăn..." />
          </Form.Item>
          <Form.Item name="stock" label="Số lượng tồn ban đầu (kg)">
            <InputNumber min={0} className="w-100" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Nhập thêm cám vào kho" open={isImportModalOpen} onCancel={() => setIsImportModalOpen(false)} onOk={handleImportSubmit} okText="Xác nhận" cancelText="Hủy">
        <Form form={importForm} layout="vertical">
          <Form.Item label="Loại cám" required>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Form.Item name="feed_id" noStyle rules={[{ required: true, message: 'Chọn loại cám để nhập' }]}>
                <Select showSearch options={feeds.map(f => ({ label: `${f.name} (Tồn hiện tại: ${f.stock || 0} kg)`, value: f.id }))} placeholder="Chọn loại cám..." style={{ flex: 1 }} />
              </Form.Item>
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsAddFeedModalOpen(true)} title="Thêm loại cám mới" />
            </div>
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng nhập thêm (kg)" rules={[{ required: true, message: 'Nhập số lượng' }]}>
            <InputNumber min={0.1} step={0.1} className="w-100" placeholder="Ví dụ: 100" />
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </div>
  );
}