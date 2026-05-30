import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layout
import { AppLayout } from '@/components/layout/AppLayout'

// Auth pages
import { Login } from '@/pages/auth/Login'

// Dashboard
import { DashBoard } from '@/pages/dashboard/DashBoard'
import StaffDashboard from '@/pages/dashboard/StaffDashboard'
import VetDashboard from '@/pages/dashboard/VetDashboard'

// Pig management
import PigManage from '@/pages/pig/PigManage'
import PigBarns from '@/pages/pig/PigBarns'
import PigstyHistory from '@/pages/pig/PigstyHistory'
import PigDead from '@/pages/pig/PigDead'
import PigFattening from '@/pages/pig/PigFattening'

// Reproduction
import PigBreeding from '@/pages/reproduction/PigBreeding'
import PigFarrowing from '@/pages/reproduction/PigFarrowing'

// Materials
import BranUsage from '@/pages/materials/Bran'
import MedicineUsage from '@/pages/materials/Medicine'

// Health
import PigVaccination from '@/pages/health/PigVaccination'


// Staff
import StaffManagement from '@/pages/staff/StaffManagement'

// Reports
import PigReport from '@/pages/reports/PigReport'
import VetReview from '@/pages/reports/VetReview'
import FarmReport from '@/pages/reports/FarmReport'

// ── PrivateRoute: kiểm tra đăng nhập + quyền role ────────
// roles = [] => chỉ cần đăng nhập, không cần role cụ thể
function PrivateRoute({ children, roles = [] }) {
  const { token, user } = useAuthStore()

  // Kiểm tra chặt chẽ token và thông tin user (phòng trường hợp local storage lưu chuỗi 'null' hoặc bị hỏng)
  const isAuthenticated = token && token !== 'null' && user && user.role;

  // Chưa đăng nhập → về login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Không đủ quyền 
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

// ── RootRedirect: Điều hướng trang chủ (/) theo role ────────
function RootRedirect() {
  const { token, user } = useAuthStore()
  
  const isAuthenticated = token && token !== 'null' && user && user.role;
  if (!isAuthenticated) return <Navigate to="/login" replace />

  switch (user.role) {
    case 'ADMIN': return <Navigate to="/dashboard" replace />
    case 'FARM_WORKER': return <Navigate to="/staff/dashboard" replace />
    case 'VET_DOCTOR': return <Navigate to="/vet/dashboard" replace />
    default: return <Navigate to="/login" replace />
  }
}

// ── UnauthorizedPage: Giao diện báo lỗi không có quyền ────────
function UnauthorizedPage() {
  const { token, user } = useAuthStore()
  const isAuthenticated = token && token !== 'null' && user && user.role;

  return (
    <div style={{ textAlign: 'center', padding: 100 }}>
      <h2 style={{ color: '#cf1322' }}>⛔ Bạn không có quyền truy cập trang này</h2>
      <p style={{ fontSize: 16, marginBottom: 24, color: '#555' }}>
        {isAuthenticated 
          ? 'Tài khoản của bạn không được phân quyền để xem thông tin tại đường dẫn này.'
          : 'Vui lòng đăng nhập bằng tài khoản có quyền phù hợp để tiếp tục.'}
      </p>
      <Link to={isAuthenticated ? "/" : "/login"} style={{ padding: '10px 24px', background: '#2d5a27', color: '#fff', textDecoration: 'none', borderRadius: 8, fontWeight: 500 }}>
        {isAuthenticated ? 'Quay về Bảng điều khiển' : 'Quay lại trang Đăng nhập'}
      </Link>
    </div>
  )
}

export const AppRouter = () => {
  return (
    <Routes>
      {/* ── Public routes ───────────────────────────────── */}
      <Route path="/login"           element={<Login />} />

      {/* ── ADMIN routes ────────────────────────────────── */}
      <Route element={
        <PrivateRoute roles={['ADMIN']}>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/dashboard"              element={<DashBoard />} />
        <Route path="/pigmanage/barns"        element={<PigBarns />} />
        <Route path="/pigmanage"              element={<PigManage />} />
        <Route path="/pigmanage/pigsty-history" element={<PigstyHistory />} />
        <Route path="/pigmanage/pig-dead"     element={<PigDead />} />
        <Route path="/pigmanage/pig-fattening" element={<PigFattening />} />
        <Route path="/breeding/pig-breeding"  element={<PigBreeding />} />
        <Route path="/breeding/pig-farrowing" element={<PigFarrowing />} />
        <Route path="/materials/bran"         element={<BranUsage />} />
        <Route path="/materials/medicine"     element={<MedicineUsage />} />
        <Route path="/health/vaccine"         element={<PigVaccination />} />
        <Route path="/staff/management"       element={<StaffManagement />} />
        <Route path="/reports/pig-report"     element={<PigReport />} />
        <Route path="/reports/farm-report"    element={<FarmReport />} />
      </Route>

      {/* ── FARM_WORKER routes ──────────────────────────── */}
      <Route element={
        <PrivateRoute roles={['FARM_WORKER']}>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/staff/dashboard"             element={<StaffDashboard />} />
        <Route path="/staff/pig/barns"             element={<PigBarns />} />
        <Route path="/staff/pig/manage"            element={<PigManage />} />
        <Route path="/staff/pig/history"           element={<PigstyHistory />} />
        <Route path="/staff/pig/dead"              element={<PigDead />} />
        <Route path="/staff/pig/fattening"         element={<PigFattening />} />
        <Route path="/staff/reproduction/breeding" element={<PigBreeding />} />
        <Route path="/staff/reproduction/farrowing" element={<PigFarrowing />} />
        <Route path="/staff/materials/bran"        element={<BranUsage />} />
        <Route path="/staff/health/vaccine"        element={<PigVaccination />} />
        <Route path="/staff/reports/pig-report"    element={<PigReport />} />
      </Route>

      {/* ── VET_DOCTOR routes ───────────────────────────── */}
      <Route element={
        <PrivateRoute roles={['VET_DOCTOR']}>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/vet/dashboard"                element={<VetDashboard />} />
        <Route path="/vet/pig/manage"               element={<PigManage />} />
        <Route path="/vet/materials/medicine"       element={<MedicineUsage />} />
        <Route path="/vet/health/vaccine"           element={<PigVaccination />} />
        <Route path="/vet/reports/review"            element={<VetReview />} />
      </Route>

      {/* ── Trang không có quyền ─────────────────────────── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── Mặc định ─────────────────────────────────────── */}
      <Route path="/" element={<RootRedirect />} />

      {/* ── Bắt các URL không tồn tại (404) ─────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
