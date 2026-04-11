import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Row, Col, Space, DatePicker } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import axios from 'axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/authStore'

const API = 'http://localhost:3000/api'

const ROLE_COLOR = { ADMIN: 'red', FARM_WORKER: 'blue', VET_DOCTOR: 'green' }
const ROLE_LABEL = { ADMIN: 'Quản trị', FARM_WORKER: 'Nhân viên chăn nuôi', VET_DOCTOR: 'Bác sĩ thú y' }

export default function Employees() {
  const [form]     = Form.useForm()
  const { getAuthHeader } = useAuthStore()
  const headers    = getAuthHeader()

  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const [filterRole, setFilterRole] = useState(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search)     params.search = search
      if (filterRole) params.role   = filterRole
      const { data } = await axios.get(`${API}/employees`, { headers, params })
      setList(data.data || [])
    } catch { setList([]) }
    setLoading(false)
  }

  useEffect(() => { fetchList() }, [search, filterRole])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
      dob: record.dob ? dayjs(record.dob) : null,
    })
    setOpen(true)
  }

  const handleSubmit = async (values) => {
    const payload = { ...values, dob: values.dob?.format('YYYY-MM-DD') }
    try {
      if (editing) {
        await axios.put(`${API}/employees/${editing.id}`, payload, { headers })
      } else {
        await axios.post(`${API}/employees`, payload, { headers })
      }
      setOpen(false)
      fetchList()
    } catch (err) {
      Modal.error({ title: 'Lỗi', content: err.response?.data?.message || 'Có lỗi xảy ra' })
    }
  }

  const handleDelete = async (id) => {
    await axios.delete(`${API}/employees/${id}`, { headers })
    fetchList()
  }

  const columns = [
    { title: 'Họ tên',    dataIndex: 'full_name', key: 'full_name' },
    { title: 'Điện thoại', dataIndex: 'phone',    key: 'phone', width: 120 },
    { title: 'Email',     dataIndex: 'email',     key: 'email' },
    {
      title: 'Vai trò', dataIndex: 'role', key: 'role', width: 160,
      render: v => <Tag color={ROLE_COLOR[v]}>{ROLE_LABEL[v]}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
      render: v => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? 'Hoạt động' : 'Tạm dừng'}</Tag>,
    },
    {
      title: 'Thao tác', key: 'action', width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xác nhận xóa nhân viên?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="employees-page">
      <PageHeader
        title="Quản lý nhân viên"
        subtitle="Thêm, sửa, xóa thông tin nhân viên"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: '#2d5a27' }}>
            Thêm nhân viên
          </Button>
        }
      />

      {/* Filter */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col>
          <Input.Search
            placeholder="Tìm theo tên hoặc SĐT"
            allowClear
            style={{ width: 240 }}
            onSearch={setSearch}
            onChange={e => !e.target.value && setSearch('')}
          />
        </Col>
        <Col>
          <Select placeholder="Lọc theo vai trò" allowClear style={{ width: 180 }}
            onChange={setFilterRole}
            options={[
              { value: 'ADMIN',       label: 'Quản trị' },
              { value: 'FARM_WORKER', label: 'Nhân viên chăn nuôi' },
              { value: 'VET_DOCTOR',  label: 'Bác sĩ thú y' },
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
        scroll={{ x: 700 }}
      />

      {/* Modal Form */}
      <Modal
        title={editing ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Cập nhật' : 'Thêm'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input type="email" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Địa chỉ">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="gender" label="Giới tính" initialValue="male">
                <Select options={[
                  { value: 'male',   label: 'Nam' },
                  { value: 'female', label: 'Nữ' },
                  { value: 'other',  label: 'Khác' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dob" label="Ngày sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'ADMIN',       label: 'Quản trị' },
                  { value: 'FARM_WORKER', label: 'Nhân viên' },
                  { value: 'VET_DOCTOR',  label: 'Bác sĩ thú y' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select options={[
              { value: 'active',   label: 'Hoạt động' },
              { value: 'inactive', label: 'Tạm dừng' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
