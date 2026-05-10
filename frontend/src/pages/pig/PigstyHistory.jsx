import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  Tag,
  message,
} from "antd";

import axios from "axios";

import { PageHeader } from "../../components/layout/PageHeader";

import {
  barnLabel,
  isoToDisplay,
} from "../../domain/pigFarm";

import {
  LifecycleStatus,
} from "../../domain/pigFarm";

const { Option } = Select;

export default function PigstyHistory() {

  // =========================================================
  // DATABASE DATA
  // =========================================================
  const [pigs, setPigs] =
    useState([]);

  const [barns, setBarns] =
    useState([]);

  const [staff, setStaff] =
    useState([]);

  const [movements, setMovements] =
    useState([]);

  // =========================================================
  // UI
  // =========================================================
  const [loading, setLoading] =
    useState(false);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedRowKeys, setSelectedRowKeys] =
    useState([]);

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [form] = Form.useForm();

  const token =
    localStorage.getItem("token");

  // =========================================================
  // FETCH DATA
  // =========================================================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {

    try {

      setLoading(true);

      const headers = {
        Authorization:
          `Bearer ${token}`,
      };

      const [
        pigRes,
        barnRes,
        staffRes,
        movementRes,
      ] = await Promise.all([

        axios.get(
          "http://localhost:3000/api/pigs",
          { headers }
        ),

        axios.get(
          "http://localhost:3000/api/barns",
          { headers }
        ),

        axios.get(
          "http://localhost:3000/api/employees",
          { headers }
        ),

        axios.get(
          "http://localhost:3000/api/movements",
          { headers }
        ),
      ]);

      setPigs(
        pigRes.data.data || []
      );

      setBarns(
        barnRes.data.data || []
      );

      setStaff(
        staffRes.data.data || []
      );

      setMovements(
        movementRes.data.data || []
      );

    } catch (err) {

      console.error(err);

      message.error(
        "Không tải được dữ liệu"
      );

    } finally {

      setLoading(false);
    }
  };

  // =========================================================
  // FILTER ACTIVE PIGS
  // =========================================================
  const activePigs = useMemo(() => {
  return pigs.filter(
    (p) =>
      p.lifecycleStatus === "ACTIVE"
  );
}, [pigs]);

  // =========================================================
  // FILTER BY CATEGORY
  // =========================================================
  const filteredPigs =
    useMemo(() => {

      if (
        statusFilter === "all"
      ) {

        return activePigs;
      }

      return activePigs.filter(
        (p) =>
          (p.category || "") ===
          statusFilter
      );

    }, [
      activePigs,
      statusFilter,
    ]);

  // =========================================================
  // HISTORY TABLE
  // =========================================================
  const historyRows =
    useMemo(() => {

      return movements.map((m) => {

        const pig =
          pigs.find(
            (p) =>
              p.id === m.pigId
          );

        return {

          key: m.id,

          date:
            isoToDisplay(
              m.movedAt
            ),

          earTag:
            pig?.earTag ||
            m.earTag,

          status:
            pig?.category ||
            m.category,

          fromPen:
            barnLabel(
              barns,
              m.fromBarnId
            ),

          toPen:
            barnLabel(
              barns,
              m.toBarnId
            ),

          person:
            m.staffName,

          note:
            m.note,
        };
      });

    }, [
      movements,
      pigs,
      barns,
    ]);

  // =========================================================
  // TABLE COLUMNS
  // =========================================================
  const columns = [

    {
      title: "STT",

      render:
        (_, __, index) =>
          index + 1,
    },

    {
      title:
        "Ngày chuyển",

      dataIndex: "date",
    },

    {
      title: "Số tai",

      dataIndex:
        "earTag",
    },

    {
      title:
        "Loại lợn",

      dataIndex:
        "status",

      render: (s) => (
        <Tag color="blue">
          {s}
        </Tag>
      ),
    },

    {
      title:
        "Từ chuồng",

      dataIndex:
        "fromPen",
    },

    {
      title:
        "Sang chuồng",

      dataIndex:
        "toPen",

      render: (p) => (
        <Tag color="green">
          {p}
        </Tag>
      ),
    },

    {
      title:
        "Người thực hiện",

      dataIndex:
        "person",
    },

    {
      title:
        "Ghi chú",

      dataIndex:
        "note",
    },
  ];

  // =========================================================
  // PIG TABLE
  // =========================================================
  const pigColumns = [

    {
      title: "STT",

      render:
        (_, __, index) =>
          index + 1,
    },

    {
      title:
        "Số tai",

      dataIndex:
        "earTag",
    },

    {
      title:
        "Loại lợn",

      dataIndex:
        "category",

      render: (s) => (
        <Tag color="blue">
          {s || "—"}
        </Tag>
      ),
    },

    {
      title:
        "Chuồng hiện tại",

      dataIndex:
        "barnId",

      render: (id) =>
        barnLabel(
          barns,
          id
        ),
    },
  ];

  // =========================================================
  // HANDLE ADD
  // =========================================================
  const handleAdd =
    async () => {

      if (
        selectedRowKeys.length === 0
      ) {

        message.warning(
          "Chọn ít nhất 1 con"
        );

        return;
      }

      try {

        const values =
          await form.validateFields();

        const selected =
          activePigs.filter(
            (p) =>
              selectedRowKeys.includes(
                p.id
              )
          );

        const invalid =
          selected.some(
            (p) =>
              p.barnId ===
              values.toBarnId
          );

        if (invalid) {

          message.error(
            "Có con đã ở chuồng này"
          );

          return;
        }

        await axios.post(
          "http://localhost:3000/api/movements",

          {
            pigIds:
              selectedRowKeys,

            toBarnId:
              values.toBarnId,

            movedAt:
              values.date.format(
                "YYYY-MM-DD"
              ),

            staffId:
              values.person,

            note:
              values.note,
          },

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        message.success(
          "Đã chuyển chuồng"
        );

        setSelectedRowKeys([]);

        setIsModalOpen(false);

        form.resetFields();

        fetchData();

      } catch (err) {

        console.error(err);

        message.error(
          "Không thể chuyển chuồng"
        );
      }
    };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="dashboard">

      <PageHeader
        title="Chuyển chuồng"
        subtitle="Theo dõi lịch sử di chuyển lợn"
      />

      <div className="dashboard__maincontent">

        {/* STATS */}
        <div className="stats-grid">

          <Card
            className="
              stat-card
              stat-card--barn
            "
          >

            <div className="stat-card__header">

              <span
                className="
                  stat-card__title
                "
              >
                Lượt chuyển
              </span>

              <div
                className="
                  stat-card__icon
                "
              >
                🏠
              </div>
            </div>

            <div
              className="
                stat-card__value
              "
            >
              {movements.length}
            </div>
          </Card>
        </div>

        {/* ACTION */}
        <Card
          className="filter-card"
        >

          <Space wrap>

            <Button
              type="primary"
              onClick={() =>
                setIsModalOpen(
                  true
                )
              }
            >
              Thêm chuyển chuồng
            </Button>

          </Space>
        </Card>

        {/* TABLE */}
        <Card
          className="table-card"
        >

          <Table
            loading={loading}
            columns={columns}
            dataSource={
              historyRows
            }
            pagination={{
              pageSize: 10,
            }}
          />
        </Card>
      </div>

      {/* MODAL */}
      <Modal
        title="Chuyển chuồng"
        open={isModalOpen}
        onCancel={() =>
          setIsModalOpen(false)
        }
        onOk={handleAdd}
        width={800}
      >

        {/* FILTER */}
        <Space
          style={{
            marginBottom: 12,
          }}
        >

          <Select
            value={
              statusFilter
            }
            onChange={
              setStatusFilter
            }
            style={{
              width: 220,
            }}
          >

            <Option value="all">
              Tất cả
            </Option>

            <Option value="SOW">
              Nái
            </Option>

            <Option value="BOAR">
              Đực giống
            </Option>

            <Option value="PIGLET">
              Lợn con
            </Option>

            <Option value="FATTENING">
              Lợn thịt
            </Option>

          </Select>
        </Space>

        {/* PIG TABLE */}
        <Table
          rowKey="id"

          rowSelection={{
            selectedRowKeys,

            onChange:
              setSelectedRowKeys,
          }}

          columns={pigColumns}

          dataSource={
            filteredPigs
          }

          pagination={{
            pageSize: 5,
          }}

          size="small"
        />

        {/* FORM */}
        <Form
          form={form}
          layout="vertical"
          style={{
            marginTop: 12,
          }}
        >

          <Form.Item
            name="date"
            label="Ngày chuyển"
            rules={[
              {
                required: true,

                message:
                  "Chọn ngày chuyển",
              },
            ]}
          >

            <DatePicker
              style={{
                width: "100%",
              }}

              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="toBarnId"

            label="Chuyển sang chuồng"

            rules={[
              {
                required: true,

                message:
                  "Chọn chuồng",
              },
            ]}
          >

            <Select
              placeholder="
                Chọn chuồng
              "
            >

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

          <Form.Item
            name="person"

            label="Người thực hiện"

            rules={[
              {
                required: true,

                message:
                  "Chọn nhân viên",
              },
            ]}
          >

            <Select
              placeholder="
                Chọn nhân viên
              "
            >

              {staff.map((x) => (

                <Option
                  key={x.id}
                  value={x.id}
                >
                  {x.full_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
          >

            <Input.TextArea
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}