import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Card, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, UsergroupAddOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function PigFarrowing() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [farrowings, setFarrowings] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [breedings, setBreedings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resFarrow, resPigs, resBreedings] = await Promise.all([
        axios.get(`${API}/farrowings`, { headers }),
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/breedings`, { headers }),
      ]);
      setFarrowings(resFarrow.data?.data || []);
      setPigs(resPigs.data?.data || []);
      setBreedings(resBreedings.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu đẻ con');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lọc ra danh sách những lợn nái đang đậu thai (SUCCESS) và đã đến kỳ đẻ
  const pregnantSows = useMemo(() => {
    const pregnantSowIds = breedings.filter(b => {
      if (b.status !== 'SUCCESS') return false;
      if (!b.expected_farrow_date) return false;
      // Chỉ hiện những con đã đến kỳ đẻ (Hôm nay >= Ngày dự sinh - 7 ngày)
      const daysDiff = dayjs().startOf('day').diff(dayjs(b.expected_farrow_date).startOf('day'), 'day');
      return daysDiff >= -7;
    }).map(b => b.sow_id);
    return pigs.filter(p => p.lifecycleStatus === 'ACTIVE' && p.category === 'SOW' && pregnantSowIds.includes(p.id));
  }, [pigs, breedings]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/farrowings/${id}`, { headers });
      message.success('Đã xóa bản ghi đẻ con');
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
        farrow_date: values.farrow_date.format('YYYY-MM-DD'),
        staff_name: user?.full_name || user?.username || 'Hệ thống',
      };

      const { data } = await axios.post(`${API}/farrowings`, payload, { headers });
      message.success(data.message || 'Ghi nhận đẻ con thành công');
      setOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const columns = [
    {
      title: 'Ngày đẻ',
      dataIndex: 'farrow_date',
      key: 'farrow_date',
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Nái mẹ',
      dataIndex: 'sow_code',
      key: 'sow_code',
      render: (text) => <span className="text-pink fw-500">{text}</span>
    },
    {
      title: 'Số con sống',
      dataIndex: 'alive_piglets',
      key: 'alive_piglets',
      render: (val) => <strong className="text-success">{val}</strong>
    },
    {
      title: 'Chết/Tật',
      dataIndex: 'dead_piglets',
      key: 'dead_piglets',
      render: (val) => val > 0 ? <strong className="text-danger">{val}</strong> : <span>{val}</span>
    },
    {
      title: 'Tổng trọng lượng',
      dataIndex: 'total_weight',
      key: 'total_weight',
      render: (val) => val ? `${val} kg` : '-'
    },
    {
      title: 'Người đỡ đẻ',
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
    <div className="dashboard pig-farrowing-page">
      <PageHeader
        title="Quản lý Đẻ con"
        subtitle="Ghi nhận số lượng lợn sơ sinh và tình trạng sinh sản"
        actions={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Ghi nhận đẻ
          </Button>
        )}
      />

      <Row gutter={[20, 20]} className="dashboard-stats mb-24 mt-24">
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card stat-card--pigs">
            <div className="stat-card__header">
              <span className="stat-card__title">Tổng số ổ đẻ</span>
              <div className="stat-card__icon"><UsergroupAddOutlined /></div>
            </div>
            <div className="stat-card__value">
              {farrowings.length}
              <span className="stat-card__label"> ổ</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card stat-card--barn">
            <div className="stat-card__header">
              <span className="stat-card__title">Lợn con sơ sinh (Sống)</span>
              <div className="stat-card__icon"><CheckCircleOutlined /></div>
            </div>
            <div className="stat-card__value">
              {farrowings.reduce((sum, f) => sum + (f.alive_piglets || 0), 0)}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card stat-card--daily-tasks">
            <div className="stat-card__header">
              <span className="stat-card__title">Lợn con (Chết/Tật)</span>
              <div className="stat-card__icon"><WarningOutlined /></div>
            </div>
            <div className="stat-card__value">
              {farrowings.reduce((sum, f) => sum + (f.dead_piglets || 0), 0)}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="table-card">
        <Table columns={columns} dataSource={farrowings} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal 
        title="Ghi nhận nái đẻ" 
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
          <Form.Item name="sow_id" label="Lợn nái mẹ (Đã đến kỳ đẻ)" rules={[{ required: true, message: 'Chọn nái' }]}>
            <Select showSearch placeholder="Chỉ hiện nái đến kỳ đẻ (>= Ngày dự sinh - 7 ngày)">
              {pregnantSows.map(p => <Select.Option key={p.id} value={p.id}>{p.earTag}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.sow_id !== curr.sow_id}>
            {({ getFieldValue }) => {
              const sId = getFieldValue('sow_id');
              // Tìm phiếu phối giống Đậu thai của con nái này để lấy ngày dự sinh
              const breeding = breedings.find(b => b.sow_id === sId && b.status === 'SUCCESS');
              const minDate = breeding?.expected_farrow_date;
              return (
                <>
                  <Form.Item name="farrow_date" label="Ngày đẻ" rules={[{ required: true, message: 'Chọn ngày đẻ' }]} style={minDate ? { marginBottom: 4 } : {}}>
                    <DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => {
                      if (!current) return false;
                      const isFuture = current > dayjs().endOf('day');
                      const isBeforeMin = minDate && current < dayjs(minDate).subtract(7, 'day').startOf('day');
                      return isFuture || isBeforeMin;
                    }} placeholder="Chọn ngày đẻ..." />
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="alive_piglets" label="Số con sống" rules={[{ required: true }]}><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="dead_piglets" label="Số chết/tật" initialValue={0}><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="total_weight" label="Tổng Kg (ổ)"><InputNumber min={0} step={0.1} className="w-100" /></Form.Item></Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.alive_piglets !== curr.alive_piglets}>
            {({ getFieldValue }) => getFieldValue('alive_piglets') > 0 && (
              <Form.Item
                name="piglet_barn_id"
                label="Chuyển lợn con sang chuồng"
                rules={[{ required: true, message: 'Vui lòng chọn chuồng cho lợn con' }]}
              >
                <Select showSearch placeholder="Chọn chuồng cho đàn con...">
                  {barns.map(b => <Select.Option key={b.id} value={b.id}>{b.name} ({b.code})</Select.Option>)}
                </Select>
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {() => {
              const alive = form.getFieldValue('alive_piglets') || 0;
              const dead = form.getFieldValue('dead_piglets') || 0;
              const weight = form.getFieldValue('total_weight') || 0;
              const totalPigs = alive + dead;
              
              if (totalPigs > 0 && weight > 0) {
                const avg = (weight / totalPigs).toFixed(2);
                return (
                  <div style={{ marginBottom: 16, color: '#1890ff', fontWeight: 500 }}>
                    💡 Trọng lượng sơ sinh trung bình: {avg} kg/con
                  </div>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Sức khỏe nái mẹ, vấn đề phát sinh..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}