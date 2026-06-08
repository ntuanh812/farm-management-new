import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Col, Row, Table, Typography, Spin, message, Divider, Form, DatePicker, Button } from 'antd';
import {
  DollarOutlined,
  FallOutlined,
  HomeOutlined,
  WarningOutlined,
  RiseOutlined,
  SearchOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CATEGORY_MAP = {
  'SOW': 'Lợn nái',
  'BOAR': 'Lợn đực',
  'PIGLET': 'Lợn con',
  'FATTENING': 'Lợn thịt'
};

export default function FarmReport() {
  const { token } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    active_pigs: [],
    dead_pigs: 0,
    sold_pigs: 0,
    revenue: 0,
    barn_stats: { total_barns: 0, total_capacity: 0 },
    feed_usage: [],
    pending_reports: 0,
    revenue_trend: [],
    vaccine_stats: [],
    medicine_usage: []
  });

  const fetchReportData = useCallback(async (values = {}) => {
    setLoading(true);
    try {
      let params = {};
      if (values.dateRange && values.dateRange.length === 2) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD');
        params.endDate = values.dateRange[1].format('YYYY-MM-DD');
      }

      const res = await axios.get(`${API}/reports/farm-overview`, { headers, params });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      message.error('Không thể tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Map dữ liệu loại lợn sang tiếng Việt
  const activePigsMapped = (data.active_pigs || []).map(p => ({
    ...p,
    categoryName: CATEGORY_MAP[p.category] || p.category
  }));

  const totalActivePigs = activePigsMapped.reduce((sum, item) => sum + item.count, 0);

  // Tự động quét và chuẩn hóa dữ liệu Cám từ Backend
  const feedUsageMapped = useMemo(() => {
    // Quét các key có thể có từ backend
    const rawData = data.feed_usage || data.feedUsage || data.bran_usage || [];
    
    return rawData.map(item => ({
      ...item,
      displayName: item.feed_name || item.feed_type || item.name || item.feedName || item.bran_name || 'Không rõ',
      displayValue: Number(item.total_kg || item.quantity_kg || item.total_quantity || item.quantity || item.total || 0)
    }));
  }, [data]);

  const vaccineColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    { title: 'Tên Vaccine', dataIndex: 'vaccine_name', key: 'vaccine_name' },
    { 
      title: 'Số mũi đã tiêm', 
      dataIndex: 'total_doses', 
      key: 'total_doses',
      render: (val) => <Text strong>{Number(val).toLocaleString('vi-VN')} mũi</Text>
    }
  ];

  return (
    <div className="dashboard farm-report-page">
      <PageHeader 
        title="Báo cáo thống kê tổng quan" 
        subtitle="Theo dõi tình hình hoạt động, tài chính và rủi ro của trang trại"
      />

      {/* Form Lọc bằng Antd */}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={fetchReportData}>
          <Form.Item name="dateRange" label="Thời gian lọc (Xuất bán, Lợn chết, Vật tư, Thuốc, Tiêm phòng)">
            <RangePicker format="DD/MM/YYYY" placeholder={['Từ ngày', 'Đến ngày']} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} style={{ background: '#2d5a27' }}>
              Thống kê
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Spin spinning={loading} tip="Đang tổng hợp dữ liệu báo cáo...">
        <Row gutter={[20, 20]} className="dashboard-stats mb-24">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--pigs">
              <div className="stat-card__header">
                <span className="stat-card__title">Tổng lợn đang nuôi</span>
                <div className="stat-card__icon"><TeamOutlined /></div>
              </div>
              <div className="stat-card__value">
                {totalActivePigs}
                <span className="stat-card__label"> con</span>
              </div>
              <div className="stat-card__trend stat-card__trend--up" style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={activePigsMapped.map(p => `${p.categoryName}: ${p.count}`).join(' | ')}>
                <RiseOutlined />
                <span>{activePigsMapped.length > 0 ? activePigsMapped.map(p => `${p.categoryName}: ${p.count}`).join(' | ') : 'Chưa có lợn trong chuồng'}</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--daily-tasks">
              <div className="stat-card__header">
                <span className="stat-card__title">Doanh thu xuất bán</span>
                <div className="stat-card__icon"><DollarOutlined /></div>
              </div>
              <div className="stat-card__value">
                {Math.round(Number(data.revenue || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                <span className="stat-card__label"> VNĐ</span>
              </div>
              <div className="stat-card__trend stat-card__trend--up">
                <RiseOutlined />
                <span>Đã xuất bán {data.sold_pigs} con lợn thịt</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--staff">
              <div className="stat-card__header">
                <span className="stat-card__title">Số lượng lợn chết</span>
                <div className="stat-card__icon"><FallOutlined /></div>
              </div>
              <div className="stat-card__value">
                {data.dead_pigs}
                <span className="stat-card__label"> con</span>
              </div>
              <div className="stat-card__trend stat-card__trend--down">
                <FallOutlined />
                <span>Cần theo dõi chặt chẽ rủi ro</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card--barn">
              <div className="stat-card__header">
                <span className="stat-card__title">Cảnh báo sức khỏe</span>
                <div className="stat-card__icon"><WarningOutlined /></div>
              </div>
              <div className="stat-card__value">
                {data.pending_reports}
                <span className="stat-card__label"> báo cáo</span>
              </div>
              <div className="stat-card__trend stat-card__trend--down">
                <WarningOutlined />
                <span>Báo cáo bệnh chờ bác sĩ xử lý</span>
              </div>
            </Card>
          </Col>
        </Row>
        <Divider/>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Cơ cấu đàn lợn hiện tại" bordered={false} style={{ height: '100%' }}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activePigsMapped}
                      cx="50%" cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="categoryName"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {activePigsMapped.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value} con`, 'Số lượng']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Tỷ lệ trạng thái toàn trại" bordered={false} style={{ height: '100%' }}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Đang nuôi', count: totalActivePigs },
                        { name: 'Đã xuất bán', count: data.sold_pigs },
                        { name: 'Đã chết', count: data.dead_pigs }
                      ].filter(item => item.count > 0)}
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[{ name: 'Đang nuôi', count: totalActivePigs }, { name: 'Đã xuất bán', count: data.sold_pigs }, { name: 'Đã chết', count: data.dead_pigs }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3f8600', '#1890ff', '#d04444'][index]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value} con`, 'Số lượng']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>
        <Divider />
        <Row gutter={[16, 16]}>
          {/* 2. Biểu đồ Doanh thu (Chi tiết theo ngày) */}
          <Col xs={24} lg={12}>
            <Card title="Doanh thu xuất bán (Chi tiết theo ngày)" bordered={false} style={{ height: '100%' }}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.revenue_trend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(val) => `${(Number(val) / 1000000).toFixed(0)}M`} />
                    <RechartsTooltip formatter={(value) => [`${Math.round(Number(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} VNĐ`, 'Doanh thu']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#cf1322" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Tiêu thụ thức ăn / cám" bordered={false} style={{ height: '100%' }}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feedUsageMapped} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayName" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => [`${value} kg`, 'Khối lượng']} />
                    <Legend />
                    <Bar dataKey="displayValue" name="Khối lượng đã dùng" fill="#82ca9d" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

        </Row>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Thống kê sử dụng thuốc & vật tư thú y" bordered={false} style={{ height: '100%' }}>
              <Table 
                dataSource={data.medicine_usage} 
                columns={[
                  {
                    title: 'STT',
                    key: 'index',
                    width: 60,
                    render: (_, __, index) => index + 1,
                  },
                  { title: 'Tên thuốc / Vật tư', dataIndex: 'medicine_name', key: 'medicine_name' },
                  { 
                    title: 'Số lượng đã dùng', 
                    key: 'total_quantity',
                    render: (_, r) => <Text strong>{Number(r.total_quantity).toLocaleString('vi-VN')} {r.unit}</Text>
                  }
                ]} 
                pagination={{ pageSize: 5 }}
                rowKey="medicine_name"
                locale={{ emptyText: 'Không có dữ liệu sử dụng thuốc trong khoảng thời gian này' }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Chiến dịch tiêm phòng" bordered={false} style={{ height: '100%' }}>
              <Table 
                dataSource={data.vaccine_stats} 
                columns={vaccineColumns} 
                pagination={{ pageSize: 5 }}
                rowKey="vaccine_name"
                locale={{ emptyText: 'Không có dữ liệu tiêm phòng trong khoảng thời gian này' }}
              />
            </Card>
          </Col>
        </Row>

        
      </Spin>
    </div>
  );
}