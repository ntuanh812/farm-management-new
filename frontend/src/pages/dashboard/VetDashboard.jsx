import { Row, Col, Card, Statistic } from 'antd'
import { BugOutlined, CalendarOutlined, MedicineBoxOutlined } from '@ant-design/icons'
import { usePigFarmStore } from '@/store/pigFarmStore'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'
import dayjs from 'dayjs'

export default function VetDashboard() {
  const { vaccinations } = usePigFarmStore()
  const { user } = useAuthStore()

  const today = dayjs().format('YYYY-MM-DD')

  // Lịch tiêm hôm nay
  const vaccineToday = vaccinations.filter(v =>
    dayjs(v.scheduledDate).format('YYYY-MM-DD') === today
  ).length

  // Giả lập số ca bệnh (chưa có API thật)
  const treatingCases  = 5
  const newCasesToday  = 2

  return (
    <div>
      <PageHeader
        title={`Xin chào, BS. ${user?.full_name || 'Bác sĩ'} 🩺`}
        subtitle="Tổng quan ca bệnh hôm nay"
      />

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ca đang điều trị"
              value={treatingCases}
              suffix="ca"
              prefix={<BugOutlined style={{ color: '#c44536' }} />}
              valueStyle={{ color: '#c44536', fontSize: 32 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ca bệnh mới hôm nay"
              value={newCasesToday}
              suffix="ca"
              prefix={<MedicineBoxOutlined style={{ color: '#f4a261' }} />}
              valueStyle={{ color: '#f4a261', fontSize: 32 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Lịch tiêm phòng hôm nay"
              value={vaccineToday}
              suffix="lịch"
              prefix={<CalendarOutlined style={{ color: '#2d5a27' }} />}
              valueStyle={{ color: '#2d5a27', fontSize: 32 }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
          🩺 Sử dụng menu bên trái để ghi nhận chuẩn đoán bệnh và tiêm phòng.
        </p>
      </Card>
    </div>
  )
}
