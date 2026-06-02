import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Space,
  Popconfirm,
  message,
  Radio,
  Row,
  Col,
  InputNumber,
} from "antd";
import { PlusOutlined, DeleteOutlined, ImportOutlined, AppstoreOutlined, DatabaseOutlined, LineChartOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/store/authStore";

const { Option } = Select;
const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function PigVaccination() {
  const { token, user } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // States
  const [vaccinations, setVaccinations] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [barns, setBarns] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [open, setOpen] = useState(false);
  const [applyType, setApplyType] = useState("barn");
  const [form] = Form.useForm();
  const [addVaccineForm] = Form.useForm();
  const [importForm] = Form.useForm();

  const [isAddVaccineModalOpen, setIsAddVaccineModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Phân quyền: Chỉ Admin và Bác sĩ thú y được thao tác
  const canEdit = user?.role === "ADMIN" || user?.role === "VET_DOCTOR";

  // Lấy dữ liệu từ Backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resVac, resPigs, resBarns, resVaccines] = await Promise.all([
        axios.get(`${API}/vaccinations`, { headers }),
        axios.get(`${API}/pigs`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/barns`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/vaccines`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);

      if (resVac.data?.success) setVaccinations(resVac.data.data);
      if (resPigs.data?.success) setPigs(resPigs.data.data);
      if (resBarns.data?.success) setBarns(resBarns.data.data);
      if (resVaccines.data?.success) setVaccines(resVaccines.data.data);
    } catch (error) {
      message.error("Không thể tải dữ liệu tiêm phòng");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gộp các bản ghi tiêm theo chuồng để hiển thị thành 1 dòng duy nhất
  const tableData = useMemo(() => {
    const grouped = [];
    const barnGroups = {};

    vaccinations.forEach(v => {
      if (v.barn_id) {
        grouped.push({
          ...v,
          isGroup: true,
          barnName: v.barn_name,
          pigCount: 'Toàn bộ',
          recordIds: [v.id]
        });
      } else if (v.note && v.note.startsWith('[Chuồng:')) {
        const match = v.note.match(/^\[Chuồng:\s*(.+?)\]/);
        if (match) {
          const barnName = match[1];
          const key = `${v.vaccinated_at}_${v.vaccine_name}_${v.note}`;
          if (!barnGroups[key]) {
            barnGroups[key] = {
              ...v,
              isGroup: true,
              barnName: barnName,
              pigCount: 1,
              recordIds: [v.id]
            };
            grouped.push(barnGroups[key]);
          } else {
            barnGroups[key].pigCount += 1;
            barnGroups[key].recordIds.push(v.id);
          }
        } else {
          grouped.push(v);
        }
      } else {
        grouped.push(v);
      }
    });

    return grouped.sort((a, b) => dayjs(b.vaccinated_at).valueOf() - dayjs(a.vaccinated_at).valueOf());
  }, [vaccinations]);

  const handleAddVaccine = async () => {
    try {
      const values = await addVaccineForm.validateFields();
      await axios.post(`${API}/vaccines`, values, { headers });
      message.success('Thêm loại vaccine thành công');
      setIsAddVaccineModalOpen(false);
      addVaccineForm.resetFields();
      fetchData(); 
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể thêm vaccine');
    }
  };

  const handleImportSubmit = async () => {
    try {
      const values = await importForm.validateFields();
      await axios.put(`${API}/vaccines/${values.vaccine_id}/stock`, { quantity: values.quantity }, { headers });
      message.success('Nhập thêm vaccine vào kho thành công');
      setIsImportModalOpen(false);
      importForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể nhập kho');
    }
  };

  const stats = useMemo(() => {
    const totalVaccineTypes = vaccines.length;
    const totalStock = vaccines.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const totalUsed = vaccinations.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
    const lowStock = vaccines.filter(v => (Number(v.stock) || 0) < 50).length;

    return { totalVaccineTypes, totalStock, totalUsed, lowStock };
  }, [vaccines, vaccinations]);

  const handleDelete = async (record) => {
    try {
      if (record.isGroup && record.recordIds.length > 1) {
        // Xóa tất cả lợn trong lần tiêm chung này (bản cũ)
        await Promise.all(record.recordIds.map(id => axios.delete(`${API}/vaccinations/${id}`, { headers })));
      } else {
        // Bản ghi tiêm chuồng mới hoặc cá thể
        await axios.delete(`${API}/vaccinations/${record.id}`, { headers });
      }
      message.success("Đã xóa bản ghi tiêm phòng");
      fetchData();
    } catch (error) {
      message.error("Không thể xóa bản ghi này");
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Ngày tiêm",
      dataIndex: "vaccinated_at",
      key: "vaccinated_at",
      render: (iso) => (iso ? dayjs(iso).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Đối tượng",
      key: "target",
      render: (_, r) => {
        if (r.isGroup) {
          return <span>Chuồng: <strong>{r.barnName}</strong> <br/><span className="text-muted" style={{fontSize: 12}}>{typeof r.pigCount === 'number' ? `Tiêm cho ${r.pigCount} cá thể` : 'Tiêm chung toàn chuồng'}</span></span>;
        }

        const pig = pigs.find(p => p.id === r.pig_id);
        const barnName = pig?.barnName || pig?.barn_name;
        
        return <span>Cá thể: <strong>PIG{String(r.pig_id).padStart(3, "0")}</strong>{barnName ? ` - Chuồng: ${barnName}` : ''}</span>;
      }
    },
    { title: "Vaccine", dataIndex: "vaccine_name", key: "vaccine_name" },
    { title: "Số lượng", key: "quantity", render: (_, r) => r.quantity ? `${r.quantity} ${r.unit || ''}` : '-' },
    { title: "Người thực hiện", dataIndex: "performed_by_name", key: "performed_by_name" },
    { 
      title: "Ghi chú", 
      dataIndex: "note", 
      key: "note",
      render: (text) => {
        if (text && text.startsWith('[Chuồng:')) {
          return text.replace(/^\[Chuồng:\s*[^\]]+\]\s*/, '') || '-';
        }
        return text || '-';
      }
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, r) => canEdit && (
        <Popconfirm
          title="Xóa bản ghi tiêm phòng này?"
          onConfirm={() => handleDelete(r)}
        >
          <Button danger type="text" icon={<DeleteOutlined />} title="Xóa" />
        </Popconfirm>
      ),
    },
  ];

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const { apply_type, barn_id, pig_ids, vaccine_id, quantity, unit, vaccinated_at, note } = values;
        
        if (apply_type === 'barn') {
          const payload = {
            barn_id: barn_id,
            vaccine_id,
            quantity,
            unit,
            vaccinated_at: vaccinated_at.format("YYYY-MM-DD"),
            note: note || ''
          };
          await axios.post(`${API}/vaccinations`, payload, { headers });
          message.success(`Đã lưu lịch tiêm chung cho chuồng`);
        } else {
          const requests = pig_ids.map(pigId => {
            const payload = {
              pig_id: pigId,
              vaccine_id,
              quantity,
              unit,
              vaccinated_at: vaccinated_at.format("YYYY-MM-DD"),
              note: note || ''
            };
            return axios.post(`${API}/vaccinations`, payload, { headers });
          });

          await Promise.all(requests);
          message.success(`Đã lưu lịch tiêm cho ${pig_ids.length} cá thể lợn`);
        }
        
        setOpen(false);
        form.resetFields();
        setApplyType('barn');
        fetchData();
      } catch (error) {
        message.error(error.response?.data?.message || "Lỗi khi lưu lịch tiêm");
      }
    });
  };

  return (
    <div className="dashboard vaccination-page">
      <PageHeader
        title="Tiêm phòng"
        subtitle="Gắn mũi tiêm với cá thể lợn"
        actions={
          canEdit && (
            <Space>
              <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>Nhập kho vaccine</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                form.resetFields();
                form.setFieldsValue({ vaccinated_at: dayjs() });
                form.setFieldsValue({ apply_type: "barn" });
                setApplyType("barn");
                setOpen(true);
              }}>
                Ghi nhận tiêm
              </Button>
            </Space>
          )
        }
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--barn">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng loại vaccine</span>
                <div className="stat-card__icon"><AppstoreOutlined /></div>
              </div>
              <div className="stat-card__value">
                {stats.totalVaccineTypes}
                <span className="stat-card__label"> loại</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--pigs">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng tồn kho</span>
                <div className="stat-card__icon"><DatabaseOutlined /></div>
              </div>
              <div className="stat-card__value">
                {Math.round(stats.totalStock).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                <span className="stat-card__label"> đv</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--daily-tasks">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng đã sử dụng</span>
                <div className="stat-card__icon"><LineChartOutlined /></div>
              </div>
              <div className="stat-card__value">
                {Math.round(stats.totalUsed).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                <span className="stat-card__label"> đv</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--staff">
              <div className="stat-card__header">
                <span className="stat-card__title">Sắp hết (Dưới 50)</span>
                <div className="stat-card__icon"><WarningOutlined /></div>
              </div>
              <div className="stat-card__value text-danger" style={{ color: stats.lowStock > 0 ? '#ff4d4f' : 'inherit' }}>
                {stats.lowStock}
                <span className="stat-card__label"> loại</span>
              </div>
            </Card>
          </Col>
        </Row>

        <Card className="table-card" style={{ marginTop: 24 }}>
          <Table
            rowKey={(r) => r.isGroup ? `group_${r.recordIds[0]}` : r.id}
            columns={columns}
            dataSource={tableData}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>

      {/* ===== MODAL ===== */}
      <Modal
        title="Ghi nhận tiêm"
        open={open}
        onOk={handleOk}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
          setApplyType('barn');
        }}
        okText="Lưu"
        cancelText="Hủy"
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Form.Item name="apply_type" label="Hình thức tiêm" initialValue="barn">
            <Radio.Group onChange={(e) => setApplyType(e.target.value)}>
              <Radio value="barn">Theo chuồng (Tiêm chung)</Radio>
              <Radio value="pig">Chọn cá thể (Tiêm riêng)</Radio>
            </Radio.Group>
          </Form.Item>

          {applyType === 'barn' ? (
            <Form.Item name="barn_id" label="Chọn chuồng" rules={[{ required: true, message: 'Vui lòng chọn chuồng' }]}>
              <Select showSearch placeholder="Chọn chuồng...">
                {barns.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item name="pig_ids" label="Chọn cá thể lợn" rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 con' }]}>
              <Select mode="multiple" showSearch optionFilterProp="children" placeholder="Chọn lợn...">
                {pigs.filter(p => p.lifecycleStatus === 'ACTIVE' || p.lifecycle_status === 'ACTIVE').map(p => (
                  <Option key={p.id} value={p.id}>PIG{String(p.id).padStart(3, "0")} - {p.barnName || p.barn_name}</Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="Tên Vaccine" required>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Form.Item name="vaccine_id" noStyle rules={[{ required: true, message: 'Nhập hoặc chọn tên vaccine' }]}>
                <Select showSearch options={vaccines.map(v => ({ label: `${v.name} (Tồn: ${v.stock || 0} ${v.unit || ''})`, value: v.id }))} placeholder="VD: LMLM, Tai xanh..." style={{ flex: 1 }} />
              </Form.Item>
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsAddVaccineModalOpen(true)} title="Thêm loại vaccine mới" />
            </div>
          </Form.Item>

          <Space align="baseline">
            <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }]}>
              <InputNumber min={0.1} step={0.1} className="w-100" />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị" initialValue="liều" rules={[{ required: true, message: 'Chọn đơn vị' }]}>
              <Select options={[{label:'liều', value:'liều'}, {label:'lọ', value:'lọ'}, {label:'ml', value:'ml'}]} className="w-120" />
            </Form.Item>
          </Space>

          <Form.Item
            name="vaccinated_at"
            label="Ngày tiêm"
            initialValue={dayjs()}
            rules={[{ required: true }]}
          >
            <DatePicker
              className="w-100"
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title="Thêm loại vaccine mới" 
        open={isAddVaccineModalOpen} 
        onCancel={() => setIsAddVaccineModalOpen(false)}
        onOk={handleAddVaccine}
        okText="Thêm mới"
        cancelText="Hủy"
      >
        <Form form={addVaccineForm} layout="vertical">
          <Form.Item name="name" label="Tên vaccine" rules={[{ required: true, message: 'Vui lòng nhập tên vaccine' }]}>
            <Input placeholder="Ví dụ: Vaccine Tai xanh..." />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị tính" initialValue="liều" rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}>
            <Select options={[{label:'liều', value:'liều'}, {label:'lọ', value:'lọ'}, {label:'ml', value:'ml'}]} placeholder="VD: liều, lọ..." />
          </Form.Item>
          <Form.Item name="stock" label="Số lượng tồn ban đầu">
            <InputNumber min={0} className="w-100" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Nhập thêm vaccine vào kho" open={isImportModalOpen} onCancel={() => setIsImportModalOpen(false)} onOk={handleImportSubmit} okText="Xác nhận" cancelText="Hủy">
        <Form form={importForm} layout="vertical">
          <Form.Item label="Tên vaccine" required>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Form.Item name="vaccine_id" noStyle rules={[{ required: true, message: 'Chọn vaccine để nhập' }]}>
                <Select showSearch options={vaccines.map(v => ({ label: `${v.name} (Tồn hiện tại: ${v.stock || 0} ${v.unit || ''})`, value: v.id }))} placeholder="Chọn vaccine..." style={{ flex: 1 }} />
              </Form.Item>
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsAddVaccineModalOpen(true)} title="Thêm loại vaccine mới" />
            </div>
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng nhập thêm" rules={[{ required: true, message: 'Nhập số lượng' }]}>
            <InputNumber min={0.1} step={0.1} className="w-100" placeholder="Ví dụ: 100" />
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </div>
  );
}