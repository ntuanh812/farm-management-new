import { Form, Input, Button, Card, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Redirect theo role sau khi login thành công
const ROLE_HOME = {
  ADMIN:       '/dashboard',
  FARM_WORKER: '/employee/dashboard',
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c43 100%)',
    }}>
      <Card style={{ width: 380, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🐷</div>
          <h2 style={{ margin: 0, color: '#2d5a27', fontSize: 22, fontWeight: 700 }}>FarmPro PIG</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>Hệ thống quản lý trại lợn</p>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

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
            style={{ background: '#2d5a27', borderColor: '#2d5a27', height: 44 }}
          >
            Đăng nhập
          </Button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/forgot-password" style={{ color: '#4a7c43', fontSize: 13 }}>
              Quên mật khẩu?
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}
