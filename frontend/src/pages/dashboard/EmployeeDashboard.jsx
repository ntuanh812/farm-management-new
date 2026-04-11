import { Row, Col, Card, Statistic } from 'antd'
import { TeamOutlined, HomeOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { usePigFarmStore } from '@/store/pigFarmStore'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'

export default function EmployeeDashboard() {
  const { pigs, barns, feedUsages } = usePigFarmStore()
  const { user } = useAuthStore()

  // Tổng lợn đang sống
  const activePigs = pigs.filter(p => p.status === 'ACTIVE').length

  // Tổng chuồng
  const totalBarns = barns.length

  // Cám tiêu thụ tháng này
  const now = new Date()
  const branThisMonth = feedUsages
    .filter(f => {
      const d = new Date(f.usedAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, f) => sum + (f.quantity || 0), 0)

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user?.full_name || 'Nhân viên'} 👋`}
        subtitle="Tổng quan công việc hôm nay"
      />

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng lợn đang nuôi"
              value={activePigs}
              suffix="con"
              prefix={<TeamOutlined style={{ color: '#2d5a27' }} />}
              valueStyle={{ color: '#2d5a27', fontSize: 32 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Số chuồng trại"
              value={totalBarns}
              suffix="chuồng"
              prefix={<HomeOutlined style={{ color: '#f4a261' }} />}
              valueStyle={{ color: '#f4a261', fontSize: 32 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Cám tiêu thụ tháng này"
              value={branThisMonth}
              suffix="kg"
              prefix={<ShoppingCartOutlined style={{ color: '#c44536' }} />}
              valueStyle={{ color: '#c44536', fontSize: 32 }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
          📋 Hãy sử dụng menu bên trái để quản lý đàn lợn, sinh sản và nguyên vật liệu.
        </p>
      </Card>
    </div>
  )
}
