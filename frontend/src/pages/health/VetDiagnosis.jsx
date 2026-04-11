import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Popconfirm, Row, Col, Space, InputNumber } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import axios from 'axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/authStore'

const API = 'http://localhost:3000/api'

const STATUS_COLOR = { dang_dieu_tri: 'orange', da_khoi: 'green', tu_vong: 'red' }
const STATUS_LABEL = { dang_dieu_tri: 'Đang điều trị', da_khoi: 'Đã khỏi', tu_vong: 'Tử vong' }
const SEV_COLOR    = { nhe: 'blue', vua: 'orange', nang: 'red' }
const SEV_LABEL    = { nhe: 'Nhẹ', vua: 'Vừa', nang: 'Nặng' }

export default function VetDiagnosis() {
  const [form]       = Form.useForm()
  const navigate     = useNavigate()
  const { user, getAuthHeader } = useAuthStore()
  const isVetOrAdmin = ['ADMIN', 'VET_DOCTOR'].includes(user?.role)

  const [list, setList]         = useState([])
  const [barns, setBarns]       = useState([])
  const [medicines, setMeds]    = useState([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState(null) // null = thêm mới, object = sửa
  const [medRows, setMedRows]   = useState([])   // thuốc trong form

  // Filter state
  const [filterBarn,   setFilterBarn]   = useState(null)
  const [filterStatus, setFilterStatus] = useState(null)

  const headers = getAuthHeader()

  // Fetch dữ liệu
  const fetchList = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterBarn)   params.barn_id = filterBarn
      if (filterStatus) params.status  = filterStatus
      const { data } = await axios.get(`${API}/vet-diagnosis`, { headers, params })
      setList(data.data || [])
    } catch { setList([]) }
    setLoading(false)
  }

  useEffect(() => {
    fetchList()
    // Lấy danh sách chuồng và thuốc để dùng trong form
    axios.get(`${API}/employees`, { headers })  // Dùng tạm — thực tế fetch /barns, /medicines
      .catch(() => {})
    // Giả lập barns + meds nếu chưa có API riêng
    setBarns([
      { id: 1, name: 'Chuồng Nái A1' }, { id: 2, name: 'Chuồng Đực B1' },
      { id: 3, name: 'Chuồng Con C1' }, { id: 4, name: 'Chuồng Thịt D1' },
      { id: 5, name: 'Chuồng Cách Ly E1' },
    ])
    setMeds([
      { id: 1, name: 'Amoxicillin 20%', unit: 'ml' },
      { id: 2, name: 'Oxytetracycline', unit: 'ml' },
      { id: 5, name: 'Vitamin C', unit: 'gói' },
      { id: 6, name: 'Dexamethasone', unit: 'ml' },
    ])
  }, [filterBarn, filterStatus])

  const openAdd = () => {
    setEditing(null)
    setMedRows([])
    form.resetFields()
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    setMedRows(record.medicines || [])
    form.setFieldsValue({
      ...record,
      diagnosis_date:  record.diagnosis_date  ? dayjs(record.diagnosis_date)  : null,
      next_check_date: record.next_check_date ? dayjs(record.next_check_date) : null,
    })
    setOpen(true)
  }

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      diagnosis_date:  values.diagnosis_date?.format('YYYY-MM-DD'),
      next_check_date: values.next_check_date?.format('YYYY-MM-DD'),
      medicines: medRows,
    }
    try {
      if (editing) {
        await axios.put(`${API}/vet-diagnosis/${editing.id}`, payload, { headers })
      } else {
        await axios.post(`${API}/vet-diagnosis`, payload, { headers })
      }
      setOpen(false)
      fetchList()
    } catch (err) {
      Modal.error({ title: 'Lỗi', content: err.response?.data?.message || 'Có lỗi xảy ra' })
    }
  }

  const handleDelete = async (id) => {
    await axios.delete(`${API}/vet-diagnosis/${id}`, { headers })
    fetchList()
  }

  // Thêm/xóa hàng thuốc trong form
  const addMedRow    = () => setMedRows(prev => [...prev, { medicine_id: null, dosage: '', unit: '', duration_days: 1 }])
  const removeMedRow = (idx) => setMedRows(prev => prev.filter((_, i) => i !== idx))
  const updateMedRow = (idx, field, val) =>
    setMedRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))

  const columns = [
    { title: 'Mã lợn',   dataIndex: 'pig_code',  key: 'pig_code', width: 100 },
    { title: 'Chuồng',   dataIndex: 'barn_name', key: 'barn_name', width: 130 },
    { title: 'Ngày',     dataIndex: 'diagnosis_date', key: 'date', width: 110 },
    {
      title: 'Bệnh', key: 'disease',
      render: (_, r) => r.final_disease || r.suspected_disease || '—',
    },
    {
      title: 'Mức độ', dataIndex: 'severity_level', key: 'severity', width: 90,
      render: v => <Tag color={SEV_COLOR[v]}>{SEV_LABEL[v]}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    { title: 'Bác sĩ', dataIndex: 'vet_name', key: 'vet', width: 130 },
    {
      title: 'Thao tác', key: 'action', width: 130,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/health/vet-diagnosis/${record.id}`)} />
          {isVetOrAdmin && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          )}
          {isVetOrAdmin && (
            <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="vetdiagnosis-page">
      <PageHeader
        title="Chuẩn đoán bệnh"
        subtitle="Quản lý phiếu chuẩn đoán và điều trị"
        extra={isVetOrAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: '#2d5a27' }}>
            Thêm phiếu
          </Button>
        )}
      />

      {/* Filter */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col>
          <Select placeholder="Lọc theo chuồng" allowClear style={{ width: 180 }}
            onChange={setFilterBarn} options={barns.map(b => ({ value: b.id, label: b.name }))} />
        </Col>
        <Col>
          <Select placeholder="Lọc theo trạng thái" allowClear style={{ width: 180 }}
            onChange={setFilterStatus}
            options={[
              { value: 'dang_dieu_tri', label: 'Đang điều trị' },
              { value: 'da_khoi',       label: 'Đã khỏi' },
              { value: 'tu_vong',       label: 'Tử vong' },
            ]}
          />
        </Col>
      </Row>

      <Table
        dataSource={list}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 800 }}
      />

      {/* Modal Form */}
      <Modal
        title={editing ? 'Cập nhật phiếu chuẩn đoán' : 'Thêm phiếu chuẩn đoán'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="pig_id" label="Mã lợn (ID)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="ID lợn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="barn_id" label="Chuồng" rules={[{ required: true }]}>
                <Select options={barns.map(b => ({ value: b.id, label: b.name }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="diagnosis_date" label="Ngày chuẩn đoán" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="next_check_date" label="Ngày tái khám">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="temperature" label="Nhiệt độ (°C)">
                <InputNumber style={{ width: '100%' }} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weight" label="Cân nặng (kg)">
                <InputNumber style={{ width: '100%' }} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="severity_level" label="Mức độ" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'nhe', label: 'Nhẹ' },
                  { value: 'vua', label: 'Vừa' },
                  { value: 'nang', label: 'Nặng' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="symptoms" label="Triệu chứng" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="suspected_disease" label="Bệnh nghi ngờ">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="final_disease" label="Kết luận bệnh">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="treatment_plan" label="Phác đồ điều trị">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="dang_dieu_tri">
            <Select options={[
              { value: 'dang_dieu_tri', label: 'Đang điều trị' },
              { value: 'da_khoi',       label: 'Đã khỏi' },
              { value: 'tu_vong',       label: 'Tử vong' },
            ]} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>

          {/* Danh sách thuốc đã dùng */}
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Thuốc đã dùng</div>
          {medRows.map((row, idx) => (
            <Row gutter={8} key={idx} style={{ marginBottom: 8 }}>
              <Col span={9}>
                <Select
                  placeholder="Chọn thuốc" style={{ width: '100%' }} value={row.medicine_id}
                  onChange={v => updateMedRow(idx, 'medicine_id', v)}
                  options={medicines.map(m => ({ value: m.id, label: m.name }))}
                />
              </Col>
              <Col span={5}>
                <InputNumber placeholder="Liều" style={{ width: '100%' }} value={row.dosage}
                  onChange={v => updateMedRow(idx, 'dosage', v)} />
              </Col>
              <Col span={4}>
                <Input placeholder="Đơn vị" value={row.unit}
                  onChange={e => updateMedRow(idx, 'unit', e.target.value)} />
              </Col>
              <Col span={3}>
                <InputNumber placeholder="Ngày" style={{ width: '100%' }} value={row.duration_days}
                  onChange={v => updateMedRow(idx, 'duration_days', v)} min={1} />
              </Col>
              <Col span={3}>
                <Button danger onClick={() => removeMedRow(idx)}>Xóa</Button>
              </Col>
            </Row>
          ))}
          <Button onClick={addMedRow} style={{ marginTop: 4 }}>+ Thêm thuốc</Button>
        </Form>
      </Modal>
    </div>
  )
}
