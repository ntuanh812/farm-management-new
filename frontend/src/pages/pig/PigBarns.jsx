import React, { useEffect, useState } from "react";

import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  message,
  Popconfirm,
} from "antd";

import axios from "axios";

import { PageHeader } from "../../components/layout/PageHeader";

const { Option } = Select;

// =========================================================
// LABELS
// =========================================================
const barnTypeLabels = {
  nai: "Chuồng nái",
  duc: "Chuồng đực",
  con: "Chuồng con",
  thit: "Chuồng thịt",
  cach_ly: "Cách ly",
};

const barnTypeColors = {
  nai: "magenta",
  duc: "red",
  con: "gold",
  thit: "green",
  cach_ly: "volcano",
};

export default function PigBarns() {

  // =========================================================
  // STATES
  // =========================================================
  const [barns, setBarns] = useState([]);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [editingBarn, setEditingBarn] =
    useState(null);

  const [form] = Form.useForm();

  const token =
    localStorage.getItem("token");

  // =========================================================
  // FETCH BARNS
  // =========================================================
  const fetchBarns = async () => {

    try {

      setLoading(true);

      const res = await axios.get(
        "http://localhost:3000/api/barns",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const barnsData =
        res.data?.data || [];

      setBarns(
        Array.isArray(barnsData)
          ? barnsData
          : []
      );

    } catch (err) {

      console.error(err);

      message.error(
        "Không tải được danh sách chuồng"
      );

      setBarns([]);

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarns();
  }, []);

  // =========================================================
  // OPEN CREATE
  // =========================================================
  const openCreateModal = () => {

    setEditingBarn(null);

    form.resetFields();

    form.setFieldsValue({
      barn_type: "thit",
      status: "active",
      capacity: 1,
    });

    setOpen(true);
  };

  // =========================================================
  // EDIT
  // =========================================================
  const handleEdit = (barn) => {

    setEditingBarn(barn);

    form.setFieldsValue({
      code: barn.code,
      name: barn.name,
      barn_type: barn.barn_type,
      capacity: barn.capacity,
      status: barn.status,
      note: barn.note,
    });

    setOpen(true);
  };

  // =========================================================
  // DELETE
  // =========================================================
  const handleDelete = async (barn) => {

    try {

      await axios.delete(
        `http://localhost:3000/api/barns/${barn.id}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      message.success(
        "Xóa chuồng thành công"
      );

      fetchBarns();

    } catch (err) {

      console.error(err);

      message.error(
        err.response?.data?.message ||
        "Không thể xóa chuồng"
      );
    }
  };

  // =========================================================
  // SAVE
  // =========================================================
  const handleOk = async () => {

    try {

      const values =
        await form.validateFields();

      // =====================================================
      // UPDATE
      // =====================================================
      if (editingBarn) {

        await axios.put(
          `http://localhost:3000/api/barns/${editingBarn.id}`,
          values,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        message.success(
          "Cập nhật chuồng thành công"
        );
      }

      // =====================================================
      // CREATE
      // =====================================================
      else {

        await axios.post(
          "http://localhost:3000/api/barns",
          values,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        message.success(
          "Thêm chuồng thành công"
        );
      }

      setOpen(false);

      setEditingBarn(null);

      form.resetFields();

      fetchBarns();

    } catch (err) {

      console.error(err);

      message.error(
        err.response?.data?.message ||
        "Không thể lưu chuồng"
      );
    }
  };

  // =========================================================
  // TABLE
  // =========================================================
  const columns = [

    {
      title: "Mã chuồng",
      dataIndex: "code",
      width: 140,
    },

    {
      title: "Tên chuồng",
      dataIndex: "name",
    },

    {
      title: "Loại",
      dataIndex: "barn_type",

      render: (type) => (

        <Tag
          color={
            barnTypeColors[type]
          }
        >
          {
            barnTypeLabels[type]
          }
        </Tag>
      ),
    },

    {
      title: "Sức chứa",
      dataIndex: "capacity",

      render: (v) => `${v} con`,
    },

    {
      title: "Hiện tại",
      dataIndex:
        "current_quantity",

      render: (v, record) => (

        <Tag
          color={
            v >= record.capacity
              ? "red"
              : "green"
          }
        >
          {v}/{record.capacity} con
        </Tag>
      ),
    },

    {
      title: "Trạng thái",
      dataIndex: "status",

      render: (s) => (

        <Tag
          color={
            s === "active"
              ? "green"
              : "red"
          }
        >
          {s === "active"
            ? "Hoạt động"
            : "Ngưng hoạt động"}
        </Tag>
      ),
    },

    {
      title: "Ngày tạo",
      dataIndex: "created_at",

      render: (d) =>
        d
          ? new Date(d)
              .toLocaleDateString(
                "vi-VN"
              )
          : "-",
    },

    {
      title: "Hành động",
      key: "action",
      width: 220,

      render: (_, record) => (

        <Space>

          <Button
            type="primary"
            onClick={() =>
              handleEdit(record)
            }
          >
            Sửa
          </Button>

          <Popconfirm
            title="Xóa chuồng"
            description="Bạn có chắc muốn xóa chuồng này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() =>
              handleDelete(record)
            }
          >

            <Button
              danger
              disabled={
                record.current_quantity >
                0
              }
            >
              Xóa
            </Button>

          </Popconfirm>

        </Space>
      ),
    },
  ];

  // =========================================================
  // STATS
  // =========================================================
  const totalBarns =
    barns.length;

  const sowBarns =
    barns.filter(
      (b) =>
        b.barn_type === "nai"
    ).length;

  const meatBarns =
    barns.filter(
      (b) =>
        b.barn_type === "thit"
    ).length;

  const isolateBarns =
    barns.filter(
      (b) =>
        b.barn_type ===
        "cach_ly"
    ).length;

  return (
    <div className="dashboard">

      <PageHeader
        title="Chuồng trại"
        subtitle="Quản lý và cấu hình chuồng nuôi"
      />

      <div className="dashboard__maincontent">

        {/* ================================================= */}
        {/* STATS */}
        {/* ================================================= */}

        <div className="stats-grid">

          {/* TOTAL */}
          <Card className="stat-card stat-card--barn">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Tổng chuồng
              </span>

              <div className="stat-card__icon">
                🏠
              </div>
            </div>

            <div className="stat-card__value">
              {totalBarns}
            </div>
          </Card>

          {/* SOW */}
          <Card className="stat-card stat-card--pigs">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Chuồng nái
              </span>

              <div className="stat-card__icon">
                👑
              </div>
            </div>

            <div className="stat-card__value">
              {sowBarns}
            </div>
          </Card>

          {/* THIT */}
          <Card className="stat-card stat-card--staff">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Chuồng thịt
              </span>

              <div className="stat-card__icon">
                🥩
              </div>
            </div>

            <div className="stat-card__value">
              {meatBarns}
            </div>
          </Card>

          {/* CACH LY */}
          <Card className="stat-card stat-card--daily-tasks">

            <div className="stat-card__header">

              <span className="stat-card__title">
                Cách ly
              </span>

              <div className="stat-card__icon">
                🚨
              </div>
            </div>

            <div className="stat-card__value">
              {isolateBarns}
            </div>
          </Card>
        </div>

        {/* ================================================= */}
        {/* ACTION */}
        {/* ================================================= */}

        <Card className="filter-card">

          <Button
            type="primary"
            onClick={
              openCreateModal
            }
          >
            Thêm chuồng
          </Button>

        </Card>

        {/* ================================================= */}
        {/* TABLE */}
        {/* ================================================= */}

        <Card className="table-card">

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={barns}
            pagination={{
              pageSize: 10,
            }}
          />
        </Card>
      </div>

      {/* ================================================= */}
      {/* MODAL */}
      {/* ================================================= */}

      <Modal
        title={
          editingBarn
            ? "Sửa chuồng"
            : "Thêm chuồng"
        }
        open={open}
        onOk={handleOk}
        okText="Lưu"
        cancelText="Hủy"
        onCancel={() => {

          setOpen(false);

          setEditingBarn(null);

          form.resetFields();
        }}
      >

        <Form
          form={form}
          layout="vertical"
        >

          {/* CODE */}
          <Form.Item
            name="code"
            label="Mã chuồng"
            rules={[
              {
                required: true,
                message:
                  "Nhập mã chuồng",
              },
            ]}
          >
            <Input placeholder="VD: NAI-A1" />
          </Form.Item>

          {/* NAME */}
          <Form.Item
            name="name"
            label="Tên chuồng"
            rules={[
              {
                required: true,
                message:
                  "Nhập tên chuồng",
              },
            ]}
          >
            <Input placeholder="VD: Chuồng Nái A1" />
          </Form.Item>

          {/* TYPE */}
          <Form.Item
            name="barn_type"
            label="Loại chuồng"
            rules={[
              {
                required: true,
                message:
                  "Chọn loại chuồng",
              },
            ]}
          >

            <Select>

              <Option value="nai">
                Chuồng nái
              </Option>

              <Option value="duc">
                Chuồng đực
              </Option>

              <Option value="con">
                Chuồng con
              </Option>

              <Option value="thit">
                Chuồng thịt
              </Option>

              <Option value="cach_ly">
                Cách ly
              </Option>

            </Select>
          </Form.Item>

          {/* CAPACITY */}
          <Form.Item
            name="capacity"
            label="Sức chứa"
            rules={[
              {
                required: true,
                message:
                  "Nhập sức chứa",
              },
            ]}
          >

            <InputNumber
              min={1}
              style={{
                width: "100%",
              }}
            />
          </Form.Item>

          {/* STATUS */}
          <Form.Item
            name="status"
            label="Trạng thái"
          >

            <Select>

              <Option value="active">
                Hoạt động
              </Option>

              <Option value="inactive">
                Ngưng hoạt động
              </Option>

            </Select>
          </Form.Item>

          {/* NOTE */}
          <Form.Item
            name="note"
            label="Ghi chú"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}