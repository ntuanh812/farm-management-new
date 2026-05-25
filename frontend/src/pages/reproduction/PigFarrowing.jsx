import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Card, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
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
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resFarrow, resPigs, resStaff] = await Promise.all([
        axios.get(`${API}/farrowings`, { headers }),
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/employees`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      setFarrowings(resFarrow.data?.data || []);
      setPigs(resPigs.data?.data || []);
      setStaffList(resStaff.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu đẻ con');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSows = useMemo(() => pigs.filter(p => p.lifecycleStatus === 'ACTIVE' && p.category === 'SOW'), [pigs]);

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
      };

      await axios.post(`${API}/farrowings`, payload, { headers });
      message.success('Ghi nhận đẻ con thành công');
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
    <div className="pig-farrowing-page">
      <PageHeader
        title="Quản lý Đẻ con"
        subtitle="Ghi nhận số lượng lợn sơ sinh và tình trạng sinh sản"
        actions={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Ghi nhận đẻ
          </Button>
        )}
      />

      <Card className="table-card">
        <Table columns={columns} dataSource={farrowings} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal 
        title="Ghi nhận nái đẻ" 
        open={open} 
        onCancel={() => setOpen(false)} 
        onOk={handleSubmit} 
        okText="Lưu thông tin" 
        cancelText="Hủy"
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Form.Item name="sow_id" label="Lợn nái mẹ" rules={[{ required: true, message: 'Chọn nái' }]}>
            <Select showSearch placeholder="Chọn lợn nái">
              {activeSows.map(p => <Select.Option key={p.id} value={p.id}>{p.earTag}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="farrow_date" label="Ngày đẻ" rules={[{ required: true, message: 'Chọn ngày đẻ' }]}>
            <DatePicker className="w-100" format="DD/MM/YYYY" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="alive_piglets" label="Số con sống" rules={[{ required: true }]}><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="dead_piglets" label="Số chết/tật" initialValue={0}><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="total_weight" label="Tổng Kg (ổ)"><InputNumber min={0} step={0.1} className="w-100" /></Form.Item></Col>
          </Row>

          <Form.Item name="staff_name" label="Người phụ trách / Đỡ đẻ">
            <Select showSearch placeholder="Chọn nhân viên">
              {staffList.map((x) => <Select.Option key={x.id} value={x.full_name}>{x.full_name}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Sức khỏe nái mẹ, vấn đề phát sinh..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}