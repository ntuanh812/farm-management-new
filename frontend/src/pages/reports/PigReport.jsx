import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select,
  Upload, Tag, Space, Popconfirm, Image, message, Row, Col, Card
} from 'antd'
import { PlusOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'

const { TextArea } = Input
const { Option }   = Select
const API = 'http://localhost:3000/api'

const STATUS_COLOR = { cho_xu_ly: 'orange', dang_xu_ly: 'blue', da_xu_ly: 'green' }
const STATUS_LABEL = { cho_xu_ly: 'Chờ xử lý', dang_xu_ly: 'Đang xử lý', da_xu_ly: 'Đã xử lý' }

export default function PigReport() {
  const { token, user } = useAuthStore()
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [list, setList]       = useState([])
  const [barns, setBarns]     = useState([])
  const [pigs, setPigs]       = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [fileList, setFileList] = useState([])   // ảnh đã chọn
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  // ── Fetch danh sách ──────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/pig-reports`, { headers })
      setList(data.data)
    } catch { message.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }, [headers])

  const fetchDropdowns = useCallback(async () => {
    try {
      const [barnsRes, pigsRes] = await Promise.all([
        axios.get(`${API}/barns`, { headers }),
        axios.get(`${API}/pigs`, { headers })
      ])
      setBarns(barnsRes.data?.data || [])
      setPigs(pigsRes.data?.data || [])
    } catch { /* lỗi thì bỏ qua */ }
  }, [headers])

  useEffect(() => { fetchList(); fetchDropdowns() }, [fetchList, fetchDropdowns])

  // ── Xử lý upload ảnh ────────────────────────────────────
  const handleUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData()
    formData.append('files', file)
    try {
      const { data } = await axios.post(`${API}/pig-reports/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      })
      // Lưu URL trả về vào file object để dùng khi submit
      file.serverUrl = data.data[0]
      onSuccess(data)
    } catch (err) {
      onError(err)
      message.error('Upload ảnh thất bại')
    }
  }

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

      await axios.post(`${API}/pig-reports`, {
        ...values,
        images,
      }, { headers })

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
      await axios.delete(`${API}/pig-reports/${id}`, { headers })
      message.success('Đã xóa báo cáo')
      fetchList()
    } catch { message.error('Xóa thất bại') }
  }

  // ── Columns ──────────────────────────────────────────────
  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    { title: 'Thời gian', dataIndex: 'created_at', width: 120, render: v => dayjs(v).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Lợn & Chuồng',
      key: 'pig_info',
      width: 130,
      render: (_, rec) => (
        <div>
          <div className="reports-page__pig-id">{rec.pig_id}</div>
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
      title: 'Thao tác', key: 'action', width: 80, align: 'center',
      render: (_, rec) => (
        user?.role === 'ADMIN' && (
          <Popconfirm title="Xóa báo cáo này?" onConfirm={() => handleDelete(rec.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )
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
                    const pig = pigs.find(p => p.earTag === val || p.pig_code === val || p.pigCode === val);
                    if (pig) {
                      form.setFieldsValue({ barn_id: pig.barnId || pig.barn_id });
                    }
                  }}
                >
                  {pigs.filter(p => (p.lifecycleStatus || p.lifecycle_status) === 'ACTIVE').map(p => {
                    const code = p.earTag || p.pig_code || p.pigCode;
                    return <Option key={p.id} value={code}>{code}</Option>;
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
              customRequest={handleUpload}
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
    </div> 
  )
}
