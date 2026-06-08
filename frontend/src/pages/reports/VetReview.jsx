import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Table, Button, Modal, Form, Select, Input,
  Tag, Space, Image, Badge, message, Divider, Descriptions, Card, Upload
} from 'antd'
import { AuditOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons'
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
  const { token, user } = useAuthStore()
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState(null)  // báo cáo đang xem
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState(null)
  const [form] = Form.useForm()
  
  const [messagesList, setMessagesList] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [messageFileList, setMessageFileList] = useState([])
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

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
    fetchMessages(rec.id)
  }

  const fetchMessages = async (id) => {
    try {
      const { data } = await axios.get(`${API}/pig-reports/${id}/messages`, { headers })
      setMessagesList(data.data)
    } catch { message.error('Lỗi tải tin nhắn') }
  }

  // ── Xử lý upload ảnh ────────────────────────────────────
  const handleUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData()
    formData.append('files', file)
    try {
      const { data } = await axios.post(`${API}/pig-reports/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      })
      file.serverUrl = data.data[0]
      onSuccess(data)
    } catch (err) {
      onError(err)
      message.error('Upload ảnh thất bại')
    }
  }

  // ── Submit phản hồi ──────────────────────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true)
    try {
      const images = messageFileList
        .filter(f => f.status === 'done')
        .map(f => f.response?.data?.[0] || f.url?.replace('http://localhost:3000', ''))
        .filter(Boolean)

      const currentStatus = form.getFieldValue('status');
      await axios.post(`${API}/pig-reports/${selected.id}/messages`, {
        message: newMessage,
        images,
        status: currentStatus
      }, { headers })
      setNewMessage('')
      setMessageFileList([])
      fetchMessages(selected.id)
      fetchList()
    } catch { message.error('Lỗi gửi phản hồi') }
    finally { setSending(false) }
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messagesList, isModalOpen])

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
        <div title={text} className="reports-page__vet-note reports-page__vet-note--truncate">
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
            className={isDone ? 'btn-process-done' : 'btn-process-pending'}
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
        <Form layout="inline" className="reports-page__filter-form" onValuesChange={(_, vals) => setFilterStatus(vals.status)}>
          <Form.Item name="status">
            <Select placeholder="Lọc trạng thái" className="reports-page__filter-select" allowClear>
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
        title={`Trao đổi bệnh án — PIG${String(selected?.pig_id).padStart(3, "0")}`}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setSelected(null); setMessagesList([]); setNewMessage(''); setMessageFileList([]); }}
        width={700}
        footer={null}
      >
        {selected && (
          <div className="reports-page__modal-body">
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã lợn"><b>PIG{String(selected.pig_id).padStart(3, "0")}</b></Descriptions.Item>
              <Descriptions.Item label="Chuồng">{selected.barn_name}</Descriptions.Item>
              <Descriptions.Item label="Người báo">{selected.reporter_name}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Form form={form} component={false}>
                  <Form.Item name="status" noStyle>
                    <Select 
                      size="small" 
                      className="reports-page__status-select" 
                      onChange={async (val) => {
                        await axios.patch(`${API}/pig-reports/${selected.id}/respond`, { status: val }, { headers })
                        message.success('Cập nhật trạng thái thành công')
                        fetchList()
                        setSelected({...selected, status: val})
                      }}
                    >
                      <Option value="cho_xu_ly">Chờ xử lý</Option>
                      <Option value="dang_xu_ly">Đang xử lý</Option>
                      <Option value="da_xu_ly">Đã xử lý</Option>
                    </Select>
                  </Form.Item>
                </Form>
              </Descriptions.Item>
            </Descriptions>

            <Divider className="reports-page__divider" />

            <div className="reports-chat__container reports-chat__container--vet" style={{ height: '60vh', minHeight: '450px' }}>
              <div className="reports-chat__messages">
                <div className="reports-chat__item">
                  <div className="reports-chat__item-content">
                    <div className="reports-chat__meta">
                      <b>{selected.reporter_name}</b> (Người báo cáo) - {dayjs(selected.created_at).format('HH:mm DD/MM')}
                    </div>
                    <div className="reports-chat__bubble reports-chat__bubble--other">
                      <div className="reports-chat__text">{selected.description}</div>
                      {Array.isArray(selected.images) && selected.images.length > 0 && (
                        <div className="reports-chat__images">
                          <Image.PreviewGroup>
                            <Space size={8} wrap>
                              {selected.images.map((url, i) => (
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
                          <b>{isMe ? 'Bạn' : msg.sender_name}</b> {msg.sender_role ? `(${msg.sender_role})` : ''} - {dayjs(msg.created_at).format('HH:mm DD/MM')}
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
                  <TextArea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Nhập phản hồi..." autoSize={{ minRows: 2, maxRows: 4 }} onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                  <Button type="primary" className="reports-chat__send-btn" onClick={handleSendMessage} loading={sending} style={{ height: 'auto' }}>Gửi</Button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Upload
                    customRequest={handleUpload}
                    listType="picture-card"
                    fileList={messageFileList}
                    onChange={({ fileList: fl }) => setMessageFileList(fl)}
                    maxCount={3}
                    accept="image/*"
                    multiple
                  >
                    {messageFileList.length < 3 && (
                      <div><UploadOutlined /><div style={{ marginTop: 8 }}>Tải ảnh</div></div>
                    )}
                  </Upload>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>  
  )
}
