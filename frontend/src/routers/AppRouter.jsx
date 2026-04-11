import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layout
import { AppLayout } from '@/components/layout/AppLayout'

// Auth pages
import { Login } from '@/pages/auth/Login'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { VerifyOtp } from '@/pages/auth/VerifyOtp'

// Dashboard
import { DashBoard } from '@/pages/dashboard/DashBoard'
import EmployeeDashboard from '@/pages/dashboard/EmployeeDashboard'
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
import VetDiagnosis from '@/pages/health/VetDiagnosis'
import VetDiagnosisDetail from '@/pages/health/VetDiagnosisDetail'

// Staff
import Employees from '@/pages/staff/Employees'
import Accounts  from '@/pages/staff/Accounts'

// Reports
import PigReport from '@/pages/reports/PigReport'
import VetReview from '@/pages/reports/VetReview'

// ── PrivateRoute: kiểm tra đăng nhập + quyền role ────────
// roles = [] => chỉ cần đăng nhập, không cần role cụ thể
function PrivateRoute({ children, roles = [] }) {
  const { token, user } = useAuthStore()

  // Chưa đăng nhập → về login
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  // Không đủ quyền → về trang chủ của role đó
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export const AppRouter = () => {
  return (
    <Routes>
      {/* ── Public routes ───────────────────────────────── */}
      <Route path="/login"           element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/verify-otp"      element={<VerifyOtp />} />

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
        <Route path="/health/vet-diagnosis"   element={<VetDiagnosis />} />
        <Route path="/health/vet-diagnosis/:id" element={<VetDiagnosisDetail />} />
        <Route path="/staff/employees"        element={<Employees />} />
        <Route path="/staff/accounts"         element={<Accounts />} />
        <Route path="/reports/pig-report"     element={<PigReport />} />
      </Route>

      {/* ── FARM_WORKER routes ──────────────────────────── */}
      <Route element={
        <PrivateRoute roles={['FARM_WORKER']}>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/employee/dashboard"             element={<EmployeeDashboard />} />
        <Route path="/employee/pig/barns"             element={<PigBarns />} />
        <Route path="/employee/pig/manage"            element={<PigManage />} />
        <Route path="/employee/pig/history"           element={<PigstyHistory />} />
        <Route path="/employee/pig/dead"              element={<PigDead />} />
        <Route path="/employee/pig/fattening"         element={<PigFattening />} />
        <Route path="/employee/reproduction/breeding" element={<PigBreeding />} />
        <Route path="/employee/reproduction/farrowing" element={<PigFarrowing />} />
        <Route path="/employee/materials/bran"        element={<BranUsage />} />
        <Route path="/employee/health/vaccine"        element={<PigVaccination />} />
        <Route path="/employee/reports/pig-report"    element={<PigReport />} />
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
        <Route path="/vet/health/vet-diagnosis"      element={<VetDiagnosis />} />
        <Route path="/vet/reports/review"            element={<VetReview />} />
        <Route path="/vet/health/vet-diagnosis/:id" element={<VetDiagnosisDetail />} />
      </Route>

      {/* ── Trang không có quyền ─────────────────────────── */}
      <Route path="/unauthorized" element={
        <div style={{ textAlign: 'center', padding: 60 }}>
          <h2>⛔ Bạn không có quyền truy cập trang này</h2>
        </div>
      } />

      {/* ── Mặc định ─────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
