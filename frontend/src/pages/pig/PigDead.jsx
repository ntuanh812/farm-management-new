import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Card, Tag, Row, Col } from 'antd';
import { PlusOutlined, FallOutlined, TeamOutlined } from '@ant-design/icons';
import axiosClient from '@/utils/axiosClient';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';

const DISPOSAL_METHODS = [
  'Chon lap an toan',
  'Tieu huy sinh hoc (Dot)',
  'Chuyen cho don vi xu ly',
  'Khac'
];

const DISPOSAL_METHODS_LABEL = [
  'Chôn lấp an toàn',
  'Tiêu hủy sinh học (Đốt)',
  'Chuyển cho đơn vị xử lý',
  'Khác'
];

export default function PigDead() {
  const { user } = useAuthStore();

  const [deaths, setDeaths] = useState([]);
  const [pigs, setPigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  // Luu ngay chuyen chuong gan nhat cua con lon dang chon
  const [latestMoveDate, setLatestMoveDate] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FARM_WORKER';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resDeaths, resPigs] = await Promise.all([
        axiosClient.get(`/deaths`).catch(() => ({ data: { data: [] } })),
        axiosClient.get(`/pigs`).catch(() => ({ data: { data: [] } })),
      ]);
      setDeaths(resDeaths.data?.data || []);
      setPigs(resPigs.data?.data || []);
    } catch (error) {
      message.error('Khong the tai du lieu ghi nhan lon chet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activePigs = useMemo(() => {
    return pigs.filter(p => p.lifecycle_status === 'ACTIVE');
  }, [pigs]);

  // Khi nguoi dung chon con lon -> lay lich su chuyen chuong
  const handlePigChange = useCallback(async (pigId) => {
    form.setFieldValue('death_date', null);
    setLatestMoveDate(null);

    if (!pigId) return;

    setLoadingHistory(true);
    try {
      const res = await axiosClient.get(`/pigs/${pigId}/history`);
      if (res.data?.success) {
        const movements = res.data.data?.movements || [];
        // movements da duoc sort desc theo move_date tu backend
        // -> phan tu dau tien la lan chuyen chuong MOI NHAT
        if (movements.length > 0) {
          setLatestMoveDate(movements[0].move_date);
        }
      }
    } catch {
      // Neu goi API loi thi bo qua, van dung entry_date lam fallback
    } finally {
      setLoadingHistory(false);
    }
  }, [form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        death_date: values.death_date.format('YYYY-MM-DD'),
      };
      await axiosClient.post(`/deaths`, payload);
      message.success('Ghi nhan lon chet thanh cong');
      setOpen(false);
      form.resetFields();
      setLatestMoveDate(null);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Co loi xay ra');
    }
  };

  const handleCancel = () => {
    setOpen(false);
    form.resetFields();
    setLatestMoveDate(null);
  };

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Ngày ghi nhận',
      key: 'death_date',
      render: (_, r) => dayjs(r.death_date).format('DD/MM/YYYY'),
    },
    {
      title: 'Mã lợn',
      key: 'pig_id',
      render: (_, r) => {
        const pig = pigs.find(p => p.id === r.pig_id);
        return <strong>PIG{String(pig ? pig.id : (r.pig_id || '')).padStart(3, '0')}</strong>;
      },
    },
    {
      title: 'Chuồng (Lúc chết)',
      key: 'barn_name',
      render: (_, r) => <span>{r.barn_name || '—'}</span>,
    },
    {
      title: 'Nguyên nhân chết',
      key: 'reason',
      render: (_, r) => <span className="text-danger fw-500">{r.reason || '—'}</span>,
    },
    {
      title: 'Phương pháp xử lý xác',
      key: 'disposal_method',
      render: (_, r) => <Tag color="orange">{r.disposal_method || '—'}</Tag>,
    },
    {
      title: 'Người ghi nhận',
      key: 'recorded_by',
      render: (_, r) => <span>{r.recorded_by_name || '—'}</span>,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
    },
  ];

  return (
    <div className="dashboard pig-dead-page">
      <PageHeader
        title="Ghi nhận Lợn chết"
        subtitle="Quản lý và thống kê lợn thiệt hại, phương án tiêu hủy"
        actions={
          canEdit && (
            <Button type="primary" danger icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Ghi nhận thiệt hại
            </Button>
          )
        }
      />

      <div className="dashboard__maincontent">
        <Row gutter={[20, 20]} className="dashboard-stats">
          <Col xs={24} sm={12} lg={12}>
            <Card className="stat-card stat-card--daily-tasks">
              <div className="stat-card__header">
                <span className="stat-card__title">
                  {user?.role === 'FARM_WORKER' ? 'Lợn chết (chuồng quản lý)' : 'Tổng số lợn chết'}
                </span>
                <div className="stat-card__icon">
                  <FallOutlined />
                </div>
              </div>
              <div className="stat-card__value">
                {deaths.length}
                <span className="stat-card__label"> con</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <Card className="stat-card stat-card--pigs">
              <div className="stat-card__header">
                <span className="stat-card__title">
                  {user?.role === 'FARM_WORKER' ? 'Tổng đàn đang quản lý' : 'Tổng đàn hiện tại'}
                </span>
                <div className="stat-card__icon">
                  <TeamOutlined />
                </div>
              </div>
              <div className="stat-card__value">
                {activePigs.length}
                <span className="stat-card__label"> con</span>
              </div>
            </Card>
          </Col>
        </Row>

        <Card className="table-card" style={{ marginTop: 24 }}>
          <Table
            columns={columns}
            dataSource={deaths}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>

        <Modal
          title={<span className="text-danger">Ghi nhận cá thể lợn chết</span>}
          open={open}
          onCancel={handleCancel}
          onOk={handleSubmit}
          okText="Lưu thông tin"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
          footer={canEdit ? undefined : null}
        >
          <Form form={form} layout="vertical" disabled={!canEdit}>
            {/* ── Chọn lợn ── */}
            <Form.Item
              name="pig_id"
              label="Chọn mã lợn"
              rules={[{ required: true, message: 'Vui lòng chọn lợn' }]}
            >
              <Select
                showSearch
                placeholder="Chỉ hiển thị các cá thể lợn đang sống"
                options={activePigs.map(p => ({
                  label: `PIG${String(p.id).padStart(3, '0')} - Chuồng: ${p.barn_name || 'Không rõ'}`,
                  value: p.id,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={handlePigChange}
                loading={loadingHistory}
              />
            </Form.Item>

            {/* ── Ngày chết — giới hạn theo ngày chuyển chuồng gần nhất ── */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.pig_id !== curr.pig_id}>
              {({ getFieldValue }) => {
                const pid = getFieldValue('pig_id');
                const pig = activePigs.find(p => p.id === pid);

                // Ưu tiên: ngày chuyển chuồng gần nhất > ngày nhập trại > không giới hạn
                const minDate = latestMoveDate || pig?.entry_date;
                const minDateLabel = latestMoveDate
                  ? `Từ ngày chuyển chuồng gần nhất: ${dayjs(latestMoveDate).format('DD/MM/YYYY')}`
                  : pig?.entry_date
                  ? `Từ ngày nhập trại: ${dayjs(pig.entry_date).format('DD/MM/YYYY')}`
                  : null;

                return (
                  <Form.Item
                    name="death_date"
                    label={
                      <span>
                        Ngày chết{' '}
                        {minDateLabel && (
                          <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>
                            ({minDateLabel})
                          </span>
                        )}
                      </span>
                    }
                    rules={[{ required: true, message: 'Vui lòng chọn ngày chết' }]}
                  >
                    <DatePicker
                      className="w-100"
                      format="DD/MM/YYYY"
                      disabled={!pid || loadingHistory}
                      placeholder={
                        loadingHistory
                          ? 'Đang kiểm tra lịch sử chuyển chuồng...'
                          : 'Chọn ngày chết'
                      }
                      disabledDate={current =>
                        current &&
                        ((minDate && current < dayjs(minDate).startOf('day')) ||
                          current > dayjs().endOf('day'))
                      }
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            {/* ── Nguyên nhân ── */}
            <Form.Item
              name="reason"
              label="Nguyên nhân (Chẩn đoán)"
              rules={[{ required: true, message: 'Nhập nguyên nhân' }]}
            >
              <Input placeholder="VD: Bệnh dịch tả, Còi cọc..." />
            </Form.Item>

            {/* ── Phương pháp xử lý ── */}
            <Form.Item
              name="disposal_method"
              label="Phương pháp xử lý xác"
              rules={[{ required: true, message: 'Chọn phương pháp' }]}
            >
              <Select
                options={DISPOSAL_METHODS_LABEL.map(t => ({ label: t, value: t }))}
                placeholder="Chọn phương pháp xử lý..."
              />
            </Form.Item>

            {/* ── Ghi chú ── */}
            <Form.Item name="note" label="Ghi chú thêm">
              <Input.TextArea rows={2} placeholder="Ghi chú bổ sung..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}