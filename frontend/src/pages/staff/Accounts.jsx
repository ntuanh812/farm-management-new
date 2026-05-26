import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Space, Switch } from 'antd'
import { PlusOutlined, KeyOutlined } from '@ant-design/icons'
import axios from 'axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/authStore'

const API = 'http://localhost:3000/api'

const ROLE_COLOR = { ADMIN: 'red', FARM_WORKER: 'blue', VET_DOCTOR: 'green' }
const ROLE_LABEL = { ADMIN: 'Quản trị', FARM_WORKER: 'Nhân viên', VET_DOCTOR: 'Bác sĩ thú y' }

export default function Accounts() {
  const [form]       = Form.useForm()
  const [resetForm]  = Form.useForm()
  const { getAuthHeader } = useAuthStore()
  const headers      = getAuthHeader()

  const [list, setList]           = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(false)
  const [openAdd, setOpenAdd]     = useState(false)
  const [openReset, setOpenReset] = useState(null) // id đang reset

  const fetchList = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/accounts`, { headers })
      setList(data.data || [])
    } catch { setList([]) }
    setLoading(false)
  }

  // Lấy danh sách nhân viên để chọn khi tạo tài khoản
  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get(`${API}/employees`, { headers })
      setEmployees(data.data || [])
    } catch { setEmployees([]) }
  }

  useEffect(() => {
    fetchList()
    fetchEmployees()
  }, [])

  const handleCreate = async (values) => {
    try {
      await axios.post(`${API}/accounts`, values, { headers })
      setOpenAdd(false)
      form.resetFields()
      fetchList()
    } catch (err) {
      Modal.error({ title: 'Lỗi', content: err.response?.data?.message || 'Có lỗi xảy ra' })
    }
  }

  const handleResetPassword = async (values) => {
    try {
      await axios.patch(`${API}/accounts/${openReset}/reset-password`, { new_password: values.new_password }, { headers })
      setOpenReset(null)
      resetForm.resetFields()
      Modal.success({ title: 'Thành công', content: 'Đã đặt lại mật khẩu' })
    } catch (err) {
      Modal.error({ title: 'Lỗi', content: err.response?.data?.message || 'Có lỗi xảy ra' })
    }
  }

  const handleToggle = async (id) => {
    await axios.patch(`${API}/accounts/${id}/toggle-active`, {}, { headers })
    fetchList()
  }

  const columns = [
    { title: 'Username',   dataIndex: 'username',   key: 'username' },
    { title: 'Họ tên NV',  dataIndex: 'full_name',  key: 'full_name' },
    {
      title: 'Vai trò', dataIndex: 'role_code', key: 'role_code', width: 160,
      render: v => <Tag color={ROLE_COLOR[v] || 'default'}>{ROLE_LABEL[v] || 'Chưa phân quyền'}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', width: 120,
      render: (val, record) => (
        <Popconfirm
          title={`${val ? 'Khóa' : 'Mở khóa'} tài khoản này?`}
          onConfirm={() => handleToggle(record.id)}
        >
          <Switch checked={!!val} checkedChildren="Hoạt động" unCheckedChildren="Đã khóa" />
        </Popconfirm>
      ),
    },
    {
      title: 'Đăng nhập lần cuối', dataIndex: 'last_login', key: 'last_login',
      render: v => v ? new Date(v).toLocaleString('vi-VN') : '—',
    },
    {
      title: 'Thao tác', key: 'action', width: 130,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<KeyOutlined />} onClick={() => setOpenReset(record.id)}>
            Reset MK
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="accounts-page">
      <PageHeader
        title="Quản lý tài khoản"
        subtitle="Tạo, khóa và reset mật khẩu tài khoản nhân viên"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenAdd(true)}
            style={{ background: '#2d5a27' }}>
            Tạo tài khoản
          </Button>
        }
      />

      <Table
        dataSource={list}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 700 }}
      />

      {/* Modal tạo tài khoản */}
      <Modal
        title="Tạo tài khoản đăng nhập"
        open={openAdd}
        onCancel={() => { setOpenAdd(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="Tạo tài khoản"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="employee_id" label="Nhân viên" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Chọn nhân viên"
              optionFilterProp="label"
              options={employees.map(e => ({
                value: e.id,
            label: `${e.full_name} (${ROLE_LABEL[e.role_code] || e.role_name || 'Chưa phân quyền'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, message: 'Ít nhất 6 ký tự' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal reset mật khẩu */}
      <Modal
        title="Đặt lại mật khẩu"
        open={!!openReset}
        onCancel={() => { setOpenReset(null); resetForm.resetFields() }}
        onOk={() => resetForm.submit()}
        okText="Đặt lại"
      >
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item name="new_password" label="Mật khẩu mới"
            rules={[{ required: true, min: 6, message: 'Ít nhất 6 ký tự' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirm" label="Xác nhận mật khẩu"
            dependencies={['new_password']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve()
                  return Promise.reject('Mật khẩu xác nhận không khớp')
                },
              }),
            ]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
