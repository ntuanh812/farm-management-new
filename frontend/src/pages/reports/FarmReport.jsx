import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Space, Spin, message, Divider, Form, DatePicker, Button } from 'antd';
import {
  DollarOutlined,
  FallOutlined,
  HomeOutlined,
  WarningOutlined,
  RiseOutlined,
  SearchOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function FarmReport() {
  const { token } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    activePigs: [],
    deadPigs: 0,
    soldPigs: 0,
    revenue: 0,
    barnStats: { total_barns: 0, total_capacity: 0 },
    feedUsage: [],
    pendingReports: 0
  });

  const fetchReportData = async (values = {}) => {
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
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const totalActivePigs = data.activePigs.reduce((sum, item) => sum + item.count, 0);

  const feedColumns = [
    { title: 'Loại cám / Thức ăn', dataIndex: 'feed_type', key: 'feed_type' },
    { 
      title: 'Khối lượng đã dùng', 
      dataIndex: 'total_kg', 
      key: 'total_kg',
      render: (val) => <Text strong>{Number(val).toLocaleString('vi-VN')} kg</Text>
    }
  ];

  return (
    <div className="farm-report-page">
      <PageHeader 
        title="Báo cáo thống kê tổng quan" 
        subtitle="Theo dõi tình hình hoạt động, tài chính và rủi ro của trang trại"
      />

      {/* Form Lọc bằng Antd */}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={fetchReportData}>
          <Form.Item name="dateRange" label="Thời gian lọc (Xuất bán, Lợn chết, Vật tư)">
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
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false}>
              <Statistic
                title="Tổng lợn đang nuôi"
                value={totalActivePigs}
                valueStyle={{ color: '#3f8600' }}
                prefix={<RiseOutlined />}
                suffix="con"
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
                {data.activePigs.map(p => `${p.category}: ${p.count}`).join(' | ')}
                {data.activePigs.length === 0 && 'Chưa có lợn trong chuồng'}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false}>
              <Statistic
                title="Doanh thu xuất bán"
                value={data.revenue}
                valueStyle={{ color: '#cf1322' }}
                prefix={<DollarOutlined />}
                suffix="VNĐ"
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
                Đã xuất bán {data.soldPigs} con lợn thịt
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false}>
              <Statistic
                title="Số lượng lợn chết"
                value={data.deadPigs}
                valueStyle={{ color: '#d04444' }}
                prefix={<FallOutlined />}
                suffix="con"
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
                Cần theo dõi chặt chẽ rủi ro dịch bệnh
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false}>
              <Statistic
                title="Cảnh báo sức khỏe"
                value={data.pendingReports}
                valueStyle={{ color: '#faad14' }}
                prefix={<WarningOutlined />}
                suffix="báo cáo"
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
                Báo cáo bệnh chờ bác sĩ xử lý
              </div>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Tình trạng chuồng trại" bordered={false} style={{ height: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Statistic 
                  title="Số lượng chuồng đang hoạt động" 
                  value={data.barnStats?.total_barns || 0} 
                  prefix={<HomeOutlined />} 
                />
                <div>
                  <Text type="secondary">Công suất sử dụng toàn trang trại:</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                    <Text strong style={{ fontSize: 24, color: totalActivePigs > (data.barnStats?.total_capacity || 0) ? 'red' : 'inherit' }}>
                      {totalActivePigs}
                    </Text> 
                    <Text type="secondary">/ {data.barnStats?.total_capacity || 0} con</Text>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Tiêu thụ vật tư (Thức ăn/Cám)" bordered={false} bodyStyle={{ padding: 0 }} style={{ height: '100%' }}>
              <Table 
                dataSource={data.feedUsage} 
                columns={feedColumns} 
                pagination={false}
                rowKey="feed_type"
                locale={{ emptyText: 'Không có dữ liệu tiêu thụ vật tư trong khoảng thời gian này' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}