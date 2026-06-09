import { Form, Input, Button, Card, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'


const ROLE_HOME = {
  ADMIN: '/dashboard',
  FARM_WORKER: '/staff/dashboard',
  VET_DOCTOR: '/vet/dashboard',
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
    <div className="login-page">
      <div className="auth-container">
        <Card className="auth-card" variant="borderless">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo">🐷</div>

            <h2 className="auth-title">
              FarmPro PIG
            </h2>

            <p className="auth-subtitle">
              Hệ thống quản lý trại lợn
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert
              title="Đăng nhập thất bại"
              description={error}
              type="error"
              showIcon
              className="auth-alert"
            />
          )}

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
          >
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập tên đăng nhập',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Nhập username"
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập mật khẩu',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
              />
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
    </div>
  )
}