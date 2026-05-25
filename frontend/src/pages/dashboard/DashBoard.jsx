import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Card,
  Row,
  Col,
  List,
  message,
  Spin,
} from "antd";

import {
  RiseOutlined,
  FallOutlined,
  SnippetsOutlined,
  HomeOutlined,
  TeamOutlined,
  DashboardOutlined,
  AppleOutlined,
  AuditOutlined,
} from "@ant-design/icons";

import axios from "axios";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/store/authStore";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// =========================================================
// TIME FORMAT
// =========================================================
function formatRelativeTime(dateString) {

  if (!dateString) return "";

  const time =
    new Date(dateString).getTime();

  if (Number.isNaN(time)) return "";

  const diffMs =
    Date.now() - time;

  const diffMin =
    Math.floor(diffMs / 60000);

  if (diffMin < 1)
    return "Vừa xong";

  if (diffMin < 60)
    return `${diffMin} phút trước`;

  const diffHour =
    Math.floor(diffMin / 60);

  if (diffHour < 24)
    return `${diffHour} giờ trước`;

  const diffDay =
    Math.floor(diffHour / 24);

  return `${diffDay} ngày trước`;
}

export const DashBoard = () => {

  // =========================================================
  // STATES
  // =========================================================
  const [loading, setLoading] =
    useState(false);

  const [barns, setBarns] =
    useState([]);

  const [pigs, setPigs] =
    useState([]);

  const [employees, setEmployees] =
    useState([]);

  const [activities, setActivities] =
    useState([]);

  const [chartData, setChartData] =
    useState({ revenue: [], feed: [] });

  const { token } = useAuthStore();

  // =========================================================
  // FETCH DATA
  // =========================================================
  const fetchDashboard =
    async () => {

      try {

        setLoading(true);

        const headers = {
          Authorization:
            `Bearer ${token}`,
        };

        const [
          barnRes,
          pigRes,
          employeeRes,
          reportRes,
        ] = await Promise.all([

          axios.get(
            `${API}/barns`,
            { headers }
          ).catch(() => ({ data: { data: [] } })),

          axios.get(
            `${API}/pigs`,
            { headers }
          ).catch(() => ({ data: { data: [] } })),

          axios.get(
            `${API}/staff`,
            { headers }
          ).catch(() => ({ data: { data: [] } })),

          axios.get(
            `${API}/reports-dashboard/overview`,
            { headers }
          ).catch(() => ({ data: { data: { charts: { revenue: [], feed: [] } } } })),
        ]);

        setBarns(
          barnRes.data?.data || []
        );

        setPigs(
          pigRes.data?.data || []
        );

        setEmployees(
          employeeRes.data?.data || []
        );

        setChartData({
          revenue: reportRes.data?.data?.charts?.revenue || [],
          feed: reportRes.data?.data?.charts?.feed || []
        });

        setActivities([
          {
            id: 1,
            icon: "task",
            content:
              "Hệ thống đã khởi động",
            createdAt:
              new Date(),
          },
        ]);

      } catch (err) {

        console.error(err);

        message.error(
          "Không tải được dashboard"
        );

      } finally {

        setLoading(false);
      }
    };

  // =========================================================
  // LOAD
  // =========================================================
  useEffect(() => {
    fetchDashboard();
  }, []);

  // =========================================================
  // ACTIVE PIGS
  // =========================================================
  const activePigs =
    useMemo(() => {

      return pigs.filter(
        (p) =>
          p.lifecycleStatus ===
            "ACTIVE" ||
          p.lifecycle_status ===
            "ACTIVE"
      );

    }, [pigs]);

  // =========================================================
  // STATS
  // =========================================================
  const statsData = [

    {
      title: "Lợn đang nuôi",

      value:
        activePigs.length,

      unit: "con",

      icon:
        <SnippetsOutlined />,

      type: "pigs",

      trend: "Đang hoạt động",

      trendUp: true,
    },

    {
      title: "Chuồng",

      value:
        barns.length,

      unit: "chuồng",

      icon:
        <HomeOutlined />,

      type: "barn",

      trend: "Đang sử dụng",

      trendUp: true,
    },

    {
      title: "Nhân sự",

      value:
        employees.length,

      unit: "người",

      icon:
        <TeamOutlined />,

      type: "staff",

      trend: "Đang làm việc",

      trendUp: true,
    },

    {
      title:
        "Hoạt động gần đây",

      value:
        activities.length,

      unit: "bản ghi",

      icon:
        <DashboardOutlined />,

      type:
        "daily-tasks",

      trend:
        "Cập nhật mới",

      trendUp: true,
    },
  ];

  // =========================================================
  // ACTIVITY ICON
  // =========================================================
  const getActivityIcon =
    (type) => {

      switch (type) {

        case "medical":
          return <AuditOutlined />;

        case "feeding":
          return <AppleOutlined />;

        case "task":
          return (
            <SnippetsOutlined />
          );

        default:
          return (
            <DashboardOutlined />
          );
      }
    };

  return (
    <div className="dashboard">

      <PageHeader
        title="Tổng quan trại lợn"
        subtitle="Dữ liệu realtime từ database"
      />

      <div className="dashboard__maincontent">

        <Spin spinning={loading}>

          {/* ================================================= */}
          {/* STATS */}
          {/* ================================================= */}

          <Row
            gutter={[20, 20]}
            className="dashboard-stats"
          >

            {statsData.map(
              (stat, index) => (

                <Col
                  xs={24}
                  sm={12}
                  lg={6}
                  key={index}
                >

                  <Card
                    className={`
                      stat-card
                      stat-card--${stat.type}
                    `}
                  >

                    <div className="stat-card__header">

                      <span className="stat-card__title">
                        {stat.title}
                      </span>

                      <div className="stat-card__icon">
                        {stat.icon}
                      </div>
                    </div>

                    <div className="stat-card__value">

                      {stat.value}

                      <span className="stat-card__label">
                        {" "}
                        {stat.unit}
                      </span>
                    </div>

                    <div
                      className={`
                        stat-card__trend
                        ${
                          stat.trendUp
                            ? "stat-card__trend--up"
                            : "stat-card__trend--down"
                        }
                      `}
                    >

                      {stat.trendUp
                        ? <RiseOutlined />
                        : <FallOutlined />
                      }

                      <span>
                        {stat.trend}
                      </span>
                    </div>
                  </Card>
                </Col>
              )
            )}
          </Row>

          {/* ================================================= */}
          {/* CHARTS */}
          {/* ================================================= */}
          <Row
            gutter={[20, 20]}
            style={{
              marginTop: 24,
            }}
            className="dashboard-charts"
          >

            <Col
              xs={24}
              lg={12}
            >

              <Card className="chart-card">

                <div className="chart-card__header">

                  <h3>
                    Doanh thu xuất bán
                  </h3>
                </div>

                <div className="chart-card__content" style={{ height: 320, padding: '20px 0' }}>
                  {chartData.revenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.revenue} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} VNĐ`} cursor={{fill: 'transparent'}}/>
                        <Legend />
                        <Bar dataKey="revenue" name="Doanh thu" fill="#2d5a27" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-card__placeholder">
                      <div className="placeholder-icon">📊</div>
                      <p>Chưa có dữ liệu xuất bán</p>
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            <Col
              xs={24}
              lg={12}
            >

              <Card className="chart-card">

                <div className="chart-card__header">

                  <h3>
                    Tiêu thụ cám
                  </h3>
                </div>

                <div className="chart-card__content" style={{ height: 320, padding: '20px 0' }}>
                  {chartData.feed.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.feed} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                        <XAxis type="number" axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => `${value} kg`} cursor={{fill: 'transparent'}}/>
                        <Legend />
                        <Bar dataKey="value" name="Khối lượng (Kg)" fill="#f4a261" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-card__placeholder">
                      <div className="placeholder-icon">🌾</div>
                      <p>Chưa có dữ liệu tiêu thụ cám</p>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          {/* ================================================= */}
          {/* ACTIVITIES */}
          {/* ================================================= */}

          <Row
            style={{
              marginTop: 24,
            }}
          >

            <Col span={24}>

              <Card className="activity-card">

                <div className="activity-card__header">

                  <h3>
                    Hoạt động gần đây
                  </h3>
                </div>

                <div className="activity-card__list">

                  <List
                    dataSource={
                      activities
                    }

                    locale={{
                      emptyText:
                        "Chưa có hoạt động",
                    }}

                    renderItem={(
                      item
                    ) => (

                      <div
                        className="activity-card__item"
                        key={item.id}
                      >

                        <div
                          className={`
                            activity-card__icon
                            activity-card__icon--${item.icon || "default"}
                          `}
                        >

                          {getActivityIcon(
                            item.icon
                          )}
                        </div>

                        <div className="activity-card__content">

                          <p>
                            {item.description ||
                              item.content}
                          </p>

                          <span>
                            {formatRelativeTime(
                              item.createdAt ||
                              item.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>
    </div>
  );
};