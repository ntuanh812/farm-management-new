import { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Select, Input,
  Tag, Space, Image, Badge, message, Row, Col,
} from 'antd'
import { CheckOutlined, EyeOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'

const { TextArea } = Input
const { Option }   = Select
const API = 'http://localhost:3000/api'

const STATUS_COLOR = { cho_xu_ly: 'orange', dang_xu_ly: 'blue', da_xu_ly: 'green' }
const STATUS_LABEL = { cho_xu_ly: 'Chờ xử lý', dang_xu_ly: 'Đang xử lý', da_xu_ly: 'Đã xử lý' }

export default function VetReview() {
  const { getAuthHeader } = useAuthStore()
  const headers = getAuthHeader()

  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState(null)  // báo cáo đang xem
  const [openDetail, setOpenDetail] = useState(false)
  const [openRespond, setOpenRespond] = useState(false)
  const [filterStatus, setFilterStatus] = useState(null)
  const [form] = Form.useForm()

  const fetchList = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const { data } = await axios.get(`${API}/pig-reports`, { headers, params })
      setList(data.data)
    } catch { message.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchList() }, [filterStatus])

  // ── Xem chi tiết ─────────────────────────────────────────
  const handleView = (rec) => {
    setSelected(rec)
    setOpenDetail(true)
  }

  // ── Mở form phản hồi ─────────────────────────────────────
  const handleRespond = (rec) => {
    setSelected(rec)
    form.setFieldsValue({ status: rec.status, vet_note: rec.vet_note || '' })
    setOpenRespond(true)
  }

  // ── Submit phản hồi ──────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.patch(`${API}/pig-reports/${selected.id}/respond`, values, { headers })
      message.success('Đã cập nhật phản hồi')
      setOpenRespond(false)
      fetchList()
    } catch { message.error('Lỗi cập nhật') }
  }

  // Số báo cáo chờ xử lý
  const pendingCount = list.filter(r => r.status === 'cho_xu_ly').length

  const columns = [
    { title: 'Mã lợn',    dataIndex: 'pig_id',       width: 100 },
    { title: 'Chuồng',    dataIndex: 'barn_name',     width: 110 },
    { title: 'Người báo', dataIndex: 'reporter_name', width: 140 },
    {
      title: 'Triệu chứng', dataIndex: 'description', ellipsis: true,
    },
    {
      title: 'Ảnh', dataIndex: 'images', width: 100,
      render: imgs => (
        <Image.PreviewGroup>
          <Space size={4}>
            {(imgs || []).slice(0, 2).map((url, i) => (
              <Image key={i} width={36} height={36}
                src={`http://localhost:3000${url}`}
                style={{ objectFit: 'cover', borderRadius: 4 }} />
            ))}
            {imgs?.length > 2 && <span style={{ color: '#888', fontSize: 12 }}>+{imgs.length - 2}</span>}
            {(!imgs || imgs.length === 0) && <span style={{ color: '#ccc', fontSize: 12 }}>—</span>}
          </Space>
        </Image.PreviewGroup>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'action', width: 140,
      render: (_, rec) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(rec)}>
            Xem
          </Button>
          <Button size="small" type="primary" icon={<CheckOutlined />}
            style={{ background: '#2d5a27' }} onClick={() => handleRespond(rec)}>
            Phản hồi
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="reports-page">
      <PageHeader
        title={
          <Space>
            Báo cáo lợn bệnh
            {pendingCount > 0 && <Badge count={pendingCount} style={{ background: '#c44536' }} />}
          </Space>
        }
        subtitle="Xem ảnh và phản hồi báo cáo từ nhân viên"
      />

      <div className="reports-page__body">
        {/* Toolbar filter */}
        <div className="reports-page__toolbar">
          <Select placeholder="Lọc trạng thái" style={{ width: 180 }}
            allowClear onChange={setFilterStatus}>
            <Option value="cho_xu_ly">Chờ xử lý</Option>
            <Option value="dang_xu_ly">Đang xử lý</Option>
            <Option value="da_xu_ly">Đã xử lý</Option>
          </Select>
        </div>

        <Table columns={columns} dataSource={list} rowKey="id"
          loading={loading} size="small" scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
          rowClassName={rec => rec.status === 'cho_xu_ly' ? 'row-urgent' : ''}
        />

      {/* Modal xem chi tiết ảnh + thông tin */}
      <Modal
        title={`Chi tiết báo cáo — Lợn ${selected?.pig_id}`}
        open={openDetail}
        onCancel={() => setOpenDetail(false)}
        footer={[
          <Button key="close" onClick={() => setOpenDetail(false)}>Đóng</Button>,
          <Button key="respond" type="primary" style={{ background: '#2d5a27' }}
            onClick={() => { setOpenDetail(false); handleRespond(selected) }}>
            Phản hồi ngay
          </Button>,
        ]}
        width={700}
      >
        {selected && (
          <div className="report-detail">
            <div className="report-detail__meta">
              <div><strong>Mã lợn:</strong> {selected.pig_id}</div>
              <div><strong>Chuồng:</strong> {selected.barn_name}</div>
              <div>
                <strong>Trạng thái:</strong>{' '}
                <Tag color={STATUS_COLOR[selected.status]}>{STATUS_LABEL[selected.status]}</Tag>
              </div>
              <div><strong>Người báo cáo:</strong> {selected.reporter_name}</div>
            </div>

            <div style={{ marginBottom: 12 }}><strong>Triệu chứng mô tả:</strong></div>
            <div className="report-detail__description">{selected.description}</div>

            {/* Ảnh */}
            <div style={{ marginTop: 16 }}>
              <strong>📷 Ảnh chụp ({selected.images?.length || 0} ảnh):</strong>
              <div className="report-detail__images">
                {selected.images?.length > 0 ? (
                  <Image.PreviewGroup>
                    {selected.images.map((url, i) => (
                      <Image key={i} width={150} height={150}
                        src={`http://localhost:3000${url}`}
                        style={{ objectFit: 'cover' }}
                      />
                    ))}
                  </Image.PreviewGroup>
                ) : (
                  <span style={{ color: '#ccc' }}>Không có ảnh</span>
                )}
              </div>
            </div>

            {/* Phản hồi cũ */}
            {selected.vet_note && (
              <div style={{ marginTop: 16 }}>
                <strong>💬 Phản hồi của bác sĩ:</strong>
                <div className="report-detail__vet-note">{selected.vet_note}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal phản hồi */}
      <Modal
        title="✏️ Phản hồi báo cáo"
        open={openRespond}
        onCancel={() => setOpenRespond(false)}
        onOk={handleSubmit}
        okText="Lưu phản hồi"
        okButtonProps={{ style: { background: '#2d5a27' } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Cập nhật trạng thái" name="status"
            rules={[{ required: true }]}>
            <Select>
              <Option value="cho_xu_ly">Chờ xử lý</Option>
              <Option value="dang_xu_ly">Đang xử lý</Option>
              <Option value="da_xu_ly">Đã xử lý</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Ghi chú / hướng dẫn xử lý" name="vet_note"
            rules={[{ required: true, message: 'Nhập phản hồi cho nhân viên' }]}>
            <TextArea rows={4}
              placeholder="VD: Cách ly ngay, theo dõi thân nhiệt mỗi 4 tiếng. Tôi sẽ đến kiểm tra lúc 2h chiều..." />
          </Form.Item>
        </Form>
      </Modal>
      </div> 
    </div>  
  )
}
