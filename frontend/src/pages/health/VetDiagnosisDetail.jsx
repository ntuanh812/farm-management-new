import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Descriptions, Tag, Table, Button, Spin, Card } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API = 'http://localhost:3000/api'

const STATUS_COLOR = { dang_dieu_tri: 'orange', da_khoi: 'green', tu_vong: 'red' }
const STATUS_LABEL = { dang_dieu_tri: 'Đang điều trị', da_khoi: 'Đã khỏi', tu_vong: 'Tử vong' }
const SEV_COLOR    = { nhe: 'blue', vua: 'orange', nang: 'red' }
const SEV_LABEL    = { nhe: 'Nhẹ', vua: 'Vừa', nang: 'Nặng' }

export default function VetDiagnosisDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { getAuthHeader, user } = useAuthStore()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/vet-diagnosis/${id}`, { headers: getAuthHeader() })
      .then(res => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  // Nút back về đúng route theo role
  const backPath = user?.role === 'VET_DOCTOR'
    ? '/vet/health/vet-diagnosis'
    : '/health/vet-diagnosis'

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (!data)   return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy phiếu chuẩn đoán</div>

  const medColumns = [
    { title: 'Tên thuốc',   dataIndex: 'medicine_name', key: 'name' },
    { title: 'Liều dùng',   dataIndex: 'dosage',        key: 'dosage', width: 100 },
    { title: 'Đơn vị',      dataIndex: 'unit',          key: 'unit',   width: 90 },
    { title: 'Số ngày',     dataIndex: 'duration_days', key: 'days',   width: 90 },
    { title: 'Ghi chú',     dataIndex: 'note',          key: 'note' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)} style={{ marginBottom: 16 }}>
        Quay lại
      </Button>

      <Card title={`Phiếu chuẩn đoán #${data.id} — Lợn ${data.pig_code}`}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Mã lợn">{data.pig_code}</Descriptions.Item>
          <Descriptions.Item label="Chuồng">{data.barn_name}</Descriptions.Item>
          <Descriptions.Item label="Ngày chuẩn đoán">{data.diagnosis_date}</Descriptions.Item>
          <Descriptions.Item label="Ngày tái khám">{data.next_check_date || '—'}</Descriptions.Item>
          <Descriptions.Item label="Nhiệt độ">{data.temperature ? `${data.temperature} °C` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Cân nặng">{data.weight ? `${data.weight} kg` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Mức độ">
            <Tag color={SEV_COLOR[data.severity_level]}>{SEV_LABEL[data.severity_level]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={STATUS_COLOR[data.status]}>{STATUS_LABEL[data.status]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Bác sĩ điều trị">{data.vet_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Triệu chứng" span={2}>{data.symptoms}</Descriptions.Item>
          <Descriptions.Item label="Bệnh nghi ngờ">{data.suspected_disease || '—'}</Descriptions.Item>
          <Descriptions.Item label="Kết luận bệnh">{data.final_disease || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phác đồ điều trị" span={2}>{data.treatment_plan || '—'}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={2}>{data.note || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Danh sách thuốc đã dùng" style={{ marginTop: 16 }}>
        <Table
          dataSource={data.medicines || []}
          columns={medColumns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'Không có thuốc nào được ghi nhận' }}
        />
      </Card>
    </div>
  )
}
