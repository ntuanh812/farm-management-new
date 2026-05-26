import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Tag, Modal, Form, Input, 
  Select, DatePicker, message, Popconfirm, Card, Row, Col, InputNumber, Tooltip
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  MinusCircleOutlined, MedicineBoxOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const STATUS_CONFIG = {
  'dang_dieu_tri': { text: 'Đang điều trị', color: 'orange' },
  'da_khoi': { text: 'Đã khỏi', color: 'green' },
  'chet': { text: 'Chết', color: 'red' },
};

const SEVERITY_CONFIG = {
  'nhe': { text: 'Nhẹ', color: 'blue' },
  'trung_binh': { text: 'Trung bình', color: 'orange' },
  'nang': { text: 'Nặng', color: 'red' },
};

export default function VetDiagnosis() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  // States
  const [diagnoses, setDiagnoses] = useState([]);
  const [barns, setBarns] = useState([]);
  const [medicinesList, setMedicinesList] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterBarn, setFilterBarn] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // Dynamic Medicine Rows (Pattern theo REVIEW.md)
  const [medRows, setMedRows] = useState([]);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'VET_DOCTOR';

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Gọi API danh sách chẩn đoán với params
      const params = {};
      if (filterBarn) params.barn_id = filterBarn;
      if (filterStatus) params.status = filterStatus;

      const resDiag = await axios.get(`${API}/vet-diagnosis`, { headers, params });
      if (resDiag.data.success) {
        setDiagnoses(resDiag.data.data);
      }

      // Fetch phụ trợ (Barns & Medicines)
      const [resBarns, resMeds, resPigs] = await Promise.all([
        axios.get(`${API}/barns`, { headers }),
        axios.get(`${API}/medicines`, { headers }).catch(() => ({ data: { data: [] } })), // Giả định /medicines
        axios.get(`${API}/pigs`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      
      if (resBarns.data?.success) setBarns(resBarns.data.data);
      if (resMeds.data?.success) setMedicinesList(resMeds.data.data);
      if (resPigs.data?.success) setPigs(resPigs.data.data);
      
    } catch (error) {
      message.error('Không thể tải dữ liệu Thú y');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterBarn, filterStatus]);

  // Medicine Actions
  const addMedRow = () => {
    setMedRows(prev => [...prev, { medicine_id: null, dosage: '', unit: '', duration_days: 1 }]);
  };

  const removeMedRow = (idx) => {
    setMedRows(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMedRow = (idx, field, val) => {
    setMedRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  // Form Actions
  const handleOpenAdd = () => {
    setEditingId(null);
    form.resetFields();
    setMedRows([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id) => {
    try {
      const res = await axios.get(`${API}/vet-diagnosis/${id}`, { headers });
      if (res.data.success) {
        const data = res.data.data;
        form.setFieldsValue({
          ...data,
          diagnosis_date: data.diagnosis_date ? dayjs(data.diagnosis_date) : null,
          next_check_date: data.next_check_date ? dayjs(data.next_check_date) : null,
        });
        setMedRows(data.medicines || []);
        setEditingId(id);
        setIsModalOpen(true);
      }
    } catch (error) {
      message.error('Không tải được thông tin chi tiết');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/vet-diagnosis/${id}`, { headers });
      message.success('Xóa phiếu chẩn đoán thành công');
      fetchData();
    } catch (error) {
      message.error('Không thể xóa phiếu');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        diagnosis_date: values.diagnosis_date?.format('YYYY-MM-DD'),
        next_check_date: values.next_check_date?.format('YYYY-MM-DD'),
        medicines: medRows.filter(m => m.medicine_id) // Lọc bỏ dòng trống
      };

      if (editingId) {
        await axios.put(`${API}/vet-diagnosis/${editingId}`, payload, { headers });
        message.success('Cập nhật phiếu chẩn đoán thành công');
      } else {
        await axios.post(`${API}/vet-diagnosis`, payload, { headers });
        message.success('Tạo phiếu chẩn đoán thành công');
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu phiếu');
    }
  };

  // Columns
  const columns = [
    {
      title: 'Ngày khám',
      dataIndex: 'diagnosis_date',
      key: 'diagnosis_date',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Mã Lợn',
      dataIndex: 'pig_id',
      key: 'pig_id',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Chuồng',
      dataIndex: 'barn_name',
      key: 'barn_name',
    },
    {
      title: 'Chẩn đoán',
      key: 'disease',
      render: (_, record) => (
        <div>
          <div className="text-danger fw-500">
            {record.final_disease || record.suspected_disease || 'Chưa rõ'}
          </div>
          <div className="text-xs text-muted">{record.symptoms}</div>
        </div>
      ),
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity_level',
      key: 'severity_level',
      render: (level) => {
        const cfg = SEVERITY_CONFIG[level];
        return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : '-';
      }
    },
    {
      title: 'Bác sỹ',
      dataIndex: 'vet_name',
      key: 'vet_name',
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
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            className="text-primary" 
            onClick={() => handleOpenEdit(record.id)} 
            title="Xem / Sửa"
          />
          {user?.role === 'ADMIN' && (
            <Popconfirm title="Chắc chắn xóa phiếu này?" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" icon={<DeleteOutlined />} danger title="Xóa" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="vet-diagnosis-page">
      <PageHeader 
        title="Chẩn đoán thú y" 
        subtitle="Hồ sơ bệnh án và cấp phát thuốc cho đàn lợn"
        actions={
          canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Lập phiếu khám mới
            </Button>
          )
        }
      />

      <Card className="table-card">
        <Space className="mb-16">
          <Select
            placeholder="Lọc theo chuồng"
            className="w-200"
            allowClear
            onChange={setFilterBarn}
            options={barns.map(b => ({ label: b.name, value: b.id }))}
          />
          <Select
            placeholder="Trạng thái điều trị"
            className="w-180"
            allowClear
            onChange={setFilterStatus}
          >
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <Select.Option key={val} value={val}>{cfg.text}</Select.Option>
            ))}
          </Select>
        </Space>

        <Table 
          columns={columns} 
          dataSource={diagnoses} 
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL THÊM/SỬA PHIẾU KHÁM */}
      <Modal
        title={editingId ? 'Cập nhật phiếu chẩn đoán' : 'Lập phiếu chẩn đoán mới'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={850}
        okText="Lưu hồ sơ"
        cancelText="Hủy"
        footer={canEdit ? undefined : null} // Ẩn nút lưu nếu không có quyền
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={!canEdit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="pig_id" label="Mã lợn bệnh" rules={[{ required: true, message: 'Chọn mã lợn' }]}>
                <Select showSearch placeholder="Chọn lợn bệnh">
                  {pigs.filter(p => p.lifecycleStatus === 'ACTIVE').map(p => (
                    <Select.Option key={p.id} value={p.earTag}>
                      {p.earTag} - {p.barnName || 'Không rõ chuồng'}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="barn_id" label="Chuồng đang ở" rules={[{ required: true, message: 'Chọn chuồng' }]}>
                <Select showSearch options={barns.map(b => ({ label: b.name, value: b.id }))} placeholder="Chọn chuồng" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.pig_id !== curr.pig_id}>
                {({ getFieldValue }) => {
                  const pTag = getFieldValue('pig_id');
                  const pig = pigs.find(p => p.earTag === pTag);
                  const minDate = pig?.arrivedAt;
                  return (
                    <Form.Item name="diagnosis_date" label="Ngày khám" rules={[{ required: true, message: 'Chọn ngày khám' }]}>
                      <DatePicker className="w-100" format="DD/MM/YYYY" disabledDate={(current) => {
                        if (!current) return false;
                        const isFuture = current > dayjs().endOf('day');
                        const isBeforeMin = minDate && current < dayjs(minDate).startOf('day');
                        return isFuture || isBeforeMin;
                      }} />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="symptoms" label="Triệu chứng" rules={[{ required: true, message: 'Nhập triệu chứng' }]}>
                <Input.TextArea rows={2} placeholder="Sốt cao, bỏ ăn..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="suspected_disease" label="Bệnh nghi ngờ / Chẩn đoán">
                <Input.TextArea rows={2} placeholder="Nghi ngờ Tụ huyết trùng..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="temperature" label="Nhiệt độ (°C)">
                <InputNumber className="w-100" min={35} max={45} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="severity_level" label="Mức độ nghiêm trọng">
                <Select placeholder="Chọn mức độ">
                  <Select.Option value="nhe">Nhẹ</Select.Option>
                  <Select.Option value="trung_binh">Trung bình</Select.Option>
                  <Select.Option value="nang">Nặng</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái">
                <Select>
                  <Select.Option value="dang_dieu_tri">Đang điều trị</Select.Option>
                  <Select.Option value="da_khoi">Đã khỏi</Select.Option>
                  <Select.Option value="chet">Chết</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="bg-light p-16 rounded-8 mb-24">
            <div className="flex-between mb-12">
              <h4 className="m-0"><MedicineBoxOutlined /> Kê đơn thuốc điều trị</h4>
              {canEdit && (
                <Button size="small" type="dashed" onClick={addMedRow}>+ Thêm thuốc</Button>
              )}
            </div>
            {medRows.length === 0 ? (
              <div className="text-muted text-sm text-italic">Chưa cấp thuốc nào.</div>
            ) : (
              medRows.map((row, idx) => (
                <Row gutter={8} key={idx} className="mb-8">
                  <Col span={8}>
                    <Select className="w-100" placeholder="Chọn thuốc" value={row.medicine_id} onChange={(v) => updateMedRow(idx, 'medicine_id', v)} options={medicinesList.map(m => ({ label: m.name || `Thuốc #${m.id}`, value: m.id }))} disabled={!canEdit} />
                  </Col>
                  <Col span={6}>
                    <Input placeholder="Liều lượng (VD: 2ml)" value={row.dosage} onChange={(e) => updateMedRow(idx, 'dosage', e.target.value)} disabled={!canEdit} />
                  </Col>
                  <Col span={5}>
                    <InputNumber className="w-100" placeholder="Số ngày" min={1} value={row.duration_days} onChange={(v) => updateMedRow(idx, 'duration_days', v)} disabled={!canEdit} addonAfter="ngày" />
                  </Col>
                  {canEdit && (
                    <Col span={2}>
                      <Button danger type="text" icon={<MinusCircleOutlined />} onClick={() => removeMedRow(idx)} />
                    </Col>
                  )}
                </Row>
              ))
            )}
          </div>

          <Form.Item name="treatment_plan" label="Phác đồ điều trị bổ sung / Ghi chú">
            <Input.TextArea rows={2} placeholder="Cách ly lợn, vệ sinh chuồng trại..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};