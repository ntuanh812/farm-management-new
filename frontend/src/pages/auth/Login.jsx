import { Form, Input, Button, Card, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Redirect theo role sau khi login thành công
const ROLE_HOME = {
  ADMIN:       '/dashboard',
  FARM_WORKER: '/staff/dashboard',
  VET_DOCTOR:  '/vet/dashboard',
}

export const Login = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login, loading, error } = useAuthStore()

  const handleSubmit = async (values) => {
    const result = await login(values.username, values.password)
    if (result.success) {
      navigate(ROLE_HOME[result.role] || '/dashboard')
    }
  }

  return (
    <div className="auth-container">
      <Card className="auth-card">
        {/* Logo */}
        <div className="auth-header">
          <div className="auth-logo">🐷</div>
          <h2 className="auth-title">FarmPro PIG</h2>
          <p className="auth-subtitle">Hệ thống quản lý trại lợn</p>
        </div>

        {error && <Alert message={error} type="error" showIcon className="auth-alert" />}

        <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="username" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
