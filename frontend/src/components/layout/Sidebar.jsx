import { useNavigate, useLocation } from 'react-router-dom'
import {
  ProfileOutlined, LogoutOutlined, HeartOutlined, UsergroupAddOutlined,
  MedicineBoxOutlined, SwapRightOutlined, CloseCircleOutlined,
  IdcardOutlined, ClockCircleOutlined, ShoppingCartOutlined,
  HomeOutlined, TeamOutlined, UserOutlined, BugOutlined, FileImageOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { Menu, Button } from 'antd'
import { useAuthStore } from '@/store/authStore'

// ── Menu ADMIN ────────────────────────────────────────────
const ADMIN_MENU = [
  { key: '/dashboard', label: '🏠 Tổng quan' },
  {
    key: 'pigmanage', label: '🐷 Quản lý lợn',
    children: [
      { key: '/pigmanage',                label: 'Danh sách lợn',   icon: <ProfileOutlined /> },
      { key: '/pigmanage/barns',          label: 'Chuồng trại',     icon: <HomeOutlined /> },
      { key: '/pigmanage/pigsty-history', label: 'Chuyển chuồng',   icon: <SwapRightOutlined /> },
      { key: '/pigmanage/pig-dead',       label: 'Lợn chết',        icon: <CloseCircleOutlined /> },
      { key: '/pigmanage/pig-fattening',  label: 'Xuất bán',   icon: <IdcardOutlined /> },
    ],
  },
  {
    key: 'reproduction', label: '🐣 Sinh sản',
    children: [
      { key: '/breeding/pig-breeding',  label: 'Phối giống', icon: <HeartOutlined /> },
      { key: '/breeding/pig-farrowing', label: 'Đẻ con',     icon: <UsergroupAddOutlined /> },
    ],
  },
  {
    key: 'materials', label: '🍽️ Vật tư',
    children: [
      { key: '/materials/bran',     label: 'Thức ăn (Cám)', icon: <ShoppingCartOutlined /> },
      { key: '/materials/medicine', label: 'Thuốc',         icon: <MedicineBoxOutlined /> },
    ],
  },
  {
    key: 'health', label: '💊 Thú y & Sức khỏe',
    children: [
      { key: '/health/vaccine',       label: 'Tiêm phòng',      icon: <ClockCircleOutlined /> },
      { key: '/reports/pig-report',   label: 'Báo cáo lợn bệnh', icon: <FileImageOutlined /> },
    ],
  },
  { key: '/staff/management', label: '👥 Quản lý nhân sự', icon: <TeamOutlined /> },
  { key: '/reports/farm-report', label: '📊 Báo cáo thống kê', icon: <BarChartOutlined /> },
]

// ── Menu FARM_WORKER ──────────────────────────────────────
const STAFF_MENU = [
  { key: '/staff/dashboard', label: '🏠 Tổng quan' },
  {
    key: 'pigmanage', label: '🐷 Quản lý lợn',
    children: [
      { key: '/staff/pig/manage',   label: 'Danh sách lợn',   icon: <ProfileOutlined /> },
      { key: '/staff/pig/barns',    label: 'Chuồng trại',     icon: <HomeOutlined /> },
      { key: '/staff/pig/history',  label: 'Chuyển chuồng',   icon: <SwapRightOutlined /> },
      { key: '/staff/pig/dead',     label: 'Lợn chết',        icon: <CloseCircleOutlined /> },
      { key: '/staff/pig/fattening',label: 'Xuất bán',          icon: <IdcardOutlined /> },
    ],
  },
  {
    key: 'reproduction', label: '🐣 Sinh sản',
    children: [
      { key: '/staff/reproduction/breeding',  label: 'Phối giống', icon: <HeartOutlined /> },
      { key: '/staff/reproduction/farrowing', label: 'Đẻ con',     icon: <UsergroupAddOutlined /> },
    ],
  },
  {
    key: 'materials', label: '🍽️ Vật tư',
    children: [
      { key: '/staff/materials/bran', label: 'Thức ăn (Cám)', icon: <ShoppingCartOutlined /> },
    ],
  },
  {
    key: 'health', label: '💊 Thú y & Sức khỏe',
    children: [
      { key: '/staff/health/vaccine', label: 'Tiêm phòng', icon: <ClockCircleOutlined /> },
      { key: '/staff/reports/pig-report', label: 'Báo cáo lợn bệnh', icon: <FileImageOutlined /> },
    ],
  },
]

// ── Menu VET_DOCTOR ───────────────────────────────────────
const VET_MENU = [
  { key: '/vet/dashboard', label: '🏠 Tổng quan' },
  {
    key: 'pigmanage', label: '🐷 Quản lý lợn',
    children: [
      { key: '/vet/pig/manage', label: 'Danh sách lợn', icon: <ProfileOutlined /> },
    ],
  },
  {
    key: 'health', label: '🩺 Thú y & Sức khỏe',
    children: [
      { key: '/vet/health/vaccine',       label: 'Tiêm phòng',      icon: <ClockCircleOutlined /> },
      { key: '/vet/materials/medicine',   label: 'Quản lý Thuốc',   icon: <MedicineBoxOutlined /> },
      { key: '/vet/reports/review',       label: 'Phản hồi báo cáo', icon: <FileImageOutlined /> },
    ],
  },
]

// Chọn menu theo role
function getMenuByRole(role) {
  if (role === 'ADMIN')       return ADMIN_MENU
  if (role === 'FARM_WORKER') return STAFF_MENU
  if (role === 'VET_DOCTOR')  return VET_MENU
  return []
}

export const Sidebar = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout } = useAuthStore()

  const menuItems = getMenuByRole(user?.role)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="sidebar">
      <div className="sidebar__header" onClick={() => navigate('/')}>
        <div className="sidebar__logo-mark">🐷</div>
        <div className="sidebar__logo-text">
          <span className="sidebar__logo-title">FarmPro</span>
          <span className="sidebar__logo-subtitle">Pig</span>
        </div>
      </div>

      <Menu
        onClick={(e) => navigate(e.key)}
        style={{ width: 256 }}
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['pigmanage', 'reproduction', 'materials', 'health']}
        mode="inline"
        items={menuItems}
      />

      <div className="sidebar__footer">
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="sidebar__logout-btn"
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  )
}
