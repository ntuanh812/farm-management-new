# PLAN.md — FarmPro PIG

## Tổng quan dự án
Hệ thống quản lý trại lợn fullstack: React + Fastify + MySQL.

---

## Kiến trúc hệ thống

```
farm-management/
├── database/
│   ├── schema.sql          ← CREATE TABLE 14 bảng
│   └── seed.sql            ← Dữ liệu mẫu
├── backend/
│   ├── src/
│   │   ├── app.js          ← Fastify entry point
│   │   ├── config/db.js    ← MySQL pool
│   │   ├── middleware/
│   │   │   └── auth.js     ← verifyToken + authorizeRoles
│   │   └── routes/
│   │       ├── auth.route.js
│   │       ├── employees.route.js
│   │       ├── accounts.route.js
│   │       ├── vetDiagnosis.route.js
│   │       └── pigReports.route.js    ← Upload ảnh + báo cáo lợn bệnh
│   ├── uploads/                       ← Ảnh upload lưu tại đây
│   ├── .env
│   └── package.json
└── frontend/
    └── src/
        ├── store/authStore.js          ← Zustand auth state
        ├── pages/auth/Login.jsx        ← Trang đăng nhập
        ├── routers/AppRouter.jsx       ← Routes + PrivateRoute
        ├── components/layout/
        │   └── Sidebar.jsx             ← Menu theo role
        ├── pages/dashboard/
        │   ├── EmployeeDashboard.jsx
        │   └── VetDashboard.jsx
        ├── pages/health/
        │   ├── VetDiagnosis.jsx        ← Danh sách chuẩn đoán
        │   └── VetDiagnosisDetail.jsx  ← Chi tiết phiếu
        ├── pages/staff/
        │   ├── Employees.jsx           ← CRUD nhân viên
        │   └── Accounts.jsx            ← CRUD tài khoản
        ├── pages/reports/
        │   ├── PigReport.jsx           ← Nhân viên gửi báo cáo + ảnh
        │   └── VetReview.jsx           ← Bác sĩ xem ảnh + phản hồi
        └── styles/pages/
            ├── health/
            └── staff/
```

---

## Database (15 bảng)

| Bảng | Mô tả |
|------|-------|
| `employees` | Nhân viên (ADMIN / FARM_WORKER / VET_DOCTOR) |
| `accounts` | Tài khoản đăng nhập, bcrypt password |
| `barns` | Chuồng trại |
| `pigs` | Đàn lợn với lifecycle status |
| `medicines` | Danh mục thuốc |
| `feed_usages` | Ghi nhận sử dụng cám |
| `medicine_usages` | Ghi nhận sử dụng thuốc thường |
| `vaccinations` | Lịch tiêm phòng |
| `vet_diagnosis` | Phiếu chuẩn đoán bệnh |
| `vet_diagnosis_medicines` | Thuốc dùng trong từng phiếu |
| `breeding_records` | Phối giống |
| `farrowing_records` | Đẻ con |
| `pig_movements` | Chuyển chuồng |
| `activity_logs` | Nhật ký hành động |
| `pig_reports` | Báo cáo lợn bệnh kèm ảnh từ nhân viên → bác sĩ |

> Import thêm: `database/add_pig_reports.sql` sau khi đã import schema.sql + seed.sql

---

## API Endpoints

### Auth
| Method | URL | Quyền |
|--------|-----|-------|
| POST | `/api/auth/login` | Public |
| GET  | `/api/auth/me`    | Logged in |

### Employees
| Method | URL | Quyền |
|--------|-----|-------|
| GET    | `/api/employees`     | ADMIN |
| POST   | `/api/employees`     | ADMIN |
| PUT    | `/api/employees/:id` | ADMIN |
| DELETE | `/api/employees/:id` | ADMIN |

### Accounts
| Method | URL | Quyền |
|--------|-----|-------|
| GET    | `/api/accounts`                    | ADMIN |
| POST   | `/api/accounts`                    | ADMIN |
| PUT    | `/api/accounts/:id`                | ADMIN |
| PATCH  | `/api/accounts/:id/reset-password` | ADMIN |
| PATCH  | `/api/accounts/:id/toggle-active`  | ADMIN |

### Vet Diagnosis
| Method | URL | Quyền |
|--------|-----|-------|
| GET    | `/api/vet-diagnosis`     | All roles |
| GET    | `/api/vet-diagnosis/:id` | All roles |
| POST   | `/api/vet-diagnosis`     | ADMIN + VET_DOCTOR |
| PUT    | `/api/vet-diagnosis/:id` | ADMIN + VET_DOCTOR |
| DELETE | `/api/vet-diagnosis/:id` | ADMIN + VET_DOCTOR |

### Pig Reports (Báo cáo lợn bệnh + Upload ảnh)
| Method | URL | Quyền |
|--------|-----|-------|
| POST   | `/api/pig-reports/upload`        | Logged in |
| GET    | `/api/pig-reports`               | All roles |
| POST   | `/api/pig-reports`               | ADMIN + FARM_WORKER |
| PATCH  | `/api/pig-reports/:id/respond`   | ADMIN + VET_DOCTOR |
| DELETE | `/api/pig-reports/:id`           | ADMIN |

---

## Phân quyền (Role-based Access)

| Tính năng | ADMIN | FARM_WORKER | VET_DOCTOR |
|-----------|:-----:|:-----------:|:----------:|
| Dashboard riêng | ✅ | ✅ | ✅ |
| CRUD Lợn / Chuồng | ✅ | ✅ | ❌ |
| CRUD Sinh sản | ✅ | ✅ | ❌ |
| Sử dụng cám | ✅ | ✅ | ❌ |
| Tiêm phòng (xem) | ✅ | ✅ | ✅ |
| Tiêm phòng (CRUD) | ✅ | ❌ | ✅ |
| Sử dụng thuốc | ✅ | ❌ | ✅ |
| Chuẩn đoán bệnh | ✅ | 👁 xem | ✅ |
| Quản lý nhân viên | ✅ | ❌ | ❌ |
| Quản lý tài khoản | ✅ | ❌ | ❌ |
| Gửi báo cáo lợn bệnh + ảnh | ✅ | ✅ | ❌ |
| Xem + phản hồi báo cáo | ✅ | ❌ | ✅ |

---

## Login Flow

```
User nhập username/password
    ↓
POST /api/auth/login
    ↓
Backend verify bcrypt
    ↓
Trả về JWT token + user info
    ↓
Frontend lưu vào localStorage + Zustand store
    ↓
Redirect theo role:
  ADMIN       → /dashboard
  FARM_WORKER → /employee/dashboard
  VET_DOCTOR  → /vet/dashboard
```

---

## Hướng dẫn chạy dự án

### 1. Database
```sql
mysql -u root -p < database/schema.sql
mysql -u root -p farmpro_pig < database/seed.sql
```

### 2. Backend
```bash
cd backend
npm install
# Sửa .env nếu cần (DB_PASSWORD, ...)
npm run dev
# Chạy tại: http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# Chạy tại: http://localhost:5173
```

### 4. Tài khoản test
| Username | Password | Role |
|----------|----------|------|
| admin | 123456 | ADMIN |
| nhanvien1 | 123456 | FARM_WORKER |
| bacsi1 | 123456 | VET_DOCTOR |

> ⚠️ Hash trong seed.sql là hash của chuỗi `password` (laravel/php style).
> Cần chạy script để gen lại hash đúng hoặc xem phần FIX bên dưới.

### Fix seed password
Chạy script Node.js một lần để update hash:
```js
// scripts/hashPasswords.js
import bcrypt from 'bcrypt'
import pool from './src/config/db.js'

const accounts = [
  { id: 1, password: '123456' },
  { id: 2, password: '123456' },
  { id: 3, password: '123456' },
  { id: 4, password: '123456' },
]

for (const acc of accounts) {
  const hash = await bcrypt.hash(acc.password, 10)
  await pool.query('UPDATE accounts SET password_hash = ? WHERE id = ?', [hash, acc.id])
}
process.exit(0)
```
```bash
node scripts/hashPasswords.js
```
