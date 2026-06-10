import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card, Table, Button, Modal, Form, Select, Row, Col,
  Input, Space, Tag, message
} from "antd";
import { SwapRightOutlined, SwapOutlined, TeamOutlined } from "@ant-design/icons";
import axiosClient from "@/utils/axiosClient";
import dayjs from "dayjs";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { CATEGORY_MAP } from '@/utils/constants';

const { Option } = Select;

export default function PigstyHistory() {
  const { user } = useAuthStore();

  const [pigs, setPigs] = useState([]);
  const [barns, setBarns] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form] = Form.useForm();

  const canEdit = user?.role === "ADMIN" || user?.role === "FARM_WORKER";

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pigRes, barnRes, movementRes] = await Promise.all([
        axiosClient.get(`/pigs`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/barns`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/movements`).catch(() => ({ data: { data: [] } })),
      ]);

      setPigs(pigRes.data?.data || []);
      setBarns(barnRes.data?.data || []);
      setMovements(movementRes.data?.data || []);
    } catch (err) {
      message.error("Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activePigs = useMemo(() => {
    return pigs.filter((p) => p.lifecycle_status === "ACTIVE");
  }, [pigs]);

  const filteredPigs = useMemo(() => {
    if (statusFilter === "all") return activePigs;
    return activePigs.filter((p) => (p.category || "") === statusFilter);
  }, [activePigs, statusFilter]);

  const historyRows = useMemo(() => {
    return movements.map((m) => {
      const pig = pigs.find((p) => p.id === m.pig_id);
      return {
        key: m.id,
        date: m.move_date ? dayjs(m.move_date).format("DD/MM/YYYY") : "",
        pig_id: pig?.id || m.pig_id,
        status: pig?.category || m.category,
        fromPen: m.from_barn_name || barns.find(b => b.id === m.from_barn_id)?.name || m.from_barn_id,
        toPen: m.to_barn_name || barns.find(b => b.id === m.to_barn_id)?.name || m.to_barn_id,
        person: m.staff_name,
        note: m.note,
      };
    });
  }, [movements, pigs, barns]);

  const columns = [
    {
      title: "STT",
      width: 60,
      render: (_, record) => historyRows.indexOf(record) + 1,
    },
    {
      title: "Ngày chuyển",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "Mã lợn",
      key: "pig_id", 
      render: (_, r) => <strong>PIG{String(r.pig_id).padStart(3, "0")}</strong>,
    },
    {
      title: "Loại lợn",
      dataIndex: "status",
      key: "status",
      render: (s) => <Tag color="blue">{CATEGORY_MAP[s] || s}</Tag>,
    },
    {
      title: "Từ chuồng",
      dataIndex: "fromPen",
      key: "fromPen",
    },
    {
      title: "Sang chuồng",
      dataIndex: "toPen",
      key: "toPen",
      render: (p) => <Tag color="green">{p}</Tag>,
    },
    {
      title: "Người thực hiện",
      dataIndex: "person",
      key: "person",
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
    },
  ];

  const pigColumns = [
    {
      title: "STT",
      width: 60,
      render: (_, record) => filteredPigs.indexOf(record) + 1,
    },
    {
      title: "Mã lợn",
      key: "id", 
      render: (_, r) => <strong>PIG{String(r.id).padStart(3, "0")}</strong>,
    },
    {
      title: "Loại lợn",
      dataIndex: "category",
      key: "category",
      render: (s) => <Tag color="blue">{CATEGORY_MAP[s] || s || "—"}</Tag>,
    },
    {
      title: "Chuồng hiện tại",
      dataIndex: "barn_name",
      key: "barn_name",
      render: (text, record) => text || barns.find(b => b.id === record.barn_id)?.name || record.barn_id,
    },
  ];

  const handleAdd = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Chọn ít nhất 1 con lợn");
      return;
    }
    try {
      const values = await form.validateFields();
      const selected = activePigs.filter((p) => selectedRowKeys.includes(p.id));
      const invalid = selected.some((p) => p.barn_id === values.to_barn_id);
      if (invalid) {
        message.error("Có cá thể lợn đang chọn đã nằm ở chuồng đích này");
        return;
      }
      
      const payload = {
        pig_ids: selectedRowKeys,
        to_barn_id: values.to_barn_id,
        move_date: dayjs().format("YYYY-MM-DD"),
        note: values.note,
      };

      await axiosClient.post(`/movements`, payload);
      message.success("Đã chuyển chuồng thành công");
      setSelectedRowKeys([]);
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || "Không thể chuyển chuồng");
    }
  };

  return (
    <div className="dashboard">
      <PageHeader
        title="Chuyển chuồng"
        subtitle="Theo dõi lịch sử di chuyển lợn"
        actions={
          canEdit && (
            <Button
              type="primary"
              icon={<SwapRightOutlined />}
              onClick={() => {
                setIsModalOpen(true);
                form.resetFields();
                setSelectedRowKeys([]);
              }}
            >
              Thực hiện chuyển chuồng
            </Button>
          )
        }
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
        <Col xs={24} sm={12} lg={12}>
          <Card className="stat-card stat-card--barn">
            <div className="stat-card__header">
              <span className="stat-card__title">Tổng lượt chuyển chuồng</span>
              <div className="stat-card__icon"><SwapOutlined /></div>
            </div>
            <div className="stat-card__value">
              {movements.length}
              <span className="stat-card__label"> lượt</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card className="stat-card stat-card--pigs">
            <div className="stat-card__header">
              <span className="stat-card__title">Lợn đang có mặt tại trại</span>
              <div className="stat-card__icon"><TeamOutlined /></div>
            </div>
            <div className="stat-card__value">
              {activePigs.length}
              <span className="stat-card__label"> con</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="table-card" style={{ marginTop: 24 }}>
          <Table
            loading={loading}
            columns={columns}
            dataSource={historyRows}
            pagination={{ pageSize: 10 }}
          />
        </Card>

      <Modal
        title="Chuyển chuồng"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setSelectedRowKeys([]); }}
        onOk={handleAdd}
        width={800}
        okText="Chuyển chuồng"
        cancelText="Hủy"
        footer={canEdit ? undefined : null}
      >
        <Space className="mb-12">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-220"
          >
            <Option value="all">Tất cả lợn</Option>
            <Option value="SOW">Lợn nái</Option>
            <Option value="BOAR">Lợn đực</Option>
            <Option value="PIGLET">Lợn con</Option>
            <Option value="FATTENING">Lợn thịt</Option>
          </Select>
        </Space>

        <Table
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: () => ({ disabled: !canEdit })
          }}
          columns={pigColumns}
          dataSource={filteredPigs}
          pagination={{ pageSize: 5 }}
          size="small"
        />

        <Form form={form} layout="vertical" className="mt-24" disabled={!canEdit}>
          <Form.Item
            name="to_barn_id"
            label="Chuyển sang chuồng"
            rules={[{ required: true, message: "Chọn chuồng" }]}
          >
            <Select showSearch placeholder="Chọn chuồng đích" options={barns.map((b) => {
              const isMaintenance = b.status === 'MAINTENANCE';
              const isFull = (b.current_quantity || 0) >= (b.capacity || 1);
              return {
                label: `${b.name} ${isMaintenance ? '(Bảo trì)' : isFull ? '(Đã đầy)' : ''}`,
                value: b.id,
                disabled: isMaintenance || isFull
              };
            })} />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Nhập ghi chú nếu có..." />
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </div>
  );
}