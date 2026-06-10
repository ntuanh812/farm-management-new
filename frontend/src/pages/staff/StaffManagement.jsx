import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Table, Button, Space, Tag, Modal, Form, Input, 
  Select, DatePicker, Switch, message, Popconfirm, Card, Row, Col, Upload, Avatar 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, LockOutlined,
  UnlockOutlined, KeyOutlined, UserAddOutlined, UploadOutlined, UserOutlined, DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROLE_CONFIG } from '@/utils/constants';
import { AvatarUpload } from '@/components/common/AvatarUpload';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function StaffManagement() {
  const { token } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // States
  const [staffData, setStaffData] = useState([]);
  const [barns, setBarns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [fileList, setFileList] = useState([]);

  // Forms
  const [staffForm] = Form.useForm();

  // Fetch Data
  const fetchData = useCallback(async () => {
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
    } catch (error) {
      message.error('Không thể tải dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers

  const handleSaveStaff = async (values) => {
    try {
      // Format date
      if (values.dob) values.dob = values.dob.format('YYYY-MM-DD');
      
      // Chuẩn hóa SĐT trước khi gửi (Loại bỏ khoảng trắng, dấu chấm, dấu gạch ngang)
      if (values.phone) values.phone = String(values.phone).replace(/[\s-.]/g, '');

      // Lấy URL của Avatar nếu có
      let avatarUrl = null;
      if (fileList.length > 0) {
        const file = fileList[0];
        if (file.originFileObj && !file.url) {
          // Tiến hành Upload ảnh lên server KHI BẤM LƯU
          const formData = new FormData();
          formData.append('file', file.originFileObj);
          const uploadRes = await axios.post(`${API}/staff/upload`, formData, {
            headers: { ...headers, 'Content-Type': 'multipart/form-data' },
          });
          avatarUrl = uploadRes.data.data;
        } else if (file.url) {
          avatarUrl = file.url.replace('http://localhost:3000', '');
        }
      }
      values.avatar = avatarUrl || null;

      let staffId = editingStaff?.id;

      if (editingStaff) {
        await axios.put(`${API}/staff/${editingStaff.id}`, values, { headers });
        message.success('Cập nhật nhân sự thành công!');
      } else {
        const res = await axios.post(`${API}/staff`, values, { headers });
        staffId = res.data.data?.id;
        message.success('Thêm nhân sự thành công!');
      }

      // Gọi API tạo tài khoản nếu Admin có nhập username và password trên form Thêm mới
      if (!editingStaff?.account_id && staffId && values.username && values.password) {
        await axios.post(`${API}/staff/accounts`, {
          staff_id: staffId,
          username: values.username,
          password: values.password
        }, { headers });
        message.success('Tạo tài khoản đăng nhập thành công!');
      }

      setIsStaffModalOpen(false);
      setEditingStaff(null);
      staffForm.resetFields();
      setFileList([]);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi lưu nhân sự');
    }
  };

  const handleCancelModal = async () => {
    // Thu hồi URL tạm thời để tránh memory leak
    fileList.forEach(file => {
      if (file.thumbUrl) URL.revokeObjectURL(file.thumbUrl);
    });

    setIsStaffModalOpen(false);
    setEditingStaff(null);
    staffForm.resetFields();
    setFileList([]);
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

  const handleEdit = (record) => {
    setEditingStaff(record);
    setFileList(record.avatar ? [{ uid: '-1', name: 'avatar.png', status: 'done', url: `http://localhost:3000${record.avatar}` }] : []);
    staffForm.setFieldsValue({
      ...record,
      dob: record.dob ? dayjs(record.dob) : null,
      barn_ids: record.barns ? record.barns.map(b => b.id) : [],
    });
    setIsStaffModalOpen(true);
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
      title: 'Nhân sự',
      key: 'staff_info',
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar ? `http://localhost:3000${record.avatar}` : null} icon={<UserOutlined />} />
          <strong>{record.full_name}</strong>
        </Space>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => text ? <span className="staff-management__username-highlight">@{text}</span> : <span className="text-muted">Chưa có</span>,
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
      dataIndex: 'role_code',
      key: 'role_code',
      render: (role_code) => {
        const config = ROLE_CONFIG[role_code] || { text: 'Không rõ', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Chuồng quản lý',
      key: 'assigned_barns',
      render: (_, record) => {
        if (record.role_code === 'ADMIN' || record.role_code === 'VET_DOCTOR') {
          return <span className="text-muted staff-management__dash">-</span>;
        }
        return (
          <Space size={[0, 4]} wrap>
            {record.barns && record.barns.length > 0 ? (
              record.barns.map(barn => <Tag key={barn.id} color="blue">{barn.name}</Tag>)
            ) : (
              <span className="text-gray">Không phân công</span>
            )}
          </Space>
        );
      },
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
          <Button type="text" icon={<EditOutlined />} className="text-primary" title="Sửa" onClick={() => handleEdit(record)} />
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
        subtitle="Quản lý thông tin nhân sự, tài khoản đăng nhập và phân công chuồng trại"
        actions={
          <Space>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />} 
              onClick={() => {
                setEditingStaff(null);
                staffForm.resetFields();
                setFileList([]);
                setIsStaffModalOpen(true);
              }}
            >
              Thêm nhân sự
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

      {/* MODAL THÊM NHÂN SỰ */}
      <Modal
        title={editingStaff ? "Cập nhật nhân sự" : "Thêm nhân sự mới"}
        open={isStaffModalOpen}
        onCancel={handleCancelModal}
        onOk={() => staffForm.submit()}
        width={800}
        okText="Lưu thông tin"
        cancelText="Hủy"
      >
        <Form form={staffForm} layout="vertical" onFinish={handleSaveStaff}>
          <AvatarUpload fileList={fileList} setFileList={setFileList} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                <Input placeholder="Nhập họ và tên..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role_id" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
                <Select placeholder="Chọn vai trò">
                  <Select.Option value={2}>Nhân viên chăn nuôi</Select.Option>
                  <Select.Option value={3}>Bác sỹ thú y</Select.Option>
                  <Select.Option value={1}>Quản trị viên (Admin)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="phone" 
                label="Số điện thoại" 
                rules={[
                  { required: true, message: 'Vui lòng nhập SĐT' },
                  { pattern: /^(\+84|0)[0-9\s-.]{8,12}$/, message: 'SĐT không hợp lệ (Bắt đầu bằng 0 hoặc +84)' },
                  () => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      const cleanVal = String(value).replace(/[\s-.]/g, '');
                      const exists = staffData.find(s => s.phone === cleanVal);
                      if (exists && exists.id !== editingStaff?.id) {
                        return Promise.reject(new Error('Số điện thoại này đã được sử dụng!'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
                <Input placeholder="Nhập số điện thoại..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="email" 
                label="Email" 
                rules={[
                  { type: 'email', message: 'Email không hợp lệ' },
                  () => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      const exists = staffData.find(s => s.email === value);
                      if (exists && exists.id !== editingStaff?.id) {
                        return Promise.reject(new Error('Email này đã được sử dụng!'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
                <Input placeholder="Nhập email..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gender" label="Giới tính">
                <Select placeholder="Chọn giới tính">
                  <Select.Option value="male">Nam</Select.Option>
                  <Select.Option value="female">Nữ</Select.Option>
                  <Select.Option value="other">Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dob" label="Ngày sinh">
                <DatePicker className="w-100" format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.role_id !== curr.role_id}>
            {({ getFieldValue }) => {
              const roleId = getFieldValue('role_id');
              if (roleId === 1 || roleId === 3) return null; // Ẩn nếu là Admin hoặc Bác sĩ thú y
              return (
                <Form.Item name="barn_ids" label="Phân công chuồng (Dành cho Nhân viên chăn nuôi)">
                  <Select 
                    mode="multiple" 
                    placeholder="Chọn các chuồng được phép quản lý"
                    options={barns.map(b => ({ label: b.name, value: b.id }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ cư trú..." />
          </Form.Item>

          {!editingStaff?.account_id && (
            <div className="staff-management__account-box">
              <div className="staff-management__account-title">Thông tin tài khoản đăng nhập</div>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item 
                    name="username" 
                    label="Tên đăng nhập (Username)" 
                    rules={[
                      { required: true, message: 'Vui lòng nhập username' },
                      () => ({
                        validator(_, value) {
                          if (!value) return Promise.resolve();
                          const exists = staffData.find(s => s.username === value);
                          if (exists) {
                            return Promise.reject(new Error('Tên đăng nhập này đã tồn tại!'));
                          }
                          return Promise.resolve();
                        }
                      })
                    ]}
                  >
                    <Input placeholder="Ví dụ: nhanvien_01" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
                    <Input.Password placeholder="Nhập mật khẩu..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
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
                </Col>
              </Row>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};