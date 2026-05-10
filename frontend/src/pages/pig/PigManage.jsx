import React, { useEffect, useMemo, useState } from "react";

import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  message,
} from "antd";

import axios from "axios";

import dayjs from "dayjs";

import { PageHeader } from "../../components/layout/PageHeader";

const { Option } = Select;

// =========================================================
// LABELS
// =========================================================
const categoryLabels = {
  SOW: "Lợn nái",
  BOAR: "Lợn đực",
  PIGLET: "Lợn con",
  FATTENING: "Lợn thịt",
};

const typeMap = {
  SOW: {
    label: categoryLabels.SOW,
    color: "green",
  },

  BOAR: {
    label: categoryLabels.BOAR,
    color: "red",
  },

  PIGLET: {
    label: categoryLabels.PIGLET,
    color: "gold",
  },

  FATTENING: {
    label: categoryLabels.FATTENING,
    color: "blue",
  },
};

const sowReproductiveLabels = [
  "Hậu bị",
  "Chờ phối",
  "Đã phối",
  "Đẻ con",
  "Cai sữa",
  "Sảy thai",
];

const statusColor = {
  "Chờ phối": "default",
  "Đã phối": "purple",
  "Đẻ con": "green",
  "Cai sữa": "cyan",
  "Sảy thai": "red",
  "Bán loại": "volcano",
  "Chết": "black",
  "Hậu bị": "blue",
  "Đang tăng trọng": "processing",
  "Sẵn sàng xuất": "success",
};

function displayStatus(pig) {

  if (
    pig.category === "FATTENING"
  ) {
    return "Đang tăng trọng";
  }

  if (pig.reproductiveLabel) {
    return pig.reproductiveLabel;
  }

  return "—";
}

