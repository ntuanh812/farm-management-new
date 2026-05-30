import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Card, Row, Col, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UsergroupAddOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function PigFarrowing() {
  const { token, user } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [farrowings, setFarrowings] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [breedings, setBreedings] = useState([]);
  const [barns, setBarns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resFarrow, resPigs, resBreedings, resBarns] = await Promise.all([
        axios.get(`${API}/farrowings`, { headers }),
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/breedings`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/barns`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);
      setFarrowings(resFarrow.data?.data || []);
      setPigs(resPigs.data?.data || []);
      setBreedings(resBreedings.data?.data || []);
      setBarns(resBarns.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu đẻ con');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const eligibleSows = useMemo(() => {
    // 1. Lọc ra các lượt phối giống đang ở trạng thái SUCCESS (Đậu thai) trước
    const successBreedings = breedings.filter(b => b.status === 'SUCCESS');

    // 2. Lấy lượt SUCCESS mới nhất của mỗi con nái (tránh bị che khuất bởi các lượt PENDING tạo nhầm)
    const latestSuccess = new Map();
    successBreedings.forEach(b => {
      const current = latestSuccess.get(b.sow_id);
      if (!current || dayjs(b.breeding_date).isAfter(dayjs(current.breeding_date))) {
        latestSuccess.set(b.sow_id, b);
      }
    });

    // 3. Loại bỏ nái đã đẻ (kiểm tra xem có bản ghi đẻ nào diễn ra sau ngày phối này không)
    const validBreedings = Array.from(latestSuccess.values()).filter(b => {
      const hasFarrowed = farrowings.some(f => 
        f.sow_id === b.sow_id && 
        dayjs(f.farrow_date).isAfter(dayjs(b.breeding_date))
      );
      
      if (hasFarrowed) return false;

      // 4. Lọc thời gian dự sinh <= 14 ngày (nới lỏng thời gian để không bị ẩn lợn)
      if (!b.expected_farrow_date) return false;
      const daysToFarrow = dayjs(b.expected_farrow_date).diff(dayjs().startOf('day'), 'day');
      return daysToFarrow <= 14;
    });

    return validBreedings.map(b => {
      const pig = pigs.find(p => p.id === b.sow_id);
      return {
        id: b.sow_id,
        pigLabel: pig ? `Lợn số ${pig.id}` : `Lợn số ${b.sow_code}`,
        expected_farrow_date: b.expected_farrow_date
      };
    }).filter(s => s.pigLabel || s.id);
  }, [breedings, pigs, farrowings]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/farrowings/${id}`, { headers });
      message.success('Đã xóa ổ đẻ và các lợn con tương ứng. Nái mẹ được trả về trạng thái Đậu thai!');
      fetchData();
    } catch (error) {
      message.error('Không thể xóa bản ghi này');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      sow_id: record.sow_id,
      alive_piglets: record.alive_piglets,
      dead_piglets: record.dead_piglets,
      total_weight: record.total_weight,
      farrow_date: dayjs(record.farrow_date),
      note: record.note,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        total_weight: values.total_weight ?? null,
        farrow_date: values.farrow_date.format('YYYY-MM-DD'),
        staff_name: user?.full_name || user?.username || 'Hệ thống',
      };

      if (editingRecord) {
        await axios.put(`${API}/farrowings/${editingRecord.id}`, payload, { headers });
        message.success('Cập nhật thông tin thành công');
      } else {
        await axios.post(`${API}/farrowings`, payload, { headers });
        message.success('Ghi nhận đẻ con thành công');
      }
      setOpen(false);
      setEditingRecord(null);
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
      render: (_, record) => farrowings.indexOf(record) + 1,
    },
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
      render: (text) => <span className="text-pink fw-500">Lợn số {text}</span>
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
      render: (_, record) => (
        <Space size="small">
          {canEdit && (
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} title="Sửa" />
          )}
          {canDelete && (
            <Popconfirm 
              title="Chắc chắn xóa bản ghi đẻ con này?" 
              description="Lợn mẹ sẽ được hoàn tác về trạng thái Đậu thai."
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
    <div className="dashboard pig-farrowing-page">
      <PageHeader
        title="Quản lý Đẻ con"
        subtitle="Ghi nhận số lượng lợn sơ sinh và tình trạng sinh sản"
        actions={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { 
            setEditingRecord(null);
            form.resetFields(); 
            setOpen(true); 
          }}>
            Ghi nhận đẻ
          </Button>
        )}
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
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

      <Card className="table-card" style={{ marginTop: 24 }}>
        <Table columns={columns} dataSource={farrowings} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal 
        title={editingRecord ? "Cập nhật thông tin đẻ" : "Ghi nhận nái đẻ"}
        open={open} 
        onCancel={() => { setOpen(false); setEditingRecord(null); }} 
        onOk={handleSubmit} 
        okText="Lưu thông tin" 
        cancelText="Hủy"
        footer={canEdit ? undefined : null}
        width={650}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Form.Item name="sow_id" label="Lợn nái mẹ" rules={[{ required: true, message: 'Chọn nái' }]}>
            <Select disabled={!!editingRecord} showSearch placeholder="Chỉ hiển thị nái đậu thai và cách dự sinh <= 14 ngày">
              {editingRecord ? (
                <Select.Option value={editingRecord.sow_id}>{editingRecord.sow_code}</Select.Option>
              ) : (
                eligibleSows.map(p => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.pigLabel} (Dự sinh: {p.expected_farrow_date ? dayjs(p.expected_farrow_date).format('DD/MM/YYYY') : 'Không rõ'})
                  </Select.Option>
                ))
              )}
            </Select>
          </Form.Item>


          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="alive_piglets" label="Số con sống" rules={[{ required: true }]}>
                <InputNumber min={0} className="w-100" disabled={!!editingRecord} onChange={() => form.validateFields(['piglet_barn_id']).catch(() => {})} />
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item name="dead_piglets" label="Số chết/tật" initialValue={0}><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="total_weight" label="Tổng Kg (ổ)"><InputNumber min={0} step={0.1} className="w-100" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              {!editingRecord && (
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.alive_piglets !== curr.alive_piglets}>
                {({ getFieldValue }) => {
                  
                  // Chỉ cho phép chọn các chuồng thuộc loại PIGLET (Chuồng lợn con) đang hoạt động
                  const validBarns = barns.filter(b => (b.status === 'ACTIVE' || !b.status) && b.barn_type === 'PIGLET');

                  return (
                    <Form.Item 
                      name="piglet_barn_id" 
                      label="Chuồng nuôi lợn con" 
                      rules={[
                        { required: true, message: 'Chọn chuồng cho lợn con' },
                        () => ({
                          validator(_, value) {
                            if (!value) return Promise.resolve();
                            const barn = barns.find(b => b.id === value);
                            if (barn) {
                              const available = (barn.capacity || 9999) - (barn.current_quantity || 0);
                              if (available < (getFieldValue('alive_piglets') || 0)) {
                                return Promise.reject(new Error(`Cảnh báo: Chuồng này chỉ còn trống ${available} chỗ`));
                              }
                            }
                            return Promise.resolve();
                          }
                        })
                      ]}
                    >
                      <Select showSearch placeholder="Chọn chuồng lợn con...">
                        {validBarns.map(b => (
                          <Select.Option key={b.id} value={b.id}>
                            {b.name} (Trống: {(b.capacity || 9999) - (b.current_quantity || 0)} chỗ)
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  );
                }}
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              <Form.Item name="farrow_date" label="Ngày đẻ thực tế" initialValue={dayjs()} rules={[{ required: true, message: 'Vui lòng chọn ngày đẻ' }]}>
                <DatePicker 
                  format="DD/MM/YYYY" 
                  className="w-100" 
                  disabledDate={(current) => current && current > dayjs().endOf('day')} 
                />
              </Form.Item>
            </Col>
          </Row>

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
    </div>
  );
}
      