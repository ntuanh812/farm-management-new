import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, Button, Modal, Form, Input, Select,
  Upload, Tag, Space, Popconfirm, Image, message, Row, Col, Card
} from 'antd'
import { PlusOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import axiosClient from '@/utils/axiosClient'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { uploadFile } from '@/utils/upload'

dayjs.extend(utc)

const { TextArea } = Input
const { Option }   = Select

const STATUS_COLOR = { cho_xu_ly: 'orange', dang_xu_ly: 'blue', da_xu_ly: 'green' }
const STATUS_LABEL = { cho_xu_ly: 'Chờ xử lý', dang_xu_ly: 'Đang xử lý', da_xu_ly: 'Đã xử lý' }

export default function PigReport() {
  const { user } = useAuthStore()

  const [list, setList]       = useState([])
  const [barns, setBarns]     = useState([])
  const [pigs, setPigs]       = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [fileList, setFileList] = useState([])   // ảnh đã chọn
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()
  
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [messagesList, setMessagesList] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [messageFileList, setMessageFileList] = useState([])
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  // ── Fetch danh sách ──────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`/pig-reports`)
      setList(data.data)
    } catch { message.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }, [])

  const fetchDropdowns = useCallback(async () => {
    try {
      const [barnsRes, pigsRes] = await Promise.all([
        axiosClient.get(`/barns`),
        axiosClient.get(`/pigs`)
      ])
      setBarns(barnsRes.data?.data || [])
      setPigs(pigsRes.data?.data || [])
    } catch { /* lỗi thì bỏ qua */ }
  }, [])

  useEffect(() => { fetchList(); fetchDropdowns() }, [fetchList, fetchDropdowns])

  // ── Submit tạo báo cáo ───────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setUploading(true)

      // Lấy URL ảnh đã upload thành công
      const images = fileList
        .filter(f => f.status === 'done')
        .map(f => f.response?.data?.[0] || f.url?.replace('http://localhost:3000', ''))
        .filter(Boolean)

      await axiosClient.post(`/pig-reports`, {
        ...values,
        images,
      })

      message.success('Gửi báo cáo thành công! Bác sĩ sẽ xem xét sớm.')
      setOpen(false)
      form.resetFields()
      setFileList([])
      fetchList()
    } catch { /* validate tự hiển thị */ }
    finally { setUploading(false) }
  }

  // ── Xóa báo cáo ─────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/pig-reports/${id}`)
      message.success('Đã xóa báo cáo')
      fetchList()
    } catch { message.error('Xóa thất bại') }
  }

  // ── Thảo luận (Chat) ────────────────────────────────────
  const openChat = (rec) => {
    setSelectedReport(rec)
    setChatOpen(true)
    fetchMessages(rec.id)
  }

  const fetchMessages = async (id) => {
    try {
      const { data } = await axiosClient.get(`/pig-reports/${id}/messages`)
      setMessagesList(data.data)
    } catch { message.error('Lỗi tải tin nhắn') }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const images = messageFileList
        .filter(f => f.status === 'done')
        .map(f => f.response?.data?.[0] || f.url?.replace('http://localhost:3000', ''))
        .filter(Boolean)

      await axiosClient.post(`/pig-reports/${selectedReport.id}/messages`, { message: newMessage, images })
      setNewMessage('')
      setMessageFileList([])
      fetchMessages(selectedReport.id)
    } catch { message.error('Lỗi gửi tin nhắn') }
    finally { setSending(false) }
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messagesList, chatOpen])

  // ── Columns ──────────────────────────────────────────────
  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    { title: 'Thời gian', dataIndex: 'created_at', width: 120, render: v => dayjs.utc(v).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Lợn & Chuồng',
      key: 'pig_info',
      width: 130,
      render: (_, rec) => (
        <div>
          <div className="reports-page__pig-id">PIG{String(rec.pig_id).padStart(3, "0")}</div>
          <div className="reports-page__barn-name">{rec.barn_name}</div>
        </div>
      )
    },
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
      title: 'Ảnh chụp',
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
        <span className="reports-page__empty-text">Không có ảnh</span>
      )
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Phản hồi từ Thú y', key: 'vet_feedback', width: 220,
      render: (_, rec) => rec.vet_note ? (
        <div>
          <div className="reports-page__vet-name">BS. {rec.vet_name}</div>
          <div className="reports-page__vet-note">"{rec.vet_note}"</div>
        </div>
      ) : <span className="reports-page__empty-text">Chưa có phản hồi</span>
    },
    {
      title: 'Thao tác', key: 'action', width: 100, align: 'center',
      render: (_, rec) => (
        <Space>
          <Button size="small" type="primary" onClick={() => openChat(rec)}>
            Thảo luận
          </Button>
          {user?.role === 'ADMIN' && (
            <Popconfirm title="Xóa báo cáo này?" onConfirm={() => handleDelete(rec.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="reports-page">
      <PageHeader
        title="Báo cáo lợn bệnh"
        subtitle="Gửi ảnh và mô tả triệu chứng cho bác sĩ thú y"
        actions={['FARM_WORKER', 'ADMIN'].includes(user?.role) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Tạo báo cáo mới
          </Button>
        )}
      />

      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal tạo báo cáo */}
      <Modal
        title="📋 Báo cáo lợn bệnh"
        open={open}
        onCancel={() => { setOpen(false); form.resetFields(); setFileList([]) }}
        onOk={handleSubmit}
        okText="Gửi báo cáo"
        confirmLoading={uploading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Mã lợn" name="pig_id"
                rules={[{ required: true, message: 'Chọn mã lợn' }]}>
                <Select 
                  showSearch 
                  placeholder="Chọn lợn"
                  onChange={(val) => {
                    const pig = pigs.find(p => p.id === val);
                    if (pig) {
                      form.setFieldsValue({ barn_id: pig.barnId || pig.barn_id });
                    }
                  }}
                >
                  {pigs.filter(p => (p.lifecycleStatus || p.lifecycle_status) === 'ACTIVE').map(p => {
                    return <Option key={p.id} value={p.id}>PIG{String(p.id).padStart(3, "0")}</Option>;
                  })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Chuồng" name="barn_id"
                rules={[{ required: true, message: 'Chọn chuồng' }]}>
                <Select disabled placeholder="Tự động điền khi chọn mã lợn">
                  {barns.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Mô tả triệu chứng" name="description"
            rules={[{ required: true, message: 'Mô tả triệu chứng' }]}>
            <TextArea
              rows={4}
              placeholder="VD: Lợn bỏ ăn từ sáng, đi loạng choạng, da có vết đỏ ở bụng..."
            />
          </Form.Item>

          <Form.Item label="📷 Ảnh chụp (tối đa 5 ảnh)">
            <Upload
              customRequest={(options) => uploadFile({ ...options, endpoint: `/pig-reports/upload`, fieldName: 'files' })}
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
              maxCount={5}
              accept="image/*"
              multiple
            >
              {fileList.length < 5 && (
                <div>
                  <UploadOutlined />
                  <div className="reports-page__upload-text">Chọn ảnh</div>
                </div>
              )}
            </Upload>
            <div className="reports-page__upload-hint">
              Chụp ảnh rõ vùng bị bệnh, tối đa 5MB mỗi ảnh
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Hội thoại */}
      <Modal
        title={`Thảo luận báo cáo — PIG${String(selectedReport?.pig_id).padStart(3, "0")}`}
        open={chatOpen}
        onCancel={() => { setChatOpen(false); setSelectedReport(null); setMessagesList([]); setNewMessage(''); setMessageFileList([]); }}
        footer={null}
        width={700}
      >
        {selectedReport && (
          <div className="reports-chat__container">
            <div className="reports-chat__messages">
              <div className="reports-chat__item">
                <div className="reports-chat__item-content">
                  <div className="reports-chat__meta">
                    <b>{selectedReport.reporter_name}</b> (Người báo cáo) - {dayjs.utc(selectedReport.created_at).format('HH:mm DD/MM')}
                  </div>
                  <div className="reports-chat__bubble reports-chat__bubble--other">
                    <div className="reports-chat__text">{selectedReport.description}</div>
                    {Array.isArray(selectedReport.images) && selectedReport.images.length > 0 && (
                      <div className="reports-chat__images">
                        <Image.PreviewGroup>
                          <Space size={8} wrap>
                            {selectedReport.images.map((url, i) => (
                              <Image key={i} width={60} height={60} src={`http://localhost:3000${url}`} className="reports-chat__img" />
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {messagesList.map(msg => {
                const isMe = msg.sender_id === user?.staff_id;
                return (
                  <div key={msg.id} className={`reports-chat__item ${isMe ? 'reports-chat__item--me' : ''}`}>
                    <div className={`reports-chat__item-content ${isMe ? 'reports-chat__item-content--me' : ''}`}>
                      <div className="reports-chat__meta">
                        <b>{isMe ? 'Bạn' : msg.sender_name}</b> {msg.sender_role ? `(${msg.sender_role})` : ''} - {dayjs.utc(msg.created_at).format('HH:mm DD/MM')}
                      </div>
                      <div className={`reports-chat__bubble ${isMe ? 'reports-chat__bubble--me' : 'reports-chat__bubble--other'}`}>
                        <div className="reports-chat__text">{msg.message}</div>
                        {Array.isArray(msg.images) && msg.images.length > 0 && (
                          <div className="reports-chat__images" style={{ marginTop: 8 }}>
                            <Image.PreviewGroup>
                              <Space size={8} wrap>
                                {msg.images.map((url, i) => (
                                  <Image key={i} width={60} height={60} src={`http://localhost:3000${url}`} className="reports-chat__img" />
                                ))}
                              </Space>
                            </Image.PreviewGroup>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="reports-chat__input-area" style={{ flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <TextArea disabled={selectedReport.status === 'da_xu_ly'} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={selectedReport.status === 'da_xu_ly' ? "Báo cáo đã đóng..." : "Nhập phản hồi..."} autoSize={{ minRows: 2, maxRows: 4 }} onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                <Button disabled={selectedReport.status === 'da_xu_ly'} type="primary" className="reports-chat__send-btn" onClick={handleSendMessage} loading={sending} style={{ height: 'auto' }}>Gửi</Button>
              </div>
              <div style={{ marginTop: 8 }}>
                <Upload
                  customRequest={(options) => uploadFile({ ...options, endpoint: `/pig-reports/upload`, fieldName: 'files' })}
                  listType="picture-card"
                  fileList={messageFileList}
                  onChange={({ fileList: fl }) => setMessageFileList(fl)}
                  maxCount={3}
                  accept="image/*"
                  multiple
                  disabled={selectedReport.status === 'da_xu_ly'}
                >
                  {messageFileList.length < 3 && (
                    <div><UploadOutlined /><div style={{ marginTop: 8 }}>Tải ảnh</div></div>
                  )}
                </Upload>
                {selectedReport.status === 'da_xu_ly' && <div style={{ color: '#ff4d4f', marginTop: 8, fontStyle: 'italic' }}>* Báo cáo này đã được xử lý xong, không thể tiếp tục thảo luận.</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
        