import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Space, Button, DatePicker, Select, message, Spin, Empty } from 'antd';
import { 
  PrinterOutlined, FileExcelOutlined, FilterOutlined,
  RiseOutlined, FallOutlined, HeartOutlined, WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const COLORS = ['#2d5a27', '#f4a261', '#c44536', '#1890ff', '#8c8c8c'];

export default function FarmReport() {
  const { token } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    stats: { total_pigs: 0, total_barns: 0, sick_pigs: 0, dead_pigs: 0, pregnant_pigs: 0, ready_to_sell: 0 },
    charts: { revenue: [], disease: [], feed: [] }
  });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await axios.get(`${API}/reports-dashboard/overview`, { headers });
        if (data.success) {
          setReportData(data.data);
        }
      } catch (error) {
        message.error('Không thể tải dữ liệu báo cáo');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="farm-report-page">
      <PageHeader
        title="Báo cáo Tình hình Trang trại"
        subtitle="Tổng quan hoạt động chăn nuôi, sức khỏe, và chi phí"
        actions={
          <Space className="no-print">
            <Button icon={<FileExcelOutlined />} className="btn-excel">
              Xuất Excel
            </Button>
            <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
              In Báo cáo
            </Button>
          </Space>
        }
      />

      <div className="px-24 pb-40">
        {/* BỘ LỌC THỜI GIAN */}
        <Card className="filter-card no-print">
          <Space wrap size="middle">
            <span className="fw-500"><FilterOutlined /> Bộ lọc:</span>
            <DatePicker.RangePicker format="DD/MM/YYYY" placeholder={['Từ ngày', 'Đến ngày']} />
            <Select defaultValue="all" className="w-150" options={[
              { label: 'Tất cả chuồng', value: 'all' },
              { label: 'Khu nái sinh sản', value: 'nai' },
              { label: 'Khu lợn thịt', value: 'thit' },
            ]} />
            <Button>Áp dụng</Button>
          </Space>
        </Card>

        <Spin spinning={loading} tip="Đang tổng hợp dữ liệu...">
          {/* STATS CARDS */}
          <Row gutter={[24, 24]} className="mb-24">
            <Col xs={12} sm={12} lg={8} xl={4}>
              <Card className="stat-card stat-card--pigs">
                <div className="stat-card__header">
                  <span className="stat-card__title">Tổng đàn lợn</span>
                </div>
                <div className="stat-card__value">
                  {reportData.stats.total_pigs} <span className="stat-card__label">con</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={8} xl={4}>
              <Card className="stat-card stat-card--barn">
                <div className="stat-card__header">
                  <span className="stat-card__title">Chuồng hoạt động</span>
                </div>
                <div className="stat-card__value">
                  {reportData.stats.total_barns} <span className="stat-card__label">chuồng</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={8} xl={4}>
              <Card className="stat-card stat-card--daily-tasks">
                <div className="stat-card__header">
                  <span className="stat-card__title">Lợn đang bệnh</span>
                </div>
                <div className="stat-card__value text-warning">
                  {reportData.stats.sick_pigs} <span className="stat-card__label">con</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={8} xl={4}>
              <Card className="stat-card border-left-danger">
                <div className="stat-card__header">
                  <span className="stat-card__title">Thiệt hại (Chết)</span>
                </div>
                <div className="stat-card__value text-danger">
                  {reportData.stats.dead_pigs} <span className="stat-card__label">con</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={8} xl={4}>
              <Card className="stat-card stat-card--staff">
                <div className="stat-card__header">
                  <span className="stat-card__title">Nái mang thai</span>
                </div>
                <div className="stat-card__value text-pink">
                  {reportData.stats.pregnant_pigs} <span className="stat-card__label">con</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={8} xl={4}>
              <Card className="stat-card stat-card--pigs">
                <div className="stat-card__header">
                  <span className="stat-card__title">Chuẩn xuất bán</span>
                </div>
                <div className="stat-card__value text-primary">
                  {reportData.stats.ready_to_sell} <span className="stat-card__label">con</span>
                </div>
              </Card>
            </Col>
          </Row>

          {/* BIỂU ĐỒ */}
          <Row gutter={[24, 24]}>
            {/* Biểu đồ Doanh thu (BarChart) */}
            <Col xs={24} lg={16}>
              <Card title="Thống kê Doanh thu xuất bán (6 tháng qua)" bordered={false} className="chart-card">
                {reportData.charts.revenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={reportData.charts.revenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString()} VNĐ`} />
                      <Legend />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#2d5a27" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Chưa có dữ liệu giao dịch" className="mt-100" />
                )}
              </Card>
            </Col>

            {/* Biểu đồ Bệnh phổ biến (PieChart) */}
            <Col xs={24} lg={8}>
              <Card title="Tỷ lệ dịch bệnh phổ biến" bordered={false} className="chart-card">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={reportData.charts.disease}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {reportData.charts.disease.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} ca bệnh`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Biểu đồ Tiêu thụ Cám (LineChart) */}
            <Col xs={24} lg={12}>
              <Card title="Tiêu thụ Thức ăn theo loại" bordered={false} className="chart-card">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.charts.feed} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `${value} kg`} />
                    <Bar dataKey="value" name="Khối lượng (Kg)" fill="#f4a261" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Tóm tắt Báo cáo sinh sản */}
            <Col xs={24} lg={12}>
              <Card title="Cảnh báo & Ghi chú quản trị" bordered={false} className="chart-card">
                <ul className="line-height-2 text-md text-dark">
                  <li>
                    <WarningOutlined className="text-warning" /> Có <strong>{reportData.stats.sick_pigs}</strong> lợn đang được theo dõi điều trị. Đề nghị vệ sinh khu cách ly.
                  </li>
                  <li>
                    <RiseOutlined className="text-primary" /> Hiện có <strong>{reportData.stats.ready_to_sell}</strong> lợn thịt đạt trọng lượng xuất chuồng. Lên lịch báo thương lái.
                  </li>
                  <li>
                    <HeartOutlined className="text-pink" /> Theo dõi <strong>{reportData.stats.pregnant_pigs}</strong> nái đang mang thai, lưu ý lịch dự sinh trong 2 tuần tới.
                  </li>
                </ul>
                
                <div className="mt-30 text-center">
                  <img src="https://cdn-icons-png.flaticon.com/512/1004/1004312.png" alt="pig icon" width={80} className="opacity-20" />
                </div>
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>

      {/* CSS For Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, .sidebar, .topbar { display: none !important; }
          .farm-report-page { padding: 0 !important; }
          .ant-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}} />
    </div>
  );
}