import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select,
  Upload, Tag, Space, Popconfirm, Image, message, Row, Col,
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
        .filter(f => f.status === 'done' && f.originFileObj?.serverUrl)
        .map(f => f.originFileObj.serverUrl)

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
    { title: 'Thời gian', dataIndex: 'created_at', width: 120, render: v => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Mã lợn',    dataIndex: 'pig_id',       width: 100 },
    { title: 'Chuồng',    dataIndex: 'barn_name',     width: 110 },
    { title: 'Người báo', dataIndex: 'reporter_name', width: 140 },
    {
      title: 'Triệu chứng', dataIndex: 'description', ellipsis: true,
      render: v => <span title={v}>{v}</span>,
    },
    {
      title: 'Ảnh', dataIndex: 'images', width: 120,
      render: imgs => (
        <Image.PreviewGroup>
          <Space size={4}>
            {(imgs || []).slice(0, 3).map((url, i) => (
              <Image key={i} width={36} height={36}
                src={`http://localhost:3000${url}`}
                style={{ objectFit: 'cover', borderRadius: 4 }} />
            ))}
            {imgs?.length > 3 && <span style={{ color: '#888' }}>+{imgs.length - 3}</span>}
            {(!imgs || imgs.length === 0) && <span style={{ color: '#ccc' }}>Không có ảnh</span>}
          </Space>
        </Image.PreviewGroup>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    { title: 'Bác sĩ xử lý', dataIndex: 'vet_name', width: 150,
      render: v => v || <span style={{ color: '#ccc' }}>Chưa có</span> },
    { title: 'Phản hồi', dataIndex: 'vet_note', ellipsis: true,
      render: v => v || <span style={{ color: '#ccc' }}>—</span> },
    {
      title: 'Thao tác', key: 'action', width: 80,
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
      />

      <div className="reports-page__body">
        {/* Toolbar */}
        <div className="reports-page__toolbar">
          {['FARM_WORKER', 'ADMIN'].includes(user?.role) && (
            <div className="reports-page__toolbar-right">
              <Button type="primary" icon={<PlusOutlined />}
                style={{ background: '#2d5a27' }} onClick={() => setOpen(true)}>
                Tạo báo cáo mới
              </Button>
            </div>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Modal tạo báo cáo */}
      <Modal
        title="📋 Báo cáo lợn bệnh"
        open={open}
        onCancel={() => { setOpen(false); form.resetFields(); setFileList([]) }}
        onOk={handleSubmit}
        okText="Gửi báo cáo"
        confirmLoading={uploading}
        okButtonProps={{ style: { background: '#2d5a27' } }}
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
                  <div style={{ marginTop: 4, fontSize: 12 }}>Chọn ảnh</div>
                </div>
              )}
            </Upload>
            <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              Chụp ảnh rõ vùng bị bệnh, tối đa 5MB mỗi ảnh
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div> 
  )
}
