import React, { useMemo, useState, useEffect, useCallback } from "react";
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
import utc from "dayjs/plugin/utc";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import axiosClient from "@/utils/axiosClient";
import { TeamOutlined, ExportOutlined, DollarOutlined, DashboardOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/layout/PageHeader";

dayjs.extend(weekOfYear);
dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

export default function PigFattening() {
  const { user } = useAuthStore();

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

  const [openSingle, setOpenSingle] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState([]);
  const [openDetail, setOpenDetail] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  // ===== QUYỀN HẠN =====
  const canEdit = user?.role === "ADMIN" || user?.role === "FARM_WORKER";

  // ===== FETCH DATA =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resPigs, resSales] = await Promise.all([
        axiosClient.get(`/pigs`),
        axiosClient.get(`/sale-batches`).catch(() => ({ data: { data: [] } })),
      ]);
      setPigs(resPigs.data?.data || []);
      setSaleBatches(resSales.data?.data || []);
    } catch (err) {
      message.error("Không thể tải dữ liệu xuất bán lợn");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== DATA =====
  const fatteningActive = useMemo(() => {
    return pigs.filter(
      (p) => p.lifecycle_status === "ACTIVE" && p.category === "FATTENING"
    );
  }, [pigs]);

  // ===== STATS =====
  const stats = useMemo(() => {
    const revenue = saleBatches.reduce(
      (s, b) =>
        s +
        (b.lines?.reduce((x, l) => {
          const pig = pigs.find((p) => p.id === l.pig_id);
          const purchasePrice = pig ? Number(pig.purchase_price) || 0 : 0;
          return x + (Number(l.total_amount) || 0) - purchasePrice;
        }, 0) || 0),
      0
    );

    const totalKg = saleBatches.reduce(
      (s, b) => s + (b.lines?.reduce((x, l) => x + (Number(l.weight) || 0), 0) || 0),
      0
    );

    const soldCount = saleBatches.reduce((s, b) => s + (b.lines?.length || 0), 0);

    return { revenue, totalKg, soldCount };
  }, [saleBatches, pigs]);

  // ===== FILTER =====
  const sellRows = useMemo(() => {
    return saleBatches.map((b) => ({
      key: b.id,
      sold_at: b.sold_at,
      count: b.lines?.length || 0,
      totalKg: b.lines?.reduce((s, l) => s + (Number(l.weight) || 0), 0) || 0,
      total:
        b.lines?.reduce((s, l) => {
          const pig = pigs.find((p) => p.id === l.pig_id);
          const purchasePrice = pig ? Number(pig.purchase_price) || 0 : 0;
          return s + (Number(l.total_amount) || 0) - purchasePrice;
        }, 0) || 0,
      raw: b,
    }));
  }, [saleBatches, pigs]);

  // ===== GROUP =====
  const grouped = useMemo(() => {
    const map = {};

    sellRows.forEach((d) => {
      const date = dayjs.utc(d.sold_at);
      let key = "";

      if (filterType === "day") key = date.format("DD/MM/YYYY");
      if (filterType === "week") key = `Tuần ${date.week()} - ${date.year()}`;
      if (filterType === "month") key = `Tháng ${date.format("MM/YYYY")}`;

      if (!map[key]) {
        map[key] = { key, count: 0, totalKg: 0, total: 0, lines: [] };
      }

      map[key].count += d.count;
      map[key].totalKg += d.totalKg;
      map[key].total += d.total;
      if (d.raw.lines) {
        map[key].lines.push(
          ...d.raw.lines.map((l) => ({
            ...l,
            sold_at: d.raw.sold_at,
            staff_name: d.raw.staff_name,
          }))
        );
      }
    });

    return Object.values(map);
  }, [sellRows, filterType]);

  // ===== SELL SINGLE =====
  const handleSell = async (values) => {
    try {
      const payload = {
        sold_at: values.sold_at.format("YYYY-MM-DD"),
        lines: [
          {
            pig_id: values.pig_id,
            weight: values.weight,
            price: values.price,
            total_amount: values.price * values.weight,
            note: values.note,
          },
        ],
      };

      await axiosClient.post(`/sale-batches`, payload);
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
    if (!values.items || values.items.length === 0) {
      return message.warning("Vui lòng chọn ít nhất 1 con lợn");
    }

    const hasEmptyData = values.items.some(
      (i) => !i.weight || i.price === undefined || i.price === null
    );
    if (hasEmptyData) {
      return message.warning("Vui lòng nhập đầy đủ số Kg và Giá cho các lợn đã chọn");
    }

    try {
      const lines = values.items.map((i) => ({
        pig_id: i.pig_id,
        weight: i.weight,
        price: i.price,
        total_amount: i.weight * i.price,
      }));

      const payload = {
        sold_at: values.sold_at.format("YYYY-MM-DD"),
        lines,
      };

      await axiosClient.post(`/sale-batches`, payload);
      message.success("Xuất bán hàng loạt thành công");
      setOpenBulk(false);
      setBulkSelectedKeys([]);
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
                <span className="stat-card__title">Lợn thịt đang có</span>
                <div className="stat-card__icon">
                  <TeamOutlined />
                </div>
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
                <div className="stat-card__icon">
                  <ExportOutlined />
                </div>
              </div>
              <div className="stat-card__value">
                {stats.soldCount}
                <span className="stat-card__label"> con</span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--staff">
              <div className="stat-card__header">
                <span className="stat-card__title">Doanh thu</span>
                <div className="stat-card__icon">
                  <DollarOutlined />
                </div>
              </div>
              <div className="stat-card__value">
                {Math.round(Number(stats.revenue))
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                <span className="stat-card__label"> đ</span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--barn">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng kg</span>
                <div className="stat-card__icon">
                  <DashboardOutlined />
                </div>
              </div>
              <div className="stat-card__value">
                {stats.totalKg}
                <span className="stat-card__label"> kg</span>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ===== FILTER CARD ===== */}
        <Row gutter={[20, 20]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card>
              <div>
                <Space wrap>
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
                      <Button
                        type="primary"
                        onClick={() => {
                          form.resetFields();
                          setOpenSingle(true);
                        }}
                      >
                        Bán lợn
                      </Button>

                      <Button
                        onClick={() => {
                          bulkForm.resetFields();
                          setOpenBulk(true);
                          setBulkSelectedKeys([]);
                        }}
                      >
                        Bán hàng loạt
                      </Button>
                    </>
                  )}
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ===== TABLE ===== */}
        <Row gutter={[20, 20]} style={{ marginTop: 24 }}>
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
                    { title: filterLabel[filterType], dataIndex: "key" },
                    { title: "Số con", dataIndex: "count" },
                    { title: "Tổng kg", dataIndex: "totalKg" },
                    {
                      title: "Thành tiền",
                      dataIndex: "total",
                      render: (v) =>
                        Math.round(Number(v))
                          .toString()
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                    },
                    {
                      title: "Thao tác",
                      render: (_, r) => (
                        <Button
                          onClick={() => {
                            setSelectedBatch(r);
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
          onCancel={() => {
            setOpenSingle(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          title="Bán lợn"
          footer={canEdit ? undefined : null}
        >
          <Form form={form} onFinish={handleSell} layout="vertical" disabled={!canEdit}>
            {/* Chọn lợn TRƯỚC để xác định entry_date làm giới hạn dưới cho ngày bán */}
            <Form.Item
              name="pig_id"
              label="Chọn lợn"
              rules={[{ required: true, message: "Vui lòng chọn lợn" }]}
            >
              <Select
                showSearch
                placeholder="Chọn lợn thịt cần xuất bán..."
                options={fatteningActive.map((p) => ({
                  value: p.id,
                  label: `PIG${String(p.id).padStart(3, "0")} - Chuồng: ${p.barn_name} (Nhập: ${dayjs(p.entry_date).format("DD/MM/YYYY")})`,
                }))}
                onChange={(val) => {
                  // Reset ngày bán và cân nặng khi đổi lợn
                  form.setFieldsValue({ sold_at: null, weight: null });
                  const pig = fatteningActive.find((p) => p.id === val);
                  if (pig && (pig.current_weight || pig.entry_weight)) {
                    form.setFieldsValue({ weight: pig.current_weight || pig.entry_weight });
                  }
                }}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            {/* Ngày xuất bán — bị giới hạn bởi entry_date của con lợn đã chọn */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.pig_id !== curr.pig_id}>
              {({ getFieldValue }) => {
                const selectedPigId = getFieldValue("pig_id");
                const selectedPig = fatteningActive.find((p) => p.id === selectedPigId);
                const minDate = selectedPig?.entry_date;
                const minDateLabel = minDate
                  ? `Từ ngày nhập trại: ${dayjs(minDate).format("DD/MM/YYYY")}`
                  : null;

                return (
                  <Form.Item
                    name="sold_at"
                    label={
                      <span>
                        Ngày xuất bán{" "}
                        {minDateLabel && (
                          <span style={{ fontWeight: 400, color: "#888", fontSize: 12 }}>
                            ({minDateLabel})
                          </span>
                        )}
                      </span>
                    }
                    rules={[{ required: true, message: "Chọn ngày bán" }]}
                  >
                    <DatePicker
                      className="w-100"
                      format="DD/MM/YYYY"
                      disabled={!selectedPigId}
                      placeholder={!selectedPigId ? "Vui lòng chọn lợn trước" : "Chọn ngày xuất bán"}
                      disabledDate={(current) =>
                        current &&
                        ((minDate && current < dayjs(minDate).startOf("day")) ||
                          current > dayjs().endOf("day"))
                      }
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item name="weight" label="Kg" rules={[{ required: true }]}>
              <InputNumber className="w-100" disabled style={{ color: "#000" }} />
            </Form.Item>

            <Form.Item name="price" label="Giá" rules={[{ required: true }]}>
              <InputNumber className="w-100" />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() => {
                const w = form.getFieldValue("weight") || 0;
                const p = form.getFieldValue("price") || 0;
                return (
                  <div className="mb-16 text-right text-primary">
                    <b>
                      Thành tiền:{" "}
                      {Math.round(Number(w * p))
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                      đ
                    </b>
                  </div>
                );
              }}
            </Form.Item>

            <Form.Item name="note" label="Ghi chú">
              <Input />
            </Form.Item>
          </Form>
        </Modal>

        {/* ===== MODAL BULK ===== */}
        <Modal
          open={openBulk}
          onCancel={() => {
            setOpenBulk(false);
            setBulkSelectedKeys([]);
            bulkForm.resetFields();
          }}
          onOk={() => bulkForm.submit()}
          width={900}
          title="Bán hàng loạt"
          footer={canEdit ? undefined : null}
        >
          <Form form={bulkForm} onFinish={handleBulkSell} layout="vertical" disabled={!canEdit}>
            {/* Ngày xuất bán — không được trước entry_date của con lợn cũ nhất được chọn */}
            <Form.Item noStyle shouldUpdate>
              {() => {
                const selectedPigObjects = fatteningActive.filter((p) =>
                  bulkSelectedKeys.includes(p.id)
                );
                // Tìm entry_date sớm nhất trong số các lợn đã chọn
                const earliestEntry =
                  selectedPigObjects.length > 0
                    ? selectedPigObjects.reduce((earliest, p) => {
                        return !earliest || dayjs(p.entry_date).isBefore(dayjs(earliest))
                          ? p.entry_date
                          : earliest;
                      }, null)
                    : null;

                return (
                  <Form.Item
                    name="sold_at"
                    label={
                      <span>
                        Ngày xuất bán{" "}
                        {earliestEntry && (
                          <span style={{ fontWeight: 400, color: "#888", fontSize: 12 }}>
                            (Sớm nhất: {dayjs(earliestEntry).format("DD/MM/YYYY")} — ngày nhập trại của lợn cũ nhất)
                          </span>
                        )}
                      </span>
                    }
                    rules={[{ required: true, message: "Chọn ngày bán" }]}
                    style={{ width: "60%" }}
                  >
                    <DatePicker
                      onChange={() => {
                        setBulkSelectedKeys([]);
                        bulkForm.setFieldsValue({ items: [] });
                      }}
                      disabledDate={(current) =>
                        current &&
                        ((earliestEntry && current < dayjs(earliestEntry).startOf("day")) ||
                          current > dayjs().endOf("day"))
                      }
                      format="DD/MM/YYYY"
                      className="w-100"
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item noStyle dependencies={["sold_at"]}>
              {({ getFieldValue }) => {
                const soldAtDate = getFieldValue("sold_at");
                const eligiblePigs = soldAtDate
                  ? fatteningActive.filter((p) =>
                      dayjs(p.entry_date).isSameOrBefore(soldAtDate, "day")
                    )
                  : fatteningActive;

                return (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>Chọn lợn xuất bán:</div>
                    <Table
                      rowKey="id"
                      rowSelection={{
                        selectedRowKeys: bulkSelectedKeys,
                        onChange: (keys) => {
                          setBulkSelectedKeys(keys);
                          const currentItems = bulkForm.getFieldValue("items") || [];
                          bulkForm.setFieldsValue({
                            items: keys.map((v) => {
                              const existing = currentItems.find((i) => i && i.pig_id === v);
                              const pigData = fatteningActive.find((p) => p.id === v);
                              return {
                                pig_id: v,
                                weight:
                                  existing && existing.weight !== undefined
                                    ? existing.weight
                                    : pigData?.current_weight || pigData?.entry_weight || null,
                                price:
                                  existing && existing.price !== undefined ? existing.price : null,
                              };
                            }),
                          });
                        },
                      }}
                      dataSource={eligiblePigs}
                      columns={[
                        { title: "STT", width: 60, render: (_, __, i) => i + 1 },
                        {
                          title: "Mã lợn",
                          dataIndex: "id",
                          render: (text) => (
                            <strong>PIG{String(text).padStart(3, "0")}</strong>
                          ),
                        },
                        { title: "Chuồng", dataIndex: "barn_name" },
                        {
                          title: "Trọng lượng",
                          key: "current_weight",
                          render: (_, r) =>
                            r.current_weight || r.entry_weight
                              ? `${r.current_weight || r.entry_weight} kg`
                              : "-",
                        },
                        {
                          title: "Ngày nhập",
                          dataIndex: "entry_date",
                          render: (d) => dayjs(d).format("DD/MM/YYYY"),
                        },
                      ]}
                      pagination={{ pageSize: 5 }}
                      size="small"
                      locale={{
                        emptyText: "Không có lợn thịt nào hợp lệ",
                      }}
                    />
                  </div>
                );
              }}
            </Form.Item>

            <Form.List name="items">
              {(fields) => (
                <>
                  <div className="bulk-items-container">
                    {fields.length > 0 && (
                      <Row
                        gutter={16}
                        style={{
                          paddingBottom: 8,
                          marginBottom: 8,
                          borderBottom: "1px solid #f0f0f0",
                          fontWeight: 500,
                        }}
                      >
                        <Col span={2}>STT</Col>
                        <Col span={5}>Mã lợn</Col>
                        <Col span={4}>Cân nặng (Kg)</Col>
                        <Col span={6}>Giá/kg (VNĐ)</Col>
                        <Col span={7}>Thành tiền</Col>
                      </Row>
                    )}
                    {fields.map((field, index) => (
                      <Row
                        gutter={16}
                        key={field.key}
                        align="middle"
                        style={{ marginBottom: 12 }}
                      >
                        <Col span={2}>{index + 1}</Col>
                        <Col span={5}>
                          <Form.Item name={[field.name, "pig_id"]} noStyle>
                            <Input
                              addonBefore="PIG"
                              disabled
                              style={{ color: "#000", fontWeight: 500 }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            name={[field.name, "weight"]}
                            noStyle
                            rules={[{ required: true, message: "Nhập Kg" }]}
                          >
                            <InputNumber
                              className="w-100"
                              min={1}
                              disabled
                              style={{ color: "#000" }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name={[field.name, "price"]}
                            noStyle
                            rules={[{ required: true, message: "Nhập Giá" }]}
                          >
                            <InputNumber
                              className="w-100"
                              min={0}
                              step={1000}
                              formatter={(value) =>
                                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                              }
                              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                              placeholder="VD: 55,000"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={7}>
                          <Form.Item shouldUpdate noStyle>
                            {() => {
                              const w =
                                bulkForm.getFieldValue(["items", field.name, "weight"]) || 0;
                              const p =
                                bulkForm.getFieldValue(["items", field.name, "price"]) || 0;
                              return (
                                <span style={{ color: "#1890ff", fontWeight: 500 }}>
                                  {Math.round(Number(w * p))
                                    .toString()
                                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                                  đ
                                </span>
                              );
                            }}
                          </Form.Item>
                        </Col>
                      </Row>
                    ))}
                  </div>

                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const currentItems = bulkForm.getFieldValue("items") || [];
                      const totalKg = currentItems.reduce(
                        (s, i) => s + Number(i?.weight || 0),
                        0
                      );
                      const totalMoney = currentItems.reduce(
                        (s, i) => s + Number(i?.weight || 0) * Number(i?.price || 0),
                        0
                      );

                      return (
                        <div className="mt-16 text-right">
                          <b>Tổng kg: {totalKg}</b>
                          <br />
                          <b>
                            Tổng tiền:{" "}
                            {Math.round(Number(totalMoney))
                              .toString()
                              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                            đ
                          </b>
                        </div>
                      );
                    }}
                  </Form.Item>
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
          title={`Chi tiết xuất bán (${selectedBatch?.key || ""})`}
          width={850}
        >
          {selectedBatch && (
            <Table
              dataSource={selectedBatch.lines}
              pagination={{ pageSize: 10 }}
              rowKey={(r, i) => r.id || i}
              columns={[
                { title: "STT", render: (_, __, i) => i + 1 },
                {
                  title: "Ngày bán",
                  dataIndex: "sold_at",
                  render: (d) => dayjs.utc(d).format("DD/MM/YYYY"),
                },
                {
                  title: "Mã lợn",
                  dataIndex: "pig_id",
                  render: (v) => `PIG${String(v).padStart(3, "0")}`,
                },
                { title: "Kg", dataIndex: "weight" },
                {
                  title: "Giá",
                  dataIndex: "price",
                  render: (v) =>
                    v
                      ? Math.round(Number(v))
                          .toString()
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "-",
                },
                {
                  title: "Doanh thu (Lãi)",
                  key: "profit",
                  render: (_, r) => {
                    const pig = pigs.find((p) => p.id === r.pig_id);
                    const purchasePrice = pig ? Number(pig.purchase_price) || 0 : 0;
                    const profit = (Number(r.total_amount) || 0) - purchasePrice;
                    return Math.round(Number(profit))
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                  },
                },
                { title: "Người thực hiện", dataIndex: "staff_name" },
              ]}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}