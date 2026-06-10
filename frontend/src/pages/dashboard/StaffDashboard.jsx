import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Row, Col, Card, message, Spin } from 'antd'
import { TeamOutlined, HomeOutlined, ShoppingCartOutlined, RiseOutlined, FallOutlined, DashboardOutlined, SnippetsOutlined, AuditOutlined, AppleOutlined } from '@ant-design/icons'
import axiosClient from '@/utils/axiosClient'
import dayjs from 'dayjs'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { CATEGORY_MAP } from '@/utils/constants'
import { formatRelativeTime } from '@/utils/formatters'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function StaffDashboard() {
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(false);
  const [barns, setBarns] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [feedUsages, setFeedUsages] = useState([]);
  const [activities, setActivities] = useState([]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [barnRes, pigRes, feedRes, moveRes, saleRes, reportRes, medicineRes, vaccineRes] = await Promise.all([
        axiosClient.get(`/barns`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/pigs`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/feed-usages`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/movements`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/sale-batches`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/pig-reports`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/medicine-usages`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/vaccinations`).catch(() => ({ data: { data: [] } })),
      ]);

      setBarns(barnRes.data?.data || []);
      setPigs(pigRes.data?.data || []);
      setFeedUsages(feedRes.data?.data || []);
      
      const acts = (moveRes.data?.data || []).map(m => ({
        id: `move_${m.id}`,
        icon: "task",
        content: `Chuyển PIG${String(m.pig_id).padStart(3, "0")} từ ${m.from_barn_name || 'chuồng cũ'} sang ${m.to_barn_name || 'chuồng mới'}`,
        created_at: m.created_at,
        action_date: m.move_date
      }));

      (saleRes.data?.data || []).forEach(s => {
        acts.push({
          id: `sale_${s.id}`,
          icon: "feeding",
          content: `Xuất bán ${s.lines?.length || 0} con lợn thịt`,
          created_at: s.created_at,
          action_date: s.sold_at
        });
      });

      (reportRes.data?.data || []).forEach(r => {
        acts.push({
          id: `report_${r.id}`,
          icon: "medical",
          content: `Báo cáo lợn bệnh số ${r.pig_id}: ${r.description || ''}`,
          created_at: r.created_at,
          action_date: r.created_at
        });
      });

      (feedRes.data?.data || []).forEach(f => {
        acts.push({
          id: `feed_${f.id}`,
          icon: "feeding",
          content: `Sử dụng ${f.quantity_kg}kg cám ${f.feed_name || ''} tại ${f.barn_name || 'chuồng'}`,
          created_at: f.created_at,
          action_date: f.used_at
        });
      });

      (medicineRes.data?.data || []).forEach(m => {
        acts.push({
          id: `med_${m.id}`,
          icon: "medical",
          content: `Cấp phát ${m.quantity} ${m.unit} thuốc ${m.medicine_name || ''} tại ${m.barn_name || 'chuồng'}`,
          created_at: m.created_at,
          action_date: m.used_at
        });
      });

      (vaccineRes.data?.data || []).forEach(v => {
        acts.push({
          id: `vac_${v.id}`,
          icon: "medical",
          content: `Tiêm vaccine ${v.vaccine_name || ''} tại ${v.barn_name || ('PIG'+String(v.pig_id).padStart(3,"0"))}`,
          created_at: v.created_at,
          action_date: v.vaccinated_at
        });
      });

      const threeDaysAgo = dayjs().subtract(3, 'day');
      const recentActs = acts
        .filter(a => a.action_date && dayjs(a.action_date).isValid() && dayjs(a.action_date).isAfter(threeDaysAgo))
        .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());

      setActivities(recentActs.slice(0, 6));

    } catch (err) {
      console.error(err);
      message.error("Không tải được dữ liệu bảng điều khiển");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const activePigs = useMemo(() => {
    return pigs.filter(p => p.lifecycle_status === "ACTIVE");
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
    const currentYear = dayjs().year();
    const currentMonth = dayjs().month() + 1;

    const counts = feedUsages.reduce((acc, feed) => {
      const date = dayjs(feed.used_at || feed.created_at);
      if (date.year() === currentYear && date.month() + 1 <= currentMonth) {
        const key = feed.feed_name || feed.feed_type || 'Không rõ';
        acc[key] = (acc[key] || 0) + Number(feed.quantity_kg || 0);
      }
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
                  <h3>Hoạt động 3 ngày gần đây</h3>
                </div>
                <div className="activity-card__list">
                  {activities && activities.length > 0 ? (
                    activities.map((item) => (
                      <div className="activity-card__item" key={item.id}>
                        <div className={`activity-card__icon activity-card__icon--${item.icon || 'default'}`}>
                          {item.icon === 'medical' ? <AuditOutlined /> : item.icon === 'feeding' ? <AppleOutlined /> : <SnippetsOutlined />}
                        </div>
                        <div className="activity-card__content">
                          <p>{item.content}</p>
                          <span>{formatRelativeTime(item.created_at)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: '#999', padding: '16px 0' }}>Chưa có hoạt động</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>
    </div>
  );
}