export default function PigManagement() {

  // =========================================================
  // STATES
  // =========================================================
  const [pigs, setPigs] = useState([]);

  const [barns, setBarns] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [keyword, setKeyword] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [barnFilter, setBarnFilter] =
    useState("all");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [form] = Form.useForm();

  const token =
    localStorage.getItem("token");

  // =========================================================
  // FETCH BARNS
  // =========================================================
  const fetchBarns = async () => {

    try {

      const res = await axios.get(
        "http://localhost:3000/api/barns",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setBarns(
        res.data?.data || []
      );

    } catch (err) {

      console.error(err);

      message.error(
        "Không tải được chuồng"
      );
    }
  };

  // =========================================================
  // FETCH PIGS
  // =========================================================
  const fetchPigs = async () => {

    try {

      setLoading(true);

      const res = await axios.get(
        "http://localhost:3000/api/pigs",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setPigs(
        res.data?.data || []
      );

    } catch (err) {

      console.error(err);

      message.error(
        "Không tải được đàn lợn"
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {

    fetchBarns();

    fetchPigs();

  }, []);

  // =========================================================
  // ACTIVE PIGS
  // =========================================================
  const activePigs = useMemo(() => {

    return pigs.filter(
      (p) =>
        p.lifecycleStatus ===
        "ACTIVE"
    );

  }, [pigs]);

  // =========================================================
  // FILTERED
  // =========================================================
  const filteredData = useMemo(() => {

    return activePigs
      .filter((item) => {

        return (
          item.earTag
            ?.toLowerCase()
            .includes(
              keyword.toLowerCase()
            ) &&

          (
            typeFilter === "all" ||
            item.category ===
              typeFilter
          ) &&

          (
            barnFilter === "all" ||
            item.barnId ===
              barnFilter
          )
        );
      })

      .map((p) => ({

        key: p.id,

        ...p,

        displayStatus:
          displayStatus(p),

        arrivedDisplay:
          p.arrivedAt
            ? dayjs(
                p.arrivedAt
              ).format(
                "DD/MM/YYYY"
              )
            : "-",

        barnDisplay:
          barns.find(
            (b) =>
              b.id ===
              p.barnId
          )?.name || "-",
      }));

  }, [
    activePigs,
    keyword,
    typeFilter,
    barnFilter,
    barns,
  ]);

  // =========================================================
  // TABLE
  // =========================================================
  const columns = [
    {
      title: "Số tai",
      dataIndex: "earTag",
    },

    {
      title: "Loại",
      dataIndex: "category",

      render: (t) => (
        <Tag
          color={
            typeMap[t]?.color
          }
        >
          {
            typeMap[t]?.label
          }
        </Tag>
      ),
    },

    {
      title: "Ngày nhập",
      dataIndex:
        "arrivedDisplay",
    },

    {
      title: "Tuổi (ngày)",
      dataIndex: "ageDays",
    },

    {
      title: "Cân (kg)",
      dataIndex: "weightKg",

      render: (w) =>
        w ?? "—",
    },

    {
      title: "Chuồng",
      dataIndex:
        "barnDisplay",

      render: (t) => (
        <Tag>{t}</Tag>
      ),
    },
  ];

  // =========================================================
  // ADD PIG
  // =========================================================
  const handleAdd = async () => {

    try {

      const values =
        await form.validateFields();

      await axios.post(
        "http://localhost:3000/api/pigs",
        {
          pig_code:
            values.earTag,

          barn_id:
            values.barnId,

          category:
            values.category,

          reproductive_label:
            values.reproductiveLabel,

          entry_date:
            values.arrivedAt
              ?.format(
                "YYYY-MM-DD"
              ),

          age_days:
            values.ageDays,

          current_weight:
            values.weightKg,
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      message.success(
        "Nhập lợn thành công"
      );

      setIsModalOpen(false);

      form.resetFields();

      fetchPigs();

    } catch (err) {

      console.error(err);

      message.error(
        "Không thể nhập lợn"
      );
    }
  };

  return (
    <div className="dashboard">

      <PageHeader
        title="Quản lý đàn"
        subtitle="Danh sách lợn đang nuôi"
      />

      <div className="dashboard__maincontent">

        {/* ================================================= */}
        {/* STATS */}
        {/* ================================================= */}

        <div className="stats-grid">

          {/* TOTAL */}
          <Card className="stat-card stat-card--pigs">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Tổng đang nuôi
              </span>

              <div className="stat-card__icon">
                🐷
              </div>
            </div>

            <div className="stat-card__value">
              {activePigs.length}

              <span className="stat-card__label">
                {" "}
                con
              </span>
            </div>
          </Card>

          {/* SOW */}
          <Card className="stat-card stat-card--barn">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Lợn nái
              </span>

              <div className="stat-card__icon">
                👑
              </div>
            </div>

            <div className="stat-card__value">
              {
                activePigs.filter(
                  (p) =>
                    p.category ===
                    "SOW"
                ).length
              }
            </div>
          </Card>

          {/* FATTENING */}
          <Card className="stat-card stat-card--staff">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Lợn thịt
              </span>

              <div className="stat-card__icon">
                🥩
              </div>
            </div>

            <div className="stat-card__value">
              {
                activePigs.filter(
                  (p) =>
                    p.category ===
                    "FATTENING"
                ).length
              }
            </div>
          </Card>

          {/* PIGLET */}
          <Card className="stat-card stat-card--daily-tasks">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Lợn con
              </span>

              <div className="stat-card__icon">
                🐽
              </div>
            </div>

            <div className="stat-card__value">
              {
                activePigs.filter(
                  (p) =>
                    p.category ===
                    "PIGLET"
                ).length
              }
            </div>
          </Card>
        </div>

        {/* ================================================= */}
        {/* FILTER */}
        {/* ================================================= */}

        <Card className="filter-card">

          <Space wrap>

            <Input
              placeholder="Tìm số tai"
              value={keyword}
              onChange={(e) =>
                setKeyword(
                  e.target.value
                )
              }
            />

            {/* TYPE */}
            <Select
              value={typeFilter}
              onChange={
                setTypeFilter
              }
              style={{
                minWidth: 140,
              }}
            >

              <Option value="all">
                Tất cả
              </Option>

              {Object.keys(
                typeMap
              ).map((k) => (

                <Option
                  key={k}
                  value={k}
                >
                  {
                    typeMap[k]
                      .label
                  }
                </Option>
              ))}
            </Select>

            {/* BARNS */}
            <Select
              value={barnFilter}
              onChange={
                setBarnFilter
              }
              style={{
                minWidth: 180,
              }}
            >

              <Option value="all">
                Tất cả chuồng
              </Option>

              {barns.map((b) => (

                <Option
                  key={b.id}
                  value={b.id}
                >
                  {b.name}
                </Option>
              ))}
            </Select>

            <Button
              type="primary"
              onClick={() =>
                setIsModalOpen(
                  true
                )
              }
            >
              Nhập lợn
            </Button>

          </Space>
        </Card>

        {/* ================================================= */}
        {/* TABLE */}
        {/* ================================================= */}

        <Card className="table-card">

          <Table
            columns={columns}
            dataSource={
              filteredData
            }
            loading={loading}
          />
        </Card>
      </div>

      {/* ================================================= */}
      {/* MODAL */}
      {/* ================================================= */}

      <Modal
        open={isModalOpen}
        onOk={handleAdd}
        onCancel={() =>
          setIsModalOpen(
            false
          )
        }
        title="Nhập lợn mới"
      >

        <Form
          form={form}
          layout="vertical"
        >

          {/* EARTAG */}
          <Form.Item
            name="earTag"
            label="Số tai"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>

          {/* CATEGORY */}
          <Form.Item
            name="category"
            label="Loại"
            initialValue="FATTENING"
          >

            <Select>

              {Object.keys(
                typeMap
              ).map((k) => (

                <Option
                  key={k}
                  value={k}
                >
                  {
                    typeMap[k]
                      .label
                  }
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* REPRODUCTIVE */}
          <Form.Item
            noStyle
            shouldUpdate={(
              p,
              c
            ) =>
              p.category !==
              c.category
            }
          >
            {({
              getFieldValue,
            }) =>

              getFieldValue(
                "category"
              ) === "SOW" ? (

                <Form.Item
                  name="reproductiveLabel"
                  label="Giai đoạn sinh sản"
                  initialValue="Hậu bị"
                >

                  <Select>

                    {sowReproductiveLabels.map(
                      (x) => (
                        <Option
                          key={x}
                          value={x}
                        >
                          {x}
                        </Option>
                      )
                    )}
                  </Select>
                </Form.Item>

              ) : null
            }
          </Form.Item>

          {/* BARN */}
          <Form.Item
            name="barnId"
            label="Chuồng"
            initialValue={
              barns[0]?.id
            }
          >

            <Select>

              {barns.map((b) => (

                <Option
                  key={b.id}
                  value={b.id}
                >
                  {b.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* ARRIVED */}
          <Form.Item
            name="arrivedAt"
            label="Ngày nhập"
            initialValue={dayjs()}
          >

            <DatePicker
              style={{
                width: "100%",
              }}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          {/* AGE */}
          <Form.Item
            name="ageDays"
            label="Tuổi (ngày)"
            initialValue={0}
          >

            <InputNumber
              style={{
                width: "100%",
              }}
            />
          </Form.Item>

          {/* WEIGHT */}
          <Form.Item
            name="weightKg"
            label="Cân nặng"
          >

            <InputNumber
              style={{
                width: "100%",
              }}
            />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}