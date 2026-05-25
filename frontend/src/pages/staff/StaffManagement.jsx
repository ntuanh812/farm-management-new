import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Tag, Modal, Form, Input, 
  Select, DatePicker, Switch, message, Popconfirm, Card, Row, Col 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, LockOutlined, 
  UnlockOutlined, KeyOutlined, EyeOutlined, UserAddOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ROLE_CONFIG = {
  ADMIN: { text: 'Quản trị viên', color: 'red' },
  FARM_WORKER: { text: 'Nhân viên', color: 'green' },
  VET_DOCTOR: { text: 'Bác sỹ thú y', color: 'orange' },
};

export default function StaffManagement() {
  const { token } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  // States
  const [staffData, setStaffData] = useState([]);
  const [barns, setBarns] = useState([]);
  const [employeesNoAccount, setEmployeesNoAccount] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);

  // Forms
  const [empForm] = Form.useForm();
  const [accForm] = Form.useForm();

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Giả định backend đã gộp nhân viên + account + chuồng
      const resStaff = await axios.get(`${API}/staff`, { headers });
      if (resStaff.data.success) {
        setStaffData(resStaff.data.data);
      }

      // Lấy danh sách chuồng để phân công
      const resBarns = await axios.get(`${API}/barns`, { headers });
      if (resBarns.data.success) {
        setBarns(resBarns.data.data);
      }

      // Lấy danh sách nhân viên chưa có tài khoản (cho form thêm tài khoản)
      const resEmpNoAcc = await axios.get(`${API}/staff/no-account`, { headers });
      if (resEmpNoAcc.data.success) {
        setEmployeesNoAccount(resEmpNoAcc.data.data);
      }
    } catch (error) {
      message.error('Không thể tải dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleAddEmployee = async (values) => {
    try {
      // Format date
      if (values.dob) values.dob = values.dob.format('YYYY-MM-DD');
      
      await axios.post(`${API}/staff/employees`, values, { headers });
      message.success('Thêm nhân viên thành công!');
      setIsEmpModalOpen(false);
      empForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi thêm nhân viên');
    }
  };

  const handleAddAccount = async (values) => {
    try {
      await axios.post(`${API}/staff/accounts`, values, { headers });
      message.success('Tạo tài khoản thành công!');
      setIsAccModalOpen(false);
      accForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo tài khoản');
    }
  };

  const handleToggleAccount = async (accountId, currentStatus) => {
    if (!accountId) return;
    try {
      const newStatus = currentStatus ? 0 : 1;
      await axios.patch(`${API}/staff/accounts/${accountId}/toggle`, { is_active: newStatus }, { headers });
      message.success(`Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản`);
      fetchData();
    } catch (error) {
      message.error('Không thể thay đổi trạng thái tài khoản');
    }
  };

  const handleResetPassword = async (accountId) => {
    try {
      await axios.post(`${API}/staff/accounts/${accountId}/reset-password`, {}, { headers });
      message.success('Đã reset mật khẩu về mặc định (123456)');
    } catch (error) {
      message.error('Lỗi khi reset mật khẩu');
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (text, record, index) => index + 1,
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.username && (
            <div className="text-xs text-muted">@{record.username}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_, record) => (
        <div className="text-sm">
          <div>📞 {record.phone || 'Chưa cập nhật'}</div>
          <div>✉️ {record.email || 'Chưa cập nhật'}</div>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const config = ROLE_CONFIG[role] || { text: 'Không rõ', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Chuồng quản lý',
      key: 'assigned_barns',
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.barns && record.barns.length > 0 ? (
            record.barns.map(barn => <Tag key={barn.id} color="blue">{barn.name}</Tag>)
          ) : (
            <span className="text-gray">Không phân công</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'is_active',
      render: (_, record) => {
        if (!record.account_id) return <Tag color="default">Chưa có TK</Tag>;
        return (
          <Popconfirm
            title={record.is_active ? "Khóa tài khoản này?" : "Mở khóa tài khoản này?"}
            onConfirm={() => handleToggleAccount(record.account_id, record.is_active)}
          >
            <Switch 
              checked={!!record.is_active} 
              checkedChildren={<UnlockOutlined />} 
              unCheckedChildren={<LockOutlined />}
            />
          </Popconfirm>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EyeOutlined />} title="Xem chi tiết" />
          <Button type="text" icon={<EditOutlined />} className="text-primary" title="Sửa" />
          {record.account_id && (
            <Popconfirm 
              title="Reset mật khẩu về mặc định (123456)?"
              onConfirm={() => handleResetPassword(record.account_id)}
            >
              <Button type="text" icon={<KeyOutlined />} danger title="Reset Mật khẩu" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="staff-management">
      <PageHeader 
        title="Quản lý nhân sự tổng hợp" 
        subtitle="Quản lý thông tin nhân viên, tài khoản đăng nhập và phân công chuồng trại"
        actions={
          <Space>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />} 
              onClick={() => setIsEmpModalOpen(true)}
            >
              Thêm nhân viên
            </Button>
            <Button 
              icon={<PlusOutlined />} 
              onClick={() => setIsAccModalOpen(true)}
            >
              Thêm tài khoản
            </Button>
          </Space>
        }
      />

      <Card className="table-card">
        <Table 
          columns={columns} 
          dataSource={staffData} 
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL THÊM NHÂN VIÊN */}
      <Modal
        title="Thêm nhân viên mới"
        open={isEmpModalOpen}
        onCancel={() => { setIsEmpModalOpen(false); empForm.resetFields(); }}
        onOk={() => empForm.submit()}
        width={800}
        okText="Lưu thông tin"
        cancelText="Hủy"
      >
        <Form form={empForm} layout="vertical" onFinish={handleAddEmployee}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                <Input placeholder="Nhập họ và tên..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
                <Select placeholder="Chọn vai trò">
                  <Select.Option value="FARM_WORKER">Nhân viên chăn nuôi</Select.Option>
                  <Select.Option value="VET_DOCTOR">Bác sỹ thú y</Select.Option>
                  <Select.Option value="ADMIN">Quản trị viên (Admin)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}>
                <Input placeholder="Nhập số điện thoại..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
                <Input placeholder="Nhập email..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gender" label="Giới tính">
                <Select placeholder="Chọn giới tính">
                  <Select.Option value="NAM">Nam</Select.Option>
                  <Select.Option value="NU">Nữ</Select.Option>
                  <Select.Option value="KHAC">Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dob" label="Ngày sinh">
                <DatePicker className="w-100" format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="barn_ids" label="Phân công chuồng (Dành cho NV/Bác sỹ)">
            <Select 
              mode="multiple" 
              placeholder="Chọn các chuồng được phép quản lý"
              options={barns.map(b => ({ label: b.name, value: b.id }))}
            />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ cư trú..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL THÊM TÀI KHOẢN MỚI */}
      <Modal
        title="Tạo tài khoản đăng nhập"
        open={isAccModalOpen}
        onCancel={() => { setIsAccModalOpen(false); accForm.resetFields(); }}
        onOk={() => accForm.submit()}
        width={600}
        okText="Tạo tài khoản"
        cancelText="Hủy"
      >
        <Form form={accForm} layout="vertical" onFinish={handleAddAccount}>
          <Form.Item 
            name="employee_id" 
            label="Chọn nhân viên liên kết" 
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select 
              showSearch
              placeholder="Chọn nhân viên chưa có tài khoản"
              options={employeesNoAccount.map(e => ({ label: `${e.full_name} (${e.role})`, value: e.id }))}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>

          <Form.Item 
            name="username" 
            label="Tên đăng nhập (Username)" 
            rules={[{ required: true, message: 'Vui lòng nhập username' }]}
          >
            <Input placeholder="Ví dụ: nhanvien_01" />
          </Form.Item>

          <Form.Item 
            name="password" 
            label="Mật khẩu" 
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu..." />
          </Form.Item>

          <Form.Item 
            name="confirm_password" 
            label="Xác nhận mật khẩu" 
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};