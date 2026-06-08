import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Card, Space, Radio, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, ImportOutlined, AppstoreOutlined, DatabaseOutlined, LineChartOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const UNIT_TYPES = ['ml', 'mg', 'lọ', 'gói', 'viên'];

export default function Medicine() {
  const { token, user } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [medicineUsages, setMedicineUsages] = useState([]);
  const [barns, setBarns] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [applyType, setApplyType] = useState('barn');
  const [form] = Form.useForm();
  const [addMedicineForm] = Form.useForm();
  const [importForm] = Form.useForm();
  
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Phân quyền
  const canEdit = user?.role === 'ADMIN' || user?.role === 'VET_DOCTOR';
  const canDelete = user?.role === 'ADMIN';
  const canImport = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resUsages, resBarns, resPigs, resMeds] = await Promise.all([
        axios.get(`${API}/medicine-usages`, { headers }),
        axios.get(`${API}/barns`, { headers }),
        axios.get(`${API}/pigs`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/medicines`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      setMedicineUsages(resUsages.data?.data || []);
      setBarns(resBarns.data?.data || []);
      setPigs(resPigs.data?.data || []);
      setMedicines(resMeds.data?.data || []);
    } catch (error) {
      message.error('Không thể tải dữ liệu sử dụng thuốc');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMedicine = async () => {
    try {
      const values = await addMedicineForm.validateFields();
      await axios.post(`${API}/medicines`, values, { headers });
      message.success('Thêm loại thuốc thành công');
      setIsAddMedicineModalOpen(false);
      addMedicineForm.resetFields();
      fetchData(); 
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể thêm thuốc');
    }
  };

  const handleImportSubmit = async () => {
    try {
      const values = await importForm.validateFields();
      await axios.put(`${API}/medicines/${values.medicine_id}/stock`, { quantity: values.quantity }, { headers });
      message.success('Nhập thêm thuốc vào kho thành công');
      setIsImportModalOpen(false);
      importForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể nhập kho');
    }
  };

  const stats = useMemo(() => {
    const totalMedicineTypes = medicines.length;
    const totalStock = medicines.reduce((sum, m) => sum + (Number(m.stock) || 0), 0);
    const totalUsed = medicineUsages.reduce((sum, u) => sum + (Number(u.quantity) || 0), 0);
    const lowStock = medicines.filter(m => (Number(m.stock) || 0) < 20).length;

    return { totalMedicineTypes, totalStock, totalUsed, lowStock };
  }, [medicines, medicineUsages]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/medicine-usages/${id}`, { headers });
      message.success('Đã xóa bản ghi sử dụng thuốc');
      fetchData();
    } catch (error) {
      message.error('Không thể xóa bản ghi này');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { apply_type, barn_id, pig_ids, medicine_id, quantity, unit, note, used_at } = values;
      
      const basePayload = {
        medicine_id,
        quantity,
        unit,
        note,
        used_at: used_at.format('YYYY-MM-DD'),
      };

      if (apply_type === 'barn') {
        await axios.post(`${API}/medicine-usages`, { ...basePayload, barn_id }, { headers });
      } else {
        const requests = pig_ids.map(pigId => {
          const pig = pigs.find(p => p.id === pigId);
          const customNote = `[Cá thể: PIG${String(pigId).padStart(3, "0")}] ${note || ''}`;
          return axios.post(`${API}/medicine-usages`, { ...basePayload, pig_id: pigId, barn_id: pig?.barn_id, note: customNote.trim() }, { headers });
        });
        await Promise.all(requests);
      }

      message.success('Ghi nhận sử dụng thuốc thành công');
      setOpen(false);
      form.resetFields();
      setApplyType('barn');
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
      render: (_, __, index) => index + 1,
    },
    { title: 'Ngày', dataIndex: 'used_at', key: 'used_at', render: (date) => dayjs(date).format('DD/MM/YYYY') },
    { title: 'Đối tượng', key: 'target', render: (_, r) => {
        if (r.pig_id) {
          const pigId = r.pig_id;
          return <span>Cá thể: <strong>PIG{String(pigId).padStart(3, "0")}</strong></span>;
        }
        if (r.note && r.note.startsWith('[Cá thể:')) {
          const match = r.note.match(/^\[Cá thể:\s*(.+?)\]/);
          if (match) return <span>Cá thể: <strong>{match[1]}</strong></span>;
        }
        return <span>Chuồng: <strong>{r.barn_name || 'Không rõ'}</strong></span>;
    }},
    { title: 'Tên thuốc/Vật tư', dataIndex: 'medicine_name', key: 'medicine_name', render: text => <strong className="text-primary">{text}</strong> },
    { title: 'Số lượng', key: 'quantity', render: (_, r) => `${r.quantity} ${r.unit}` },
    { title: 'Người thực hiện', dataIndex: 'staff_name', key: 'staff_name' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', render: (text) => {
        if (text && text.startsWith('[Cá thể:')) {
          return text.replace(/^\[Cá thể:\s*[^\]]+\]\s*/, '') || '-';
        }
        return text || '-';
    } },
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
    <div className="dashboard medicine-page">
      <PageHeader
        title="Sử dụng Thuốc & Vật tư thú y"
        subtitle="Ghi nhận và theo dõi lịch sử cấp phát thuốc tại các chuồng"
        actions={
          <Space>
            {canImport && <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>Nhập kho thuốc</Button>}
            {canEdit && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                form.resetFields();
                form.setFieldsValue({ used_at: dayjs(), apply_type: 'barn' });
                setApplyType('barn');
                setOpen(true);
              }}>
                Ghi nhận thuốc
              </Button>
            )}
          </Space>
        }
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--barn">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng loại thuốc</span>
                <div className="stat-card__icon"><AppstoreOutlined /></div>
              </div>
              <div className="stat-card__value">
                {stats.totalMedicineTypes}
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
                <span className="stat-card__label"> đv</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--daily-tasks">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng đã sử dụng</span>
                <div className="stat-card__icon"><LineChartOutlined /></div>
              </div>
              <div className="stat-card__value">
                {Math.round(stats.totalUsed).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                <span className="stat-card__label"> đv</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--staff">
              <div className="stat-card__header">
                <span className="stat-card__title">Sắp hết (Dưới 20)</span>
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
          <Table columns={columns} dataSource={medicineUsages} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
        </Card>

      <Modal 
        title="Ghi nhận sử dụng thuốc/vật tư" 
        open={open} 
        onCancel={() => {
          setOpen(false);
          form.resetFields();
          setApplyType('barn');
        }} 
        onOk={handleSubmit} 
        okText="Lưu thông tin" 
        cancelText="Hủy" 
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Form.Item name="used_at" label="Ngày cấp/sử dụng" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => current && current > dayjs().endOf('day')} />
          </Form.Item>

          <Form.Item name="apply_type" label="Hình thức dùng thuốc" initialValue="barn">
            <Radio.Group onChange={(e) => setApplyType(e.target.value)}>
              <Radio value="barn">Theo chuồng (Chung)</Radio>
              <Radio value="pig">Chọn cá thể (Riêng)</Radio>
            </Radio.Group>
          </Form.Item>

          {applyType === 'barn' ? (
            <Form.Item name="barn_id" label="Chuồng" rules={[{ required: true, message: 'Chọn chuồng' }]}>
              <Select showSearch options={barns.map(b => ({ label: b.name, value: b.id }))} placeholder="Chọn chuồng..." />
            </Form.Item>
          ) : (
            <Form.Item name="pig_ids" label="Chọn cá thể lợn" rules={[{ required: true, message: 'Chọn ít nhất 1 con' }]}>
            <Select mode="multiple" showSearch optionFilterProp="label" options={pigs.filter(p => p.lifecycle_status === 'ACTIVE').map(p => ({ label: `PIG${String(p.id).padStart(3, "0")} - ${p.barn_name || ''}`, value: p.id }))} placeholder="Chọn lợn..." />
            </Form.Item>
          )}

          <Form.Item label="Tên thuốc/Vật tư" required>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Form.Item name="medicine_id" noStyle rules={[{ required: true, message: 'Nhập hoặc chọn tên thuốc' }]}>
                <Select 
                  showSearch 
                  options={medicines.map(m => ({ label: `${m.name} (Tồn: ${m.stock || 0} ${m.unit || ''})`, value: m.id }))} 
                  placeholder="VD: Kháng sinh, Vitamin..." 
                  style={{ flex: 1 }} 
                  onChange={(val) => {
                    const med = medicines.find(m => m.id === val);
                    if (med) form.setFieldsValue({ unit: med.unit });
                  }}
                />
              </Form.Item>
              {canImport && <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsAddMedicineModalOpen(true)} title="Thêm loại thuốc mới" />}
            </div>
          </Form.Item>
          <Space align="baseline">
            <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }]}>
              <InputNumber min={0.1} step={0.1} className="w-100" />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị" rules={[{ required: true, message: 'Chọn đơn vị' }]}>
              <Input disabled className="w-120" style={{ color: '#000', cursor: 'not-allowed', backgroundColor: '#f5f5f5' }} />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Liệu trình, mục đích sử dụng..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title="Thêm loại thuốc/vật tư mới" 
        open={isAddMedicineModalOpen} 
        onCancel={() => { setIsAddMedicineModalOpen(false); addMedicineForm.resetFields(); }}
        onOk={handleAddMedicine}
        okText="Thêm mới"
        cancelText="Hủy"
      >
        <Form form={addMedicineForm} layout="vertical">
          <Form.Item name="name" label="Tên thuốc/vật tư" rules={[{ required: true, message: 'Vui lòng nhập tên thuốc' }]}>
            <Input placeholder="Ví dụ: Kháng sinh Amoxicillin..." />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}>
            <Select options={UNIT_TYPES.map(u => ({ label: u, value: u }))} placeholder="VD: ml, lọ..." />
          </Form.Item>
          <Form.Item name="stock" label="Số lượng tồn ban đầu">
            <InputNumber min={0} className="w-100" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title="Nhập thêm thuốc vào kho" 
        open={isImportModalOpen} 
        onCancel={() => { setIsImportModalOpen(false); importForm.resetFields(); }} 
        onOk={handleImportSubmit} 
        okText="Xác nhận" 
        cancelText="Hủy"
      >
        <Form form={importForm} layout="vertical">
          <Form.Item label="Tên thuốc/vật tư" required>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Form.Item name="medicine_id" noStyle rules={[{ required: true, message: 'Chọn thuốc để nhập' }]}>
                <Select 
                  showSearch 
                  options={medicines.map(m => ({ label: `${m.name} (Tồn hiện tại: ${m.stock || 0} ${m.unit || ''})`, value: m.id }))} 
                  placeholder="Chọn thuốc..." 
                  style={{ flex: 1 }} 
                  onChange={(val) => {
                    const med = medicines.find(m => m.id === val);
                    if (med) importForm.setFieldsValue({ unit: med.unit });
                  }}
                />
              </Form.Item>
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsAddMedicineModalOpen(true)} title="Thêm loại thuốc mới" />
            </div>
          </Form.Item>
          <Space align="baseline">
            <Form.Item name="quantity" label="Số lượng nhập thêm" rules={[{ required: true, message: 'Nhập số lượng' }]}>
              <InputNumber min={0.1} step={0.1} className="w-100" placeholder="Ví dụ: 100" />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị">
              <Input disabled className="w-120" style={{ color: '#000', cursor: 'not-allowed', backgroundColor: '#f5f5f5' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
      </div>
    </div>
  );
}