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
  const [loading, setLoading] = useState(false);
  
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  // Phân quyền: Chỉ Admin và Bác sĩ thú y được thao tác
  const canEdit = user?.role === "ADMIN" || user?.role === "VET_DOCTOR";

  // Lấy dữ liệu từ Backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resVac, resPigs] = await Promise.all([
        axios.get(`${API}/vaccinations`, { headers }),
        axios.get(`${API}/pigs`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);

      if (resVac.data?.success) setVaccinations(resVac.data.data);
      if (resPigs.data?.success) setPigs(resPigs.data.data);
    } catch (error) {
      message.error("Không thể tải dữ liệu tiêm phòng");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/vaccinations/${id}`, { headers });
      message.success("Đã xóa bản ghi tiêm phòng");
      fetchData();
    } catch (error) {
      message.error("Không thể xóa bản ghi này");
    }
  };

  const columns = [
    {
      title: "Ngày tiêm",
      dataIndex: "vaccinated_at",
      key: "vaccinated_at",
      render: (iso) => (iso ? dayjs(iso).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Mã lợn",
      dataIndex: "ear_tag",
      key: "ear_tag",
      render: (text) => <strong>{text}</strong>,
    },
    { title: "Vaccine", dataIndex: "vaccine_name", key: "vaccine_name" },
    { title: "Người thực hiện", dataIndex: "performed_by_name", key: "performed_by_name" },
    { title: "Ghi chú", dataIndex: "note", key: "note" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, r) => canEdit && (
        <Popconfirm
          title="Xóa bản ghi tiêm phòng này?"
          onConfirm={() => handleDelete(r.id)}
        >
          <Button danger type="text" icon={<DeleteOutlined />} title="Xóa" />
        </Popconfirm>
      ),
    },
  ];

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const payload = {
          ...values,
          vaccinated_at: values.vaccinated_at.format("YYYY-MM-DD"),
          performed_by: user?.staff_id || user?.id,
        };
        
        await axios.post(`${API}/vaccinations`, payload, { headers });
        message.success("Đã lưu lịch tiêm");
        setOpen(false);
        form.resetFields();
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
              setOpen(true);
            }}>
              Ghi nhận tiêm
            </Button>
          )
        }
      />

      <Card className="table-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={vaccinations}
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
        }}
        okText="Lưu"
        cancelText="Hủy"
        footer={canEdit ? undefined : null}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Form.Item
            name="pig_id"
            label="Mã Lợn"
            rules={[{ required: true }]}
          >
            <Select showSearch optionFilterProp="children">
              {pigs.filter(p => p.lifecycleStatus === 'ACTIVE' || p.lifecycle_status === 'ACTIVE').map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.earTag || p.pigCode || p.pig_code || p.id} - {p.barnName || p.barn_name || 'Không rõ chuồng'}
                </Option>
              ))}
            </Select>
          </Form.Item>

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