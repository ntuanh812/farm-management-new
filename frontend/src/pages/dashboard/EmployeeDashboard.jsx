import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, List, message, Spin } from 'antd'
import { TeamOutlined, HomeOutlined, ShoppingCartOutlined, RiseOutlined, FallOutlined, DashboardOutlined, SnippetsOutlined } from '@ant-design/icons'
import axios from 'axios'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CATEGORY_MAP = {
  'SOW': 'Lợn nái',
  'BOAR': 'Lợn đực',
  'PIGLET': 'Lợn con',
  'FATTENING': 'Lợn thịt'
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// =========================================================
// TIME FORMAT
// =========================================================
function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) return "";
  const diffMs = Date.now() - time;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}

export default function EmployeeDashboard() {
  const { token, user } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(false);
  const [barns, setBarns] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [feedUsages, setFeedUsages] = useState([]);
  const [activities, setActivities] = useState([]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [barnRes, pigRes, feedRes, moveRes] = await Promise.all([
        axios.get(`${API}/barns`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/pigs`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/feed-usages`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/movements`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);

      setBarns(barnRes.data?.data || []);
      setPigs(pigRes.data?.data || []);
      setFeedUsages(feedRes.data?.data || []);
      
      const acts = (moveRes.data?.data || []).slice(0, 5).map(m => ({
        id: m.id,
        icon: "task",
        content: `Chuyển lợn ${m.earTag} từ ${m.fromBarnName} sang ${m.toBarnName}`,
        createdAt: m.createdAt
      }));
      setActivities(acts);

    } catch (err) {
      console.error(err);
      message.error("Không tải được dữ liệu bảng điều khiển");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const activePigs = useMemo(() => {
    return pigs.filter(p => p.lifecycleStatus === "ACTIVE" || p.lifecycle_status === "ACTIVE");
  }, [pigs]);

  const totalBarns = barns.length;

  const branThisMonth = useMemo(() => {
    const now = new Date();
    return feedUsages.filter(f => {
      const d = new Date(f.used_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, f) => sum + Number(f.quantity_kg || 0), 0);
  }, [feedUsages]);

  const pigChartData = useMemo(() => {
    const counts = activePigs.reduce((acc, pig) => {
      acc[pig.category] = (acc[pig.category] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({
      name: CATEGORY_MAP[key] || key,
      value: counts[key]
    }));
  }, [activePigs]);

  const feedChartData = useMemo(() => {
    const counts = feedUsages.reduce((acc, feed) => {
      acc[feed.feed_type] = (acc[feed.feed_type] || 0) + Number(feed.quantity_kg || 0);
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [feedUsages]);

  const statsData = [
    {
      title: "Lợn đang quản lý",
      value: activePigs.length,
      unit: "con",
      icon: <TeamOutlined />,
      type: "pigs",
      trend: "Trong chuồng phân công",
      trendUp: true,
    },
    {
      title: "Chuồng đang quản lý",
      value: totalBarns,
      unit: "chuồng",
      icon: <HomeOutlined />,
      type: "barn",
      trend: "Đang sử dụng",
      trendUp: true,
    },
    {
      title: "Cám tiêu thụ tháng này",
      value: branThisMonth,
      unit: "kg",
      icon: <ShoppingCartOutlined />,
      type: "staff",
      trend: "Tổng khối lượng",
      trendUp: true,
    },
    {
      title: "Hoạt động chuyển chuồng",
      value: activities.length,
      unit: "bản ghi",
      icon: <DashboardOutlined />,
      type: "daily-tasks",
      trend: "Cập nhật mới",
      trendUp: true,
    },
  ];

  return (
    <div className="dashboard">
      <PageHeader
        title={`Xin chào, ${user?.full_name || 'Nhân viên'} 👋`}
        subtitle="Tổng quan trại lợn thuộc phạm vi quản lý của bạn"
      />

      <div className="dashboard__maincontent">
        <Spin spinning={loading}>
          <Row gutter={[20, 20]} className="dashboard-stats">
            {statsData.map((stat, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card className={`stat-card stat-card--${stat.type}`}>
                  <div className="stat-card__header">
                    <span className="stat-card__title">{stat.title}</span>
                    <div className="stat-card__icon">{stat.icon}</div>
                  </div>
                  <div className="stat-card__value">
                    {stat.value}
                    <span className="stat-card__label"> {stat.unit}</span>
                  </div>
                  <div className={`stat-card__trend ${stat.trendUp ? "stat-card__trend--up" : "stat-card__trend--down"}`}>
                    {stat.trendUp ? <RiseOutlined /> : <FallOutlined />}
                    <span>{stat.trend}</span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[20, 20]} style={{ marginTop: 24 }} className="dashboard-charts">
            <Col xs={24} lg={12}>
              <Card className="chart-card">
                <div className="chart-card__header">
                  <h3>Cơ cấu đàn lợn đang quản lý</h3>
                </div>
                <div className="chart-card__content" style={{ height: 320, padding: '20px 0' }}>
                  {pigChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pigChartData}
                          cx="50%" cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pigChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} con`, 'Số lượng']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-card__placeholder">
                      <div className="placeholder-icon">🐷</div>
                      <p>Chưa có lợn trong chuồng</p>
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="chart-card">
                <div className="chart-card__header">
                  <h3>Tiêu thụ cám (Chuồng quản lý)</h3>
                </div>
                <div className="chart-card__content" style={{ height: 320, padding: '20px 0' }}>
                  {feedChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={feedChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
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

          <Row style={{ marginTop: 24 }}>
            <Col span={24}>
              <Card className="activity-card">
                <div className="activity-card__header">
                  <h3>Hoạt động chuyển chuồng gần đây</h3>
                </div>
                <div className="activity-card__list">
                  <List
                    dataSource={activities}
                    locale={{ emptyText: "Chưa có hoạt động" }}
                    renderItem={(item) => (
                      <div className="activity-card__item" key={item.id}>
                        <div className={`activity-card__icon activity-card__icon--${item.icon}`}>
                          <SnippetsOutlined />
                        </div>
                        <div className="activity-card__content">
                          <p>{item.content}</p>
                          <span>{formatRelativeTime(item.createdAt)}</span>
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
}
