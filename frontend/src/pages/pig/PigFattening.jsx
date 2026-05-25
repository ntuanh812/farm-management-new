import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  Table,
  Select,
  Space,
  DatePicker,
  Input,
  Button,
  Modal,
  Form,
  InputNumber,
  Row,
  Col,
  message,
} from "antd";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import axios from "axios";
import { TeamOutlined, ExportOutlined, DollarOutlined, DashboardOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/layout/PageHeader";

dayjs.extend(weekOfYear);
const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function PigFattening() {
  const { token, user } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [pigs, setPigs] = useState([]);
  const [saleBatches, setSaleBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== LABEL =====
  const filterLabel = {
    day: "ngày",
    week: "tuần",
    month: "tháng",
  };

  // ===== STATE =====
  const [filterType, setFilterType] = useState("day");
  const [searchEar, setSearchEar] = useState("");

  const [openSingle, setOpenSingle] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  // ===== QUYỀN HẠN =====
  const canEdit = user?.role === "ADMIN" || user?.role === "FARM_WORKER";

  // ===== FETCH DATA =====
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPigs, resSales] = await Promise.all([
        axios.get(`${API}/pigs`, { headers }),
        axios.get(`${API}/sale-batches`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);
      setPigs(resPigs.data?.data || []);
      setSaleBatches(resSales.data?.data || []);
    } catch (err) {
      message.error("Không thể tải dữ liệu xuất bán lợn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===== DATA =====
  const fatteningActive = useMemo(() => {
    return pigs.filter(
      (p) =>
        p.lifecycleStatus === "ACTIVE" &&
        p.category === "FATTENING"
    );
  }, [pigs]);

  const sold = useMemo(() => {
    return pigs.filter(
      (p) =>
        p.lifecycleStatus === "SOLD" &&
        p.category === "FATTENING"
    );
  }, [pigs]);

  // ===== STATS =====
  const stats = useMemo(() => {
    const revenue = saleBatches.reduce(
      (s, b) => s + (b.lines?.reduce((x, l) => x + (Number(l.total_amount) || 0), 0) || 0),
      0
    );

    const totalKg = saleBatches.reduce(
      (s, b) => s + (b.lines?.reduce((x, l) => x + (Number(l.weight) || 0), 0) || 0),
      0
    );

    return { revenue, totalKg };
  }, [saleBatches]);

  // ===== FILTER =====
  const sellRows = useMemo(() => {
    return saleBatches
      .filter((b) => {
        if (!searchEar) return true;
        return b.lines?.some((l) => l.ear_tag?.includes(searchEar));
      })
      .map((b) => ({
        key: b.id,
        sold_at: b.sold_at,
        count: b.lines?.length || 0,
        totalKg: b.lines?.reduce((s, l) => s + (Number(l.weight) || 0), 0) || 0,
        total: b.lines?.reduce((s, l) => s + (Number(l.total_amount) || 0), 0) || 0,
        raw: b,
      }));
  }, [saleBatches, searchEar]);

  // ===== GROUP =====
  const grouped = useMemo(() => {
    const map = {};

    sellRows.forEach((d) => {
      const date = dayjs(d.sold_at);
      let key = "";

      if (filterType === "day") key = date.format("DD/MM/YYYY");
      if (filterType === "week") key = `Tuần ${date.week()} - ${date.year()}`;
      if (filterType === "month") key = `Tháng ${date.format("MM/YYYY")}`;

      if (!map[key]) {
        map[key] = {
          key,
          count: 0,
          totalKg: 0,
          total: 0,
          raw: d.raw,
        };
      }

      map[key].count += d.count;
      map[key].totalKg += d.totalKg;
      map[key].total += d.total;
    });

    return Object.values(map);
  }, [sellRows, filterType]);

  // ===== SELL SINGLE =====
  const handleSell = async (values) => {
    try {
      const payload = {
        sold_at: values.date.format("YYYY-MM-DD"),
        staff_name: values.staff,
        lines: [
          {
            ear_tag: values.earTag,
            weight: values.weight,
            price: values.price,
            total_amount: values.price * values.weight,
            reason: values.reason,
            note: values.note,
          },
        ],
      };

      await axios.post(`${API}/sale-batches`, payload, { headers });
      message.success("Ghi nhận xuất bán thành công");
      setOpenSingle(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi khi xuất bán");
    }
  };

  // ===== SELL BULK =====
  const handleBulkSell = async (values) => {
    try {
      const lines = values.items.map((i) => ({
        ear_tag: i.earTag,
        weight: i.weight,
        price: values.price,
        total_amount: i.weight * values.price,
      }));

      const payload = {
        sold_at: values.date.format("YYYY-MM-DD"),
        staff_name: values.staff,
        lines,
      };

      await axios.post(`${API}/sale-batches`, payload, { headers });
      message.success("Xuất bán hàng loạt thành công");
      setOpenBulk(false);
      bulkForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi khi xuất bán");
    }
  };

  return (
    <div className="dashboard">
      <PageHeader title="Lợn thịt" subtitle="Xuất bán" />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--pigs">
              <div className="stat-card__header">
                <span className="stat-card__title">Đang nuôi</span>
                <div className="stat-card__icon"><TeamOutlined /></div>
              </div>
              <div className="stat-card__value">
                {fatteningActive.length}
                <span className="stat-card__label"> con</span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--daily-tasks">
              <div className="stat-card__header">
                <span className="stat-card__title">Đã xuất</span>
                <div className="stat-card__icon"><ExportOutlined /></div>
              </div>
              <div className="stat-card__value">
                {sold.length}
                <span className="stat-card__label"> con</span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--staff">
              <div className="stat-card__header">
                <span className="stat-card__title">Doanh thu</span>
                <div className="stat-card__icon"><DollarOutlined /></div>
              </div>
              <div className="stat-card__value">
                {stats.revenue.toLocaleString()}
                <span className="stat-card__label"> đ</span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--barn">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng kg</span>
                <div className="stat-card__icon"><DashboardOutlined /></div>
              </div>
              <div className="stat-card__value">
                {stats.totalKg}
                <span className="stat-card__label"> kg</span>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ===== FILTER CARD ===== */}
        <Row gutter={[20, 20]} className="mt-24">
          <Col span={24}>
            <Card>
              <div>
                <Space wrap>
                  <Input
                    placeholder="Tìm số tai"
                    value={searchEar}
                    onChange={(e) => setSearchEar(e.target.value)}
                    className="w-220"
                  />

                  <Select
                    value={filterType}
                    onChange={setFilterType}
                    className="w-140"
                    options={[
                      { value: "day", label: "Ngày" },
                      { value: "week", label: "Tuần" },
                      { value: "month", label: "Tháng" },
                    ]}
                  />

                  {canEdit && (
                    <>
                      <Button type="primary" onClick={() => setOpenSingle(true)}>
                        Bán lợn
                      </Button>

                      <Button onClick={() => setOpenBulk(true)}>Bán hàng loạt</Button>
                    </>
                  )}
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ===== TABLE ===== */}
        <Row gutter={[20, 20]} className="mt-24">
          <Col span={24}>
            <Card className="activity-card">
              <div className="activity-card__header">
                <h3>Tổng hợp theo {filterLabel[filterType]}</h3>
              </div>

              <div className="activity-card__list">
                <Table
                  dataSource={grouped}
                  loading={loading}
                  rowKey="key"
                  columns={[
                    { title: "STT", render: (_, __, i) => i + 1 },
                    {
                      title: filterLabel[filterType],
                      dataIndex: "key",
                    },
                    { title: "Số con", dataIndex: "count" },
                    { title: "Tổng kg", dataIndex: "totalKg" },
                    {
                      title: "Thành tiền",
                      dataIndex: "total",
                      render: (v) => v.toLocaleString(),
                    },
                    {
                      title: "Thao tác",
                      render: (_, r) => (
                        <Button
                          onClick={() => {
                            setSelectedBatch(r.raw);
                            setOpenDetail(true);
                          }}
                        >
                          Xem
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* ===== MODAL SINGLE ===== */}
        <Modal
          open={openSingle}
          onCancel={() => setOpenSingle(false)}
          onOk={() => form.submit()}
          title="Bán lợn"
          footer={canEdit ? undefined : null}
        >
          <Form form={form} onFinish={handleSell} layout="vertical" disabled={!canEdit}>
            <Form.Item name="earTag" label="Số tai" rules={[{ required: true }]}>
              <Select
                options={fatteningActive.map((p) => ({
                  value: p.earTag,
                  label: p.earTag,
                }))}
              />
            </Form.Item>

            <Form.Item name="date" label="Ngày" rules={[{ required: true }]}>
              <DatePicker className="w-100" />
            </Form.Item>

            <Form.Item name="weight" label="Kg" rules={[{ required: true }]}>
              <InputNumber className="w-100" />
            </Form.Item>

            <Form.Item name="price" label="Giá" rules={[{ required: true }]}>
              <InputNumber className="w-100" />
            </Form.Item>

            <Form.Item name="staff" label="Người thực hiện">
              <Input />
            </Form.Item>

            <Form.Item name="reason" label="Nguyên nhân">
              <Input />
            </Form.Item>

            <Form.Item name="note" label="Ghi chú">
              <Input />
            </Form.Item>
          </Form>
        </Modal>

        {/* ===== MODAL BULK ===== */}
        <Modal
          open={openBulk}
          onCancel={() => setOpenBulk(false)}
          onOk={() => bulkForm.submit()}
          width={900}
          title="Bán hàng loạt"
          footer={canEdit ? undefined : null}
        >
          <Form form={bulkForm} onFinish={handleBulkSell} layout="vertical" disabled={!canEdit}>
            <Space wrap>
              <Form.Item name="date" label="Ngày" rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item name="price" label="Giá/kg" rules={[{ required: true }]}>
                <InputNumber />
              </Form.Item>

              <Form.Item name="staff" label="Người thực hiện">
                <Input />
              </Form.Item>
            </Space>

            <Form.Item label="Chọn lợn">
              <Select
                mode="multiple"
                options={fatteningActive.map((p) => ({
                  value: p.earTag,
                  label: p.earTag,
                }))}
                onChange={(values) => {
                  bulkForm.setFieldsValue({
                    items: values.map((v) => ({
                      earTag: v,
                      weight: null,
                    })),
                  });
                }}
              />
            </Form.Item>

            <Form.List name="items">
              {(fields) => (
                <>
                  <Table
                    dataSource={fields}
                    pagination={false}
                    rowKey="key"
                    columns={[
                      { title: "STT", render: (_, __, i) => i + 1 },
                      {
                        title: "Số tai",
                        render: (_, field) => (
                          <Form.Item name={[field.name, "earTag"]} noStyle>
                            <Input disabled />
                          </Form.Item>
                        ),
                      },
                      {
                        title: "Kg",
                        render: (_, field) => (
                          <Form.Item
                            name={[field.name, "weight"]}
                            rules={[{ required: true }]}
                          >
                            <InputNumber className="w-100" />
                          </Form.Item>
                        ),
                      },
                      {
                        title: "Thành tiền",
                        render: (_, field) => {
                          const w =
                            bulkForm.getFieldValue(["items", field.name, "weight"]) ||
                            0;

                          const p = bulkForm.getFieldValue("price") || 0;

                          return (w * p).toLocaleString();
                        },
                      },
                    ]}
                  />

                  <div className="mt-16 text-right">
                    <b>
                      Tổng kg:{" "}
                      {(bulkForm.getFieldValue("items") || []).reduce(
                        (s, i) => s + (i?.weight || 0),
                        0
                      )}
                    </b>
                    <br />
                    <b>
                      Tổng tiền:{" "}
                      {(bulkForm.getFieldValue("items") || []).reduce(
                        (s, i) =>
                          s +
                          (i?.weight || 0) * (bulkForm.getFieldValue("price") || 0),
                        0
                      ).toLocaleString()}
                    </b>
                  </div>
                </>
              )}
            </Form.List>
          </Form>
        </Modal>

        {/* ===== MODAL DETAIL ===== */}
        <Modal
          open={openDetail}
          onCancel={() => setOpenDetail(false)}
          footer={null}
          title="Phiếu xuất bán"
        >
          {selectedBatch && (
            <>
              <p>Ngày: {dayjs(selectedBatch.sold_at).format("DD/MM/YYYY")}</p>
              <p>Người bán: {selectedBatch.staff_name}</p>

              <Table
                dataSource={selectedBatch.lines}
                pagination={false}
                rowKey={(r, i) => i}
                columns={[
                  { title: "STT", render: (_, __, i) => i + 1 },
                  { title: "Số tai", dataIndex: "ear_tag" },
                  { title: "Kg", dataIndex: "weight" },
                  { title: "Giá", dataIndex: "price" },
                  { title: "Thành tiền", dataIndex: "total_amount" },
                  { title: "Nguyên nhân", dataIndex: "reason" },
                  { title: "Ghi chú", dataIndex: "note" },
                ]}
              />
            </>
          )}
        </Modal>
      </div>
    </div>
  );
}