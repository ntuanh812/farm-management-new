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
const purposeLabels = {
  nai: "Chuồng nái",
  duc: "Chuồng đực",
  con: "Chuồng con",
  thit: "Chuồng thịt",
  cach_ly: "Cách ly",
};

export default function PigBarns() {

  const [barns, setBarns] = useState([]);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [editingBarn, setEditingBarn] =
    useState(null);

  const [form] = Form.useForm();

  // =========================================================
  // TOKEN
  // =========================================================
  const token = localStorage.getItem("token");

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
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("BARNS:", res.data);

      const barnsData =
        res.data?.data ||
        res.data?.barns ||
        (Array.isArray(res.data)
          ? res.data
          : []);

      setBarns(barnsData);

    } catch (err) {

      console.error(err);

      if (err.response?.status === 401) {
        message.error(
          "Phiên đăng nhập hết hạn"
        );
      } else {
        message.error(
          "Không tải được danh sách chuồng"
        );
      }

      setBarns([]);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarns();
  }, []);

  // =========================================================
  // EDIT
  // =========================================================
  const handleEdit = (barn) => {

    setEditingBarn(barn);

    form.setFieldsValue({
      name: barn.name,
      purpose: barn.purpose,
      capacity: barn.capacity,
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
            Authorization: `Bearer ${token}`,
          },
        }
      );

      message.success(
        "Xóa chuồng thành công"
      );

      fetchBarns();

    } catch (err) {

      console.error(err);

      if (err.response?.status === 400) {

        message.error(
          err.response.data.message
        );

      } else {

        message.error(
          "Không thể xóa chuồng"
        );
      }
    }
  };

  // =========================================================
  // SAVE
  // =========================================================
  const handleOk = async () => {

    try {

      const values =
        await form.validateFields();

      // ===== UPDATE =====
      if (editingBarn) {

        await axios.put(
          `http://localhost:3000/api/barns/${editingBarn.id}`,
          values,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        message.success(
          "Cập nhật chuồng thành công"
        );
      }

      // ===== CREATE =====
      else {

        await axios.post(
          "http://localhost:3000/api/barns",
          values,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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

      if (err.response?.status === 401) {

        message.error(
          "Bạn chưa đăng nhập"
        );

      } else {

        message.error(
          "Không thể lưu chuồng"
        );
      }
    }
  };

  // =========================================================
  // TABLE COLUMNS
  // =========================================================
  const columns = [
    {
      title: "Tên chuồng",
      dataIndex: "name",
    },

    {
      title: "Loại",
      dataIndex: "purpose",

      render: (p) => (
        <Tag color="blue">
          {purposeLabels[p] ||
            "Không xác định"}
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
      dataIndex: "current_quantity",

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
      dataIndex: "createdAt",
      width: 180,

      render: (d) =>
        d
          ? new Date(d).toLocaleString(
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

          {/* EDIT */}
          <Button
            type="primary"
            onClick={() =>
              handleEdit(record)
            }
          >
            Sửa
          </Button>

          {/* DELETE */}
          <Popconfirm
            title="Xóa chuồng"
            description="Bạn có chắc muốn xóa chuồng này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() =>
              handleDelete(record)
            }
          >
            <Button danger>
              Xóa
            </Button>
          </Popconfirm>

        </Space>
      ),
    },
  ];

  // =========================================================
  // SAFE ARRAY
  // =========================================================
  const safeBarns = Array.isArray(barns)
    ? barns
    : [];

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
              {safeBarns.length}
            </div>
          </Card>

          {/* NÁI */}
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
              {
                safeBarns.filter(
                  (b) =>
                    b.purpose === "nai"
                ).length
              }
            </div>
          </Card>

          {/* THỊT */}
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
              {
                safeBarns.filter(
                  (b) =>
                    b.purpose === "thit"
                ).length
              }
            </div>
          </Card>

          {/* CÁCH LY */}
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
              {
                safeBarns.filter(
                  (b) =>
                    b.purpose ===
                    "cach_ly"
                ).length
              }
            </div>
          </Card>
        </div>

        {/* ================================================= */}
        {/* ACTION */}
        {/* ================================================= */}

        <Card className="filter-card">

          <Space wrap>

            <Button
              type="primary"
              onClick={() => {

                setEditingBarn(null);

                form.resetFields();

                form.setFieldsValue({
                  purpose: "thit",
                });

                setOpen(true);
              }}
            >
              Thêm chuồng
            </Button>

          </Space>
        </Card>

        {/* ================================================= */}
        {/* TABLE */}
        {/* ================================================= */}

        <Card className="table-card">

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={safeBarns}
            pagination={false}
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

          {/* PURPOSE */}
          <Form.Item
            name="purpose"
            label="Loại chuồng"
            initialValue="thit"
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
              style={{ width: "100%" }}
            />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}