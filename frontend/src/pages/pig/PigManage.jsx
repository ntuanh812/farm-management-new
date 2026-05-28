import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input,
  Select, DatePicker, InputNumber, message, Popconfirm, Card, Row, Col, Descriptions, Spin, Alert, Divider
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, ShoppingCartOutlined, HeartOutlined, DashboardOutlined, EyeOutlined } from '@ant-design/icons';
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
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [pigs, setPigs] = useState([]);
  const [barns, setBarns] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // Detail View States
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPig, setSelectedPig] = useState(null);
  const [pigHistory, setPigHistory] = useState({ movements: [], vaccinations: [], reports: [], medicines: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filterBarn, setFilterBarn] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
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
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleViewDetail = async (record) => {
    setSelectedPig(record);
    setDetailOpen(true);
    setLoadingHistory(true);
    try {
      const pigCode = record.earTag || record.pig_code || record.pigCode;
      const bId = record.barnId || record.barn_id;
      const entryDate = record.entryDate || record.entry_date;
      
      const [moveRes, vacRes, repRes, medRes] = await Promise.all([
        axios.get(`${API}/movements`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/vaccinations`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/pig-reports`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/medicine-usages`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);

      const moves = (moveRes.data?.data || []).filter(m => m.pigId === record.id || m.pig_id === record.id);
      const reps = (repRes.data?.data || []).filter(r => r.pig_id === pigCode);

      // Sort movements descending by move_date
      const sortedMoves = [...moves].sort((a, b) => dayjs(b.movedAt || b.move_date).valueOf() - dayjs(a.movedAt || a.move_date).valueOf());

      const getPigBarnOnDate = (targetDate) => {
        if (entryDate && dayjs(targetDate).isBefore(dayjs(entryDate), 'day')) return null;
        let currentBarn = bId;
        for (let m of sortedMoves) {
          if (dayjs(m.movedAt || m.move_date).isAfter(dayjs(targetDate), 'day')) {
            currentBarn = m.fromBarnId || m.from_barn_id;
          } else {
            break;
          }
        }
        return currentBarn;
      };

      const vacs = (vacRes.data?.data || []).filter(v => {
        if (v.pig_id === record.id || v.pigId === record.id) return true;
        if (v.barn_id) {
          const barnOnDate = getPigBarnOnDate(v.vaccinated_at);
          return barnOnDate === v.barn_id;
        }
        return false;
      });

      const meds = (medRes.data?.data || []).filter(m => {
        const pId = m.pigId || m.pig_id;
        if (pId === record.id) return true;
        if (m.note && m.note.includes(`[Cá thể: ${pigCode}]`)) return true;
        if (m.note && m.note.startsWith('[Cá thể:')) return false;
        
        const barnOnDate = getPigBarnOnDate(m.used_at);
        return barnOnDate === (m.barn_id || m.barnId);
      });

      setPigHistory({ movements: moves, vaccinations: vacs, reports: reps, medicines: meds });
    } catch (error) {
      message.error("Không thể tải lịch sử cá thể lợn");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      pig_code: record.earTag || record.pig_code || record.pigCode,
      name: record.name,
      barn_id: record.barnId || record.barn_id,
      category: record.category,
      lifecycle_status: record.lifecycleStatus || record.lifecycle_status,
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
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, record) => filteredPigs.indexOf(record) + 1,
    },
    {
      title: 'Số tai',
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
      title: 'Trọng lượng',
      key: 'weightKg',
      render: (_, r) => {
        const w = r.weightKg ?? r.current_weight ?? r.entry_weight;
        // Chỉ hiển thị số kg nếu có giá trị và giá trị đó lớn hơn 0
        return (w !== null && w !== undefined && Number(w) > 0) ? `${w} kg` : '-';
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
              icon={<EyeOutlined />}
              style={{ color: '#1890ff' }}
              onClick={() => handleViewDetail(record)}
              title="Xem chi tiết"
            />
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

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
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

      <Card className="table-card" style={{ marginTop: 24 }}>
        <Form 
          layout="inline" 
          style={{ marginBottom: 16 }}
          onValuesChange={(_, values) => {
            setSearchText(values.search);
            setFilterBarn(values.barn);
            setFilterCategory(values.category);
            setFilterStatus(values.status);
          }}
        >
          <Form.Item name="search">
            <Input.Search placeholder="Tìm theo số tai..." allowClear style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="barn">
            <Select placeholder="Lọc theo chuồng" allowClear options={barns.map(b => ({ label: b.name, value: b.id }))} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="category">
            <Select placeholder="Loại lợn" allowClear options={Object.entries(CATEGORY_MAP).map(([val, label]) => ({ label, value: val }))} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="Trạng thái" allowClear options={Object.entries(STATUS_MAP).map(([val, cfg]) => ({ label: cfg.text, value: val }))} style={{ width: 160 }} />
          </Form.Item>
        </Form>
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
            <Col span={8}>
              <Form.Item 
                name="pig_code" 
                label="Số tai" 
                rules={[
                  { required: true, message: 'Nhập mã' },
                  () => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      const exists = pigs.find(p => (p.earTag || p.pig_code || p.pigCode) === value);
                      if (exists && exists.id !== editingId) {
                        return Promise.reject(new Error('Mã này đã tồn tại!'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
                <Input placeholder="VD: P001" />
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item name="name" label="Tên gọi (nếu có)"><Input placeholder="VD: Nái Mẹ 1" /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="barn_id" label="Chuồng trại" rules={[{ required: true, message: 'Chọn chuồng' }]}>
                <Select disabled={!!editingId} showSearch options={barns.map(b => ({ label: b.name, value: b.id }))} placeholder="Chọn..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Phân loại" rules={[{ required: true, message: 'Chọn loại' }]}>
                <Select options={Object.entries(CATEGORY_MAP).map(([val, label]) => ({ label, value: val }))} onChange={(val) => {
                  if (val === 'SOW') {
                    form.setFieldsValue({ gender: 'female' });
                  } else if (val === 'BOAR') {
                    form.setFieldsValue({ gender: 'male' });
                  }
                }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.category !== currentValues.category}>
                {({ getFieldValue }) => (
                  <Form.Item name="gender" label="Giới tính" rules={[{ required: true }]}>
                    <Select disabled={!!editingId || getFieldValue('category') === 'SOW' || getFieldValue('category') === 'BOAR'} options={Object.entries(GENDER_MAP).map(([val, label]) => ({ label, value: val }))} />
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="dob" label="Ngày sinh"><DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => current && current > dayjs().endOf('day')} /></Form.Item></Col>
            <Col span={8}><Form.Item name="entry_date" label="Ngày nhập đàn" rules={[{ required: true }]}><DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => current && current > dayjs().endOf('day')} /></Form.Item></Col>
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

      {/* MODAL XEM CHI TIẾT */}
      <Modal
        title={`Hồ sơ chi tiết lợn: ${selectedPig?.earTag || selectedPig?.pig_code || selectedPig?.pigCode || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailOpen(false)}>Đóng</Button>
        ]}
        width={850}
      >
        {selectedPig && (
          <Spin spinning={loadingHistory}>
            <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 }}>
              <Descriptions bordered size="small" column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ marginBottom: 20 }}>
                <Descriptions.Item label="Số tai"><strong>{selectedPig.earTag || selectedPig.pig_code || selectedPig.pigCode}</strong></Descriptions.Item>
                <Descriptions.Item label="Phân loại"><Tag color="blue">{CATEGORY_MAP[selectedPig.category] || selectedPig.category}</Tag></Descriptions.Item>
                <Descriptions.Item label="Giới tính">{GENDER_MAP[selectedPig.gender] || selectedPig.gender}</Descriptions.Item>
                <Descriptions.Item label="Chuồng hiện tại">{selectedPig.barnName || selectedPig.barn_name}</Descriptions.Item>
                <Descriptions.Item label="Trọng lượng">{(selectedPig.weightKg ?? selectedPig.current_weight ?? selectedPig.entry_weight) ? `${selectedPig.weightKg ?? selectedPig.current_weight ?? selectedPig.entry_weight} kg` : '-'}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_MAP[selectedPig.computedStatus]?.color}>{STATUS_MAP[selectedPig.computedStatus]?.text || selectedPig.computedStatus}</Tag>
                  {selectedPig.computedStatus === 'DEAD' && selectedPig.deathDate && (
                    <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>({dayjs(selectedPig.deathDate).format('DD/MM/YYYY')})</span>
                  )}
                  {selectedPig.computedStatus === 'SOLD' && selectedPig.soldAt && (
                    <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>({dayjs(selectedPig.soldAt).format('DD/MM/YYYY')})</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày sinh (đẻ)">
                  {selectedPig.dob ? dayjs(selectedPig.dob).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhập">
                  {selectedPig.arrivedAt || selectedPig.entry_date ? dayjs(selectedPig.arrivedAt || selectedPig.entry_date).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Tuổi">
                  {selectedPig.ageDays != null ? `${selectedPig.ageDays} ngày` : (selectedPig.dob ? `${dayjs().diff(dayjs(selectedPig.dob), 'day')} ngày` : '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Lưu chuồng">
                  {selectedPig.arrivedAt || selectedPig.entry_date ? `${dayjs().diff(dayjs(selectedPig.arrivedAt || selectedPig.entry_date), 'day')} ngày` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ghi chú" span={3}>{selectedPig.note || 'Không có'}</Descriptions.Item>
              </Descriptions>

              <Divider orientation="left" style={{ margin: '12px 0' }}>Báo cáo bệnh án</Divider>
              <Table 
                dataSource={pigHistory.reports} 
                rowKey="id" 
                pagination={{ pageSize: 5 }} 
                size="small"
                columns={[
                  { title: 'Ngày báo cáo', render: (_, r) => dayjs(r.createdAt || r.created_at).format('DD/MM/YYYY HH:mm') },
                  { title: 'Triệu chứng', dataIndex: 'description' },
                  { title: 'Trạng thái', dataIndex: 'status', render: s => s === 'da_xu_ly' ? <Tag color="green">Đã xử lý</Tag> : <Tag color="orange">Chờ xử lý</Tag> },
                  { title: 'Bác sĩ phản hồi', dataIndex: 'vet_note', render: t => t || '-' }
                ]} 
                locale={{ emptyText: 'Chưa có báo cáo bệnh nào' }}
              />
              
              <Divider orientation="left" style={{ margin: '12px 0' }}>Lịch sử tiêm phòng</Divider>
              <Table 
                dataSource={pigHistory.vaccinations} 
                rowKey="id" 
                pagination={{ pageSize: 5 }} 
                size="small"
                columns={[
                  { title: 'Ngày tiêm', render: (_, r) => dayjs(r.vaccinatedAt || r.vaccinated_at).format('DD/MM/YYYY') },
                  { title: 'Tên Vaccine', dataIndex: ['vaccineName', 'vaccine_name'], render: (_, r) => r.vaccineName || r.vaccine_name },
                  { title: 'Hình thức', render: (_, r) => r.barn_id || (r.note && r.note.startsWith('[Chuồng:')) ? <Tag>Cả chuồng</Tag> : <Tag color="blue">Tiêm riêng</Tag> },
                  { title: 'Người tiêm', dataIndex: ['staffName', 'staff_name'], render: (_, r) => r.staffName || r.staff_name || 'Hệ thống' },
                  { title: 'Ghi chú', dataIndex: 'note', render: text => {
                      if (text && text.startsWith('[Chuồng:')) {
                        return text.replace(/^\[Chuồng:\s*[^\]]+\]\s*/, '') || '-';
                      }
                      return text || '-';
                  } }
                ]} 
                locale={{ emptyText: 'Chưa có dữ liệu tiêm phòng' }}
              />

              <Divider orientation="left" style={{ margin: '12px 0' }}>Thuốc đã sử dụng</Divider>
              <Alert message="Bao gồm các loại thuốc được cấp phát chung cho cả chuồng và thuốc tiêm riêng cho cá thể lợn này." type="info" showIcon style={{ marginBottom: 16 }} />
              <Table 
                dataSource={pigHistory.medicines} 
                rowKey="id" 
                pagination={{ pageSize: 5 }} 
                size="small"
                columns={[
                  { title: 'Ngày dùng', render: (_, r) => dayjs(r.usedAt || r.used_at).format('DD/MM/YYYY') },
                  { title: 'Tên thuốc', dataIndex: ['medicineName', 'medicine_name'], render: (_, r) => r.medicineName || r.medicine_name },
                  { title: 'Liều lượng', render: (_, r) => `${r.quantity} ${r.unit}` },
                  { title: 'Hình thức', render: (_, r) => r.note && r.note.includes('[Cá thể:') ? <Tag color="blue">Dùng riêng</Tag> : <Tag>Cả chuồng</Tag> },
                  { title: 'Người thực hiện', dataIndex: ['staffName', 'staff_name'], render: (_, r) => r.staffName || r.staff_name }
                ]} 
                locale={{ emptyText: 'Chưa có dữ liệu sử dụng thuốc' }}
              />

              <Divider orientation="left" style={{ margin: '12px 0' }}>Lịch sử chuyển chuồng</Divider>
              <Table 
                dataSource={pigHistory.movements} 
                rowKey="id" 
                pagination={{ pageSize: 5 }} 
                size="small"
                columns={[
                  { title: 'Ngày chuyển', render: (_, r) => dayjs(r.movedAt || r.move_date || r.createdAt || r.created_at).format('DD/MM/YYYY') },
                  { title: 'Từ chuồng', dataIndex: ['fromBarnName', 'from_barn_name'], render: (_, r) => r.fromBarnName || r.from_barn_name || 'Không rõ' },
                  { title: 'Đến chuồng', dataIndex: ['toBarnName', 'to_barn_name'], render: (_, r) => r.toBarnName || r.to_barn_name },
                  { title: 'Người thực hiện', dataIndex: ['staffName', 'staff_name'], render: (_, r) => r.staffName || r.staff_name || 'Hệ thống' },
                ]} 
                locale={{ emptyText: 'Chưa có lịch sử chuyển chuồng' }}
              />
            </div>
          </Spin>
        )}
      </Modal>
      </div>
    </div>
  );
}