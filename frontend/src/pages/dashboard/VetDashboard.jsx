import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Row, Col, List, message, Spin } from "antd";
import {
  RiseOutlined,
  BugOutlined,
  SnippetsOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  DashboardOutlined,
  WarningOutlined
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/store/authStore";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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

export default function VetDashboard() {
  const { token, user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [medicineUsages, setMedicineUsages] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [reportsRes, vaccinesRes, medicineRes] = await Promise.all([
        axios.get(`${API}/pig-reports`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/vaccinations`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/medicine-usages`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);

      setReports(reportsRes.data?.data || []);
      setVaccinations(vaccinesRes.data?.data || []);
      setMedicineUsages(medicineRes.data?.data || []);

    } catch (err) {
      console.error(err);
      message.error("Không tải được dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const todayStr = dayjs().format("YYYY-MM-DD");

  const treatingCases = useMemo(() => {
    return reports.filter(r => r.status === "cho_xu_ly" || r.status === "dang_xu_ly").length;
  }, [reports]);

  const vaccineToday = useMemo(() => {
    return vaccinations.filter(v => dayjs(v.scheduled_date || v.vaccination_date).format("YYYY-MM-DD") === todayStr).length;
  }, [vaccinations, todayStr]);

  const recentActivities = useMemo(() => {
    const combined = [
      ...reports.map(r => ({
        id: `report_${r.id}`,
        type: 'report',
        title: `Báo cáo: PIG${String(r.pig_id).padStart(3, "0")}`,
        content: r.description,
        createdAt: r.created_at,
        icon: <WarningOutlined />
      })),
      ...vaccinations.map(v => ({
        id: `vac_${v.id}`,
        type: 'vaccine',
        title: `Tiêm vaccine: ${v.vaccine_name || ''}`,
        content: `Tại ${v.barn_name || ('PIG'+String(v.pig_id).padStart(3, "0"))}`,
        createdAt: v.vaccinated_at || v.created_at,
        icon: <MedicineBoxOutlined />
      })),
      ...medicineUsages.map(m => ({
        id: `med_${m.id}`,
        type: 'medicine',
        title: `Dùng thuốc: ${m.medicine_name || ''}`,
        content: `Sử dụng tại ${m.barn_name || 'chuồng'}`,
        createdAt: m.used_at || m.created_at,
        icon: <MedicineBoxOutlined />
      }))
    ];
    return combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  }, [reports, vaccinations, medicineUsages]);


  const statsData = [
    {
      title: "Ca bệnh chờ / Đang xử lý",
      value: treatingCases,
      unit: "ca",
      icon: <BugOutlined />,
      type: "pigs",
      trend: "Cần chú ý",
      trendUp: true,
    },
    {
      title: "Tiêm phòng",
      value: vaccineToday,
      unit: "mũi",
      icon: <CalendarOutlined />,
      type: "barn",
      trend: "Đã thực hiện",
      trendUp: true,
    },
  ];

  return (
    <div className="dashboard">
      <PageHeader
        title={`Xin chào, BS. ${user?.full_name || user?.username || 'Bác sĩ'} 🩺`}
        subtitle="Tổng quan công việc và tình trạng sức khỏe đàn lợn"
      />

      <div className="dashboard__maincontent">
        <Spin spinning={loading}>
          {/* STATS ROW */}
          <Row gutter={[20, 20]} className="dashboard-stats">
            {statsData.map((stat, index) => (
              <Col xs={24} sm={12} lg={12} key={index}>
                <Card className={`stat-card stat-card--${stat.type}`}>
                  <div className="stat-card__header">
                    <span className="stat-card__title">{stat.title}</span>
                    <div className="stat-card__icon">{stat.icon}</div>
                  </div>
                  <div className="stat-card__value">
                    {stat.value}
                    <span className="stat-card__label"> {stat.unit}</span>
                  </div>
                  <div className="stat-card__trend stat-card__trend--up">
                    <RiseOutlined />
                    <span>{stat.trend}</span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* ACTIVITIES ROW */}
          <Row style={{ marginTop: 24 }}>
            <Col span={24}>
              <Card className="activity-card">
                <div className="activity-card__header">
                  <h3>Hoạt động & Báo cáo gần đây</h3>
                </div>
                <div className="activity-card__list">
                  <List
                    dataSource={recentActivities}
                    locale={{ emptyText: "Chưa có hoạt động" }}
                    renderItem={(item) => (
                      <div className="activity-card__item" key={item.id}>
                        <div className={`activity-card__icon ${item.type === 'report' ? 'activity-card__icon--task' : 'activity-card__icon--medical'}`}>
                          {item.icon}
                        </div>
                        <div className="activity-card__content">
                          <p><strong>{item.title}</strong>: {item.content}</p>
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
