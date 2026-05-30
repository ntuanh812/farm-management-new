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
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
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
  const [loading, setLoading] = useState(false);
  
  const [open, setOpen] = useState(false);
  const [applyType, setApplyType] = useState("barn");
  const [form] = Form.useForm();

  // Phân quyền: Chỉ Admin và Bác sĩ thú y được thao tác
  const canEdit = user?.role === "ADMIN" || user?.role === "VET_DOCTOR";

  // Lấy dữ liệu từ Backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resVac, resPigs, resBarns] = await Promise.all([
        axios.get(`${API}/vaccinations`, { headers }),
        axios.get(`${API}/pigs`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/barns`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);

      if (resVac.data?.success) setVaccinations(resVac.data.data);
      if (resPigs.data?.success) setPigs(resPigs.data.data);
      if (resBarns.data?.success) setBarns(resBarns.data.data);
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
        
        return <span>Cá thể: <strong>Lợn số {r.pig_id}</strong>{barnName ? ` - Chuồng: ${barnName}` : ''}</span>;
      }
    },
    { title: "Vaccine", dataIndex: "vaccine_name", key: "vaccine_name" },
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
        const { apply_type, barn_id, pig_ids, vaccine_name, vaccinated_at, note } = values;
        
        if (apply_type === 'barn') {
          const payload = {
            barn_id: barn_id,
            vaccine_name,
            vaccinated_at: vaccinated_at.format("YYYY-MM-DD"),
            performed_by: user?.staff_id || user?.id,
            note: note || ''
          };
          await axios.post(`${API}/vaccinations`, payload, { headers });
          message.success(`Đã lưu lịch tiêm chung cho chuồng`);
        } else {
          const requests = pig_ids.map(pigId => {
            const payload = {
              pig_id: pigId,
              vaccine_name,
              vaccinated_at: vaccinated_at.format("YYYY-MM-DD"),
              performed_by: user?.staff_id || user?.id,
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
    <div className="vaccination-page">
      <PageHeader
        title="Tiêm phòng"
        subtitle="Gắn mũi tiêm với cá thể lợn"
        actions={
          canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              form.resetFields();
              form.setFieldsValue({ vaccinated_at: dayjs() });
              form.setFieldsValue({ apply_type: "barn" });
              setApplyType("barn");
              setOpen(true);
            }}>
              Ghi nhận tiêm
            </Button>
          )
        }
      />

      <Card className="table-card">
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
                  <Option key={p.id} value={p.id}>Lợn số {p.id} - {p.barnName || p.barn_name}</Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="vaccine_name"
            label="Tên vaccine"
            rules={[{ required: true }]}
          >
            <Select 
              showSearch 
              placeholder="Chọn vaccine"
              options={[
                { value: "LMLM (Lở mồm long móng)", label: "LMLM (Lở mồm long móng)" },
                { value: "PRRS (Tai xanh)", label: "PRRS (Tai xanh)" },
                { value: "CSF (Dịch tả lợn cổ điển)", label: "CSF (Dịch tả lợn cổ điển)" },
                { value: "PCV (Circo virus)", label: "PCV (Circo virus)" },
                { value: "Mycoplasma (Suyễn lợn)", label: "Mycoplasma (Suyễn lợn)" },
                { value: "PED (Dịch tiêu chảy cấp)", label: "PED (Dịch tiêu chảy cấp)" },
                { value: "E.coli", label: "E.coli" },
                { value: "Parvovirus", label: "Parvovirus" },
                { value: "Khác", label: "Khác..." },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="vaccinated_at"
            label="Ngày tiêm"
            initialValue={dayjs()}
            rules={[{ required: true }]}
          >
            <DatePicker
              className="w-100"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}