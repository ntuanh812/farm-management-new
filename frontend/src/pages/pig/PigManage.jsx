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
  'SOW': 'Lợn nái',
  'BOAR': 'Lợn đực',
  'PIGLET': 'Lợn con',
  'FATTENING': 'Lợn thịt'
};

const STATUS_MAP = {
  'ACTIVE': { text: 'Khỏe mạnh', color: 'green' },
  'SICK': { text: 'Đang bệnh', color: 'orange' },
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
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filterBarn, setFilterBarn] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPigs, resBarns, resReports] = await Promise.all([
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/barns`, { headers }),
        axios.get(`${API}/pig-reports`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);

      if (resPigs.data.success) setPigs(resPigs.data.data);
      if (resBarns.data.success) setBarns(resBarns.data.data);
      if (resReports.data?.data) setReports(resReports.data.data);
    } catch (error) {
      message.error('Không thể tải dữ liệu đàn lợn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Kết hợp trạng thái từ báo cáo lợn bệnh
  const augmentedPigs = useMemo(() => {
    return pigs.map(p => {
      const code = p.earTag || p.pig_code || p.pigCode;
      // Kiểm tra có báo cáo lợn bệnh nào chưa xử lý (cho_xu_ly, dang_xu_ly) không
      const hasActiveReport = reports.some(r => r.pig_id === code && r.status !== 'da_xu_ly');
      
      let status = p.lifecycleStatus || p.lifecycle_status;
      if (status === 'ACTIVE' && hasActiveReport) {
        status = 'SICK';
      }
      
      return {
        ...p,
        isSick: hasActiveReport,
        computedStatus: status
      };
    });
  }, [pigs, reports]);

  // Tính toán thống kê từ danh sách lợn
  const stats = useMemo(() => {
    const activePigs = augmentedPigs.filter(p => p.lifecycleStatus === 'ACTIVE' || p.lifecycle_status === 'ACTIVE');
    return {
      total: activePigs.length,
      fattening: activePigs.filter(p => p.category === 'FATTENING').length,
      breeding: activePigs.filter(p => p.category === 'SOW' || p.category === 'BOAR').length,
      piglet: activePigs.filter(p => p.category === 'PIGLET').length,
    };
  }, [augmentedPigs]);

  // Lọc dữ liệu hiển thị trên bảng
  const filteredPigs = useMemo(() => {
    const filtered = augmentedPigs.filter(p => {
      const code = p.earTag || p.pig_code || p.pigCode || '';
      const matchSearch = !searchText || code.toLowerCase().includes(searchText.toLowerCase());
      const bId = p.barnId || p.barn_id;
      const matchBarn = !filterBarn || bId === filterBarn;
      const matchCategory = !filterCategory || p.category === filterCategory;
      const matchStatus = !filterStatus || p.computedStatus === filterStatus;
      return matchSearch && matchBarn && matchCategory && matchStatus;
    });
    // Đảo ngược mảng để lợn con mới sinh/lợn mới nhập luôn lên đầu bảng
    return filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [augmentedPigs, searchText, filterBarn, filterCategory, filterStatus]);

  const handleOpenAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ lifecycle_status: 'ACTIVE', gender: 'male' });
    setOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      pig_code: record.earTag || record.pig_code || record.pigCode,
      name: record.name,
      barn_id: record.barnId || record.barn_id,
      category: record.category,
      lifecycle_status: record.lifecycleStatus || record.lifecycle_status,
      breed: record.breed,
      gender: record.gender,
      dob: record.dob ? dayjs(record.dob) : null,
      entry_date: (record.arrivedAt || record.entry_date) ? dayjs(record.arrivedAt || record.entry_date) : null,
      entry_weight: record.entry_weight,
      current_weight: record.weightKg || record.current_weight,
      purchase_price: record.purchasePrice || record.purchase_price,
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
      key: 'earTag',
      render: (_, r) => <strong>{r.earTag || r.pig_code || r.pigCode}</strong>,
    },
    {
      title: 'Chuồng',
      key: 'barnName',
      render: (_, r) => <span>{r.barnName || r.barn_name}</span>,
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
      title: 'Ngày nhập',
      key: 'arrivedAt',
      render: (_, r) => {
        const date = r.arrivedAt || r.entry_date;
        return date ? dayjs(date).format('DD/MM/YYYY') : '-';
      },
    },
    {
      title: 'Tuổi',
      key: 'ageDays',
      render: (_, r) => {
        const days = r.ageDays;
        if (days != null) return `${days} ngày`;
        if (r.dob) return `${dayjs().diff(dayjs(r.dob), 'day')} ngày`;
        return '-';
      },
    },
    {
      title: 'Lưu chuồng',
      key: 'daysInFarm',
      render: (_, r) => {
        const date = r.arrivedAt || r.entry_date;
        return date ? `${dayjs().diff(dayjs(date), 'day')} ngày` : '-';
      },
    },
    {
      title: 'Trọng lượng',
      key: 'weightKg',
      render: (_, r) => {
        const w = r.weightKg || r.current_weight || r.entry_weight;
        return w ? `${w} kg` : '-';
      },
    },
    {
      title: 'Trạng thái',
      key: 'lifecycleStatus',
      render: (_, r) => {
        const status = r.computedStatus;
        const cfg = STATUS_MAP[status];
        return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : <Tag>{status}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => {
        const status = record.computedStatus;
        return canEdit && (
          <Space size="middle">
            <Button
              type="text"
              icon={<EditOutlined />}
              className={['DEAD', 'SOLD'].includes(status) ? "" : "text-primary"}
              onClick={() => handleOpenEdit(record)}
              title={['DEAD', 'SOLD'].includes(status) ? "Không thể sửa cá thể lợn đã chết hoặc xuất bán" : "Sửa"}
              disabled={['DEAD', 'SOLD'].includes(status)}
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
        );
      },
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
              <span className="stat-card__title">{user?.role === 'FARM_WORKER' ? 'Tổng đàn đang quản lý' : 'Tổng đàn hiện tại'}</span>
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
              <span className="stat-card__title">{user?.role === 'FARM_WORKER' ? 'Lợn thịt đang quản lý' : 'Lợn thịt'}</span>
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
              <span className="stat-card__title">{user?.role === 'FARM_WORKER' ? 'Lợn sinh sản đang quản lý' : 'Lợn sinh sản'}</span>
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
              <span className="stat-card__title">{user?.role === 'FARM_WORKER' ? 'Lợn con đang quản lý' : 'Lợn con'}</span>
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
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Tìm theo số tai..."
            allowClear
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
          <Select
            placeholder="Lọc theo chuồng"
            allowClear
            options={barns.map(b => ({ label: b.name, value: b.id }))}
            onChange={setFilterBarn}
            style={{ width: 180 }}
          />
          <Select
            placeholder="Loại lợn"
            allowClear
            options={Object.entries(CATEGORY_MAP).map(([val, label]) => ({ label, value: val }))}
            onChange={setFilterCategory}
            style={{ width: 160 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            options={Object.entries(STATUS_MAP).map(([val, cfg]) => ({ label: cfg.text, value: val }))}
            onChange={setFilterStatus}
            style={{ width: 160 }}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={filteredPigs}
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
                <Select disabled={!!editingId} showSearch options={barns.map(b => ({ label: b.name, value: b.id }))} placeholder="Chọn..." />
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
                <Select disabled={!!editingId} options={Object.entries(GENDER_MAP).map(([val, label]) => ({ label, value: val }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="dob" label="Ngày sinh"><DatePicker className="w-100" format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={8}><Form.Item name="entry_date" label="Ngày nhập đàn" rules={[{ required: true }]}><DatePicker className="w-100" format="DD/MM/YYYY" /></Form.Item></Col>
            {editingId && (
              <Col span={8}>
                <Form.Item name="lifecycle_status" label="Trạng thái" tooltip="Trạng thái được tự động cập nhật qua các chức năng Xuất bán hoặc Lợn chết">
                  <Select disabled options={Object.entries(STATUS_MAP).map(([val, cfg]) => ({ label: cfg.text, value: val }))} />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="entry_weight" label="Trọng lượng lúc nhập (kg)"><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="current_weight" label="Trọng lượng hiện tại (kg)"><InputNumber min={0} className="w-100" /></Form.Item></Col>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.category !== curr.category}>
              {({ getFieldValue }) => getFieldValue('category') === 'FATTENING' ? (
                <Col span={8}>
                  <Form.Item name="purchase_price" label="Giá nhập (VNĐ)">
                    <InputNumber min={0} className="w-100" step={1000} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} />
                  </Form.Item>
                </Col>
              ) : null}
            </Form.Item>
          </Row>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Các đặc điểm nhận dạng hoặc ghi chú khác..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}