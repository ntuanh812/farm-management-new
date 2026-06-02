import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Select, Input,
  Tag, Space, Image, Badge, message, Divider, Descriptions, Card
} from 'antd'
import { AuditOutlined, EditOutlined } from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'

const { TextArea } = Input
const { Option }   = Select
const API = 'http://localhost:3000/api'

const STATUS_COLOR = { cho_xu_ly: 'orange', dang_xu_ly: 'blue', da_xu_ly: 'green' }
const STATUS_LABEL = { cho_xu_ly: 'Chờ xử lý', dang_xu_ly: 'Đang xử lý', da_xu_ly: 'Đã xử lý' }

export default function VetReview() {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState(null)  // báo cáo đang xem
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState(null)
  const [form] = Form.useForm()

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const { data } = await axios.get(`${API}/pig-reports`, { headers, params })
      setList(data.data)
    } catch { message.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }, [headers, filterStatus])

  useEffect(() => { fetchList() }, [fetchList])

  // ── Mở Modal xử lý ─────────────────────────────────────
  const handleProcess = (rec) => {
    setSelected(rec)
    form.setFieldsValue({ status: rec.status, vet_note: rec.vet_note || '' })
    setIsModalOpen(true)
  }

  // ── Submit phản hồi ──────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.patch(`${API}/pig-reports/${selected.id}/respond`, values, { headers })
      message.success('Đã cập nhật phản hồi')
      setIsModalOpen(false)
      fetchList()
    } catch { message.error('Lỗi cập nhật') }
  }

  // Số báo cáo chờ xử lý
  const pendingCount = list.filter(r => r.status === 'cho_xu_ly').length

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    { title: 'Thời gian', dataIndex: 'created_at', width: 130, render: v => dayjs(v).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Lợn & Chuồng',
      key: 'pig_info',
      width: 120,
      render: (_, rec) => (
        <div>
          <div className="reports-page__pig-id">PIG{String(rec.pig_id).padStart(3, "0")}</div>
          <div className="reports-page__barn-name">{rec.barn_name}</div>
        </div>
      )
    },
    { title: 'Người báo', dataIndex: 'reporter_name', width: 130 },
    {
      title: 'Triệu chứng',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <div title={text} className="reports-page__symptoms-text">
          {text}
        </div>
      )
    },
    {
      title: 'Ảnh',
      key: 'images',
      width: 140,
      render: (_, rec) => rec.images?.length > 0 ? (
        <Image.PreviewGroup>
          <Space size={4}>
            {rec.images.slice(0, 3).map((url, i) => (
              <Image key={i} width={32} height={32} src={`http://localhost:3000${url}`} className="reports-page__img-thumb" />
            ))}
            {rec.images.length > 3 && <span className="reports-page__img-more">+{rec.images.length - 3}</span>}
          </Space>
        </Image.PreviewGroup>
      ) : (
        <span className="reports-page__empty-text">—</span>
      )
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Nội dung phản hồi', 
      dataIndex: 'vet_note', 
      key: 'vet_note',
      render: (text) => text ? (
        <div title={text} className="reports-page__vet-note" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
          "{text}"
        </div>
      ) : <span className="reports-page__empty-text">—</span>
    },
    {
      title: 'Thao tác', key: 'action', width: 120, align: 'center',
      render: (_, rec) => {
        const isDone = rec.status === 'da_xu_ly';
        return (
          <Button 
            size="small" 
            icon={isDone ? <EditOutlined /> : <AuditOutlined />}
            onClick={() => handleProcess(rec)}
            style={isDone ? {
              background: '#f8f9fa',
              borderColor: '#e2e8f0',
              color: '#64748b',
              borderRadius: 6,
              boxShadow: 'none'
            } : {
              background: '#ecfdf5',
              borderColor: '#bbf7d0',
              color: '#059669',
              borderRadius: 6,
              fontWeight: 600,
              boxShadow: 'none'
            }}
          >
            {isDone ? 'Xem lại' : 'Xử lý ngay'}
          </Button>
        );
      },
    },
  ]

  return (
    <div className="reports-page">
      <PageHeader
        title={
          <Space>
            Báo cáo lợn bệnh
            {pendingCount > 0 && <Badge count={pendingCount} color="#c44536" />}
          </Space>
        }
        subtitle="Xem ảnh và phản hồi báo cáo từ nhân viên"
      />

      <Card className="table-card">
        <Form layout="inline" style={{ marginBottom: 16 }} onValuesChange={(_, vals) => setFilterStatus(vals.status)}>
          <Form.Item name="status">
            <Select placeholder="Lọc trạng thái" style={{ width: 180 }} allowClear>
              <Option value="cho_xu_ly">Chờ xử lý</Option>
              <Option value="dang_xu_ly">Đang xử lý</Option>
              <Option value="da_xu_ly">Đã xử lý</Option>
            </Select>
          </Form.Item>
        </Form>

        <Table columns={columns} dataSource={list} rowKey="id"
          loading={loading} scroll={{ x: 1050 }}
          pagination={{ pageSize: 10 }}
          rowClassName={rec => rec.status === 'cho_xu_ly' ? 'row-urgent' : ''}
        />
      </Card>

      <Modal
        title={selected?.status === 'da_xu_ly' ? `Chi tiết báo cáo bệnh — PIG${String(selected?.pig_id).padStart(3, "0")}` : `Xử lý báo cáo bệnh — PIG${String(selected?.pig_id).padStart(3, "0")}`}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setSelected(null); }}
        onOk={handleSubmit}
        okText="Lưu phản hồi"
        cancelText="Hủy"
        width={700}
        footer={selected?.status === 'da_xu_ly' ? [
          <Button key="close" onClick={() => { setIsModalOpen(false); form.resetFields(); setSelected(null); }}>Đóng</Button>
        ] : undefined}
      >
        {selected && (
          <div className="reports-page__modal-body">
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã lợn"><b>PIG{String(selected.pig_id).padStart(3, "0")}</b></Descriptions.Item>
              <Descriptions.Item label="Chuồng">{selected.barn_name}</Descriptions.Item>
              <Descriptions.Item label="Người báo">{selected.reporter_name}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={STATUS_COLOR[selected.status]}>{STATUS_LABEL[selected.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Triệu chứng" span={2}>
                {selected.description}
              </Descriptions.Item>
              {selected.images?.length > 0 && (
                <Descriptions.Item label="Ảnh chụp" span={2}>
                  <Image.PreviewGroup>
                    <Space size={8} wrap>
                      {selected.images.map((url, i) => (
                        <Image key={i} width={80} height={80} src={`http://localhost:3000${url}`} className="reports-page__img-large" />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider className="reports-page__divider" />

            <Form form={form} layout="vertical" disabled={selected.status === 'da_xu_ly'}>
              <Form.Item label="Cập nhật trạng thái" name="status" rules={[{ required: true }]}>
                <Select>
                  <Option value="cho_xu_ly">Chờ xử lý</Option>
                  <Option value="dang_xu_ly">Đang xử lý</Option>
                  <Option value="da_xu_ly">Đã xử lý</Option>
                </Select>
              </Form.Item>

              <Form.Item label="Ghi chú / hướng dẫn xử lý" name="vet_note" rules={[{ required: true, message: 'Nhập phản hồi cho nhân viên' }]}>
                <TextArea rows={4} placeholder="VD: Cách ly ngay, theo dõi thân nhiệt..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>  
  )
}
