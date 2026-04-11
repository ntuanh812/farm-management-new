# REVIEW.md — Giải thích code FarmPro PIG

## 1. DATABASE — schema.sql + seed.sql

### Tại sao dùng Pool kết nối?
```js
// backend/src/config/db.js
const pool = mysql.createPool({ connectionLimit: 10, ... })
```
**Pool** giữ sẵn 10 kết nối MySQL, tái sử dụng thay vì tạo mới mỗi request.
Nếu dùng `createConnection()` thì mỗi API call phải mở/đóng kết nối → chậm.

### Tại sao dùng Transaction trong vetDiagnosis?
```js
const conn = await pool.getConnection()
await conn.beginTransaction()
// ... INSERT diagnosis + INSERT medicines
await conn.commit()
// Nếu lỗi:
await conn.rollback()
```
Nếu INSERT diagnosis thành công nhưng INSERT medicines lỗi → rollback về trạng thái ban đầu.
Đảm bảo dữ liệu **toàn vẹn** (không có phiếu thiếu thuốc).

---

## 2. BACKEND — Fastify

### Tại sao dùng Fastify thay Express?
- Nhanh hơn ~3x Express do JSON serialization tối ưu
- Plugin system rõ ràng hơn (register/decorate)
- Validation schema built-in

### Middleware verifyToken + authorizeRoles
```js
// middleware/auth.js
export async function verifyToken(request, reply) {
  try {
    await request.jwtVerify() // Fastify JWT tự verify Bearer token
  } catch {
    reply.status(401).send(...)
  }
}

export function authorizeRoles(...roles) {
  return async function(request, reply) {
    if (!roles.includes(request.user.role)) {
      reply.status(403).send(...) // 403 = có token nhưng không đủ quyền
    }
  }
}
```
- **401 Unauthorized** = chưa đăng nhập / token hết hạn
- **403 Forbidden** = đã đăng nhập nhưng không có quyền

### Pattern `protect()` gộp 2 middleware
```js
export function protect(...roles) {
  return [verifyToken, authorizeRoles(...roles)]
}

// Dùng trong route:
app.get('/', { preHandler: protect('ADMIN') }, ...)
// preHandler chạy TRƯỚC handler chính, nếu reply.send() ở preHandler → handler không chạy
```

### Tại sao hash password bằng bcrypt?
```js
const password_hash = await bcrypt.hash(password, 10)  // 10 = số vòng hash (salt rounds)
const isMatch = await bcrypt.compare(plainText, hash)   // So sánh an toàn, không decode
```
- Bcrypt tạo hash khác nhau mỗi lần dù cùng password (do salt ngẫu nhiên)
- `saltRounds=10` → ~100ms/hash → chống brute force

---

## 3. FRONTEND

### authStore.js — Zustand
```js
export const useAuthStore = create((set, get) => ({
  token: null,
  user:  null,

  login: async (username, password) => {
    const { data } = await axios.post('/api/auth/login', { username, password })
    localStorage.setItem('token', data.data.token)    // Giữ đăng nhập khi reload
    set({ token: data.data.token, user: data.data.user })
    return { success: true, role: data.data.user.role }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  }
}))
```
- **Tại sao lưu localStorage?** Khi F5/reload, Zustand reset về initial state. localStorage giúp khôi phục lại token.
- **`loadFromStorage()`** chạy 1 lần khi app khởi động để lấy token từ localStorage.

### PrivateRoute — Bảo vệ route
```jsx
function PrivateRoute({ children, roles = [] }) {
  const { token, user } = useAuthStore()

  if (!token || !user) return <Navigate to="/login" />          // Chưa đăng nhập
  if (roles.length > 0 && !roles.includes(user.role))
    return <Navigate to="/unauthorized" />                       // Không đủ quyền

  return children
}

// Dùng:
<Route element={<PrivateRoute roles={['ADMIN']}><AppLayout /></PrivateRoute>}>
  <Route path="/dashboard" element={<DashBoard />} />
</Route>
```
- Wrap `AppLayout` thay vì wrap từng `Route` riêng → gọn hơn nhiều.
- `children` ở đây là `<AppLayout />` với `<Outlet />` bên trong.

### Sidebar — Menu theo role
```jsx
function getMenuByRole(role) {
  if (role === 'ADMIN')       return ADMIN_MENU
  if (role === 'FARM_WORKER') return EMPLOYEE_MENU
  if (role === 'VET_DOCTOR')  return VET_MENU
  return []
}

// Trong component:
const { user } = useAuthStore()
const menuItems = getMenuByRole(user?.role)
```
- Menu items là array thuần, không có logic phức tạp → dễ thêm/xóa item.
- `user?.role` dùng optional chaining phòng trường hợp user là null (chưa login).

### VetDiagnosis.jsx — Quản lý thuốc trong form
```jsx
// medRows là array các hàng thuốc do user thêm vào
const [medRows, setMedRows] = useState([])

// Thêm 1 hàng thuốc mới
const addMedRow = () =>
  setMedRows(prev => [...prev, { medicine_id: null, dosage: '', unit: '', duration_days: 1 }])

// Cập nhật field của 1 hàng
const updateMedRow = (idx, field, val) =>
  setMedRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
```
- Mỗi hàng thuốc là 1 object trong mảng.
- Khi submit form, `medRows` được gửi cùng payload.
- Pattern này thường gọi là **dynamic form fields** (không dùng Form.List của AntD để đơn giản hơn).

### Accounts.jsx — Toggle active bằng Switch
```jsx
<Popconfirm title="Khóa tài khoản này?" onConfirm={() => handleToggle(record.id)}>
  <Switch checked={!!val} />
</Popconfirm>
```
- `!!val` chuyển 0/1 từ MySQL thành false/true cho Switch.
- Bọc trong Popconfirm để tránh bấm nhầm.

### API call pattern (axios)
```jsx
// Lấy header từ store
const { getAuthHeader } = useAuthStore()
const headers = getAuthHeader() // { Authorization: 'Bearer <token>' }

// GET với filter params
const { data } = await axios.get(`${API}/vet-diagnosis`, {
  headers,
  params: { barn_id: 1, status: 'dang_dieu_tri' }  // Tự động thêm vào query string
})
```

---

## 4. LUỒNG DỮ LIỆU TỔNG QUÁT

```
[User bấm Login]
    ↓
authStore.login() → POST /api/auth/login
    ↓
Backend: query DB → bcrypt.compare() → jwt.sign()
    ↓
Frontend nhận token + user → lưu localStorage + set Zustand
    ↓
Navigate → /dashboard (theo role)
    ↓
Sidebar render menu theo user.role từ store
    ↓
PrivateRoute check token + role trước mỗi trang
    ↓
Trang fetch data: axios + getAuthHeader() → API → DB → response
    ↓
Hiển thị Table / Form
```

---

## 5. MODULE UPLOAD ẢNH BÁO CÁO LỢNN BỆNH

### Luồng hoạt động
```
[Nhân viên] Tạo báo cáo + chụp ảnh
    ↓
Upload ảnh: POST /api/pig-reports/upload  (multipart/form-data)
    ↓
Backend dùng @fastify/multipart đọc file stream
    ↓
pipeline(part.file, fs.createWriteStream(filepath))  ← ghi ra disk
    ↓
Trả về URL: ["/uploads/1234_abc.jpg"]
    ↓
Submit báo cáo: POST /api/pig-reports  { pig_id, barn_id, description, images: [...urls] }
    ↓
Lưu DB bảng pig_reports, cột images = JSON array
    ↓
[Bác sĩ] Xem danh sách → click Xem → thấy ảnh to
    ↓
Bấm Phản hồi → PATCH /api/pig-reports/:id/respond  { status, vet_note }
    ↓
Nhân viên F5 lại thấy phản hồi của bác sĩ
```

### Giải thích code upload backend
```js
// @fastify/multipart cho phép đọc file dạng async iterator
const parts = request.files()

for await (const part of parts) {
  // part.mimetype = 'image/jpeg' | 'image/png' | ...
  // part.file = ReadableStream của file

  // pipeline = Node.js streams: đọc từ part.file, ghi vào disk
  // Dùng stream thay vì buffer vào RAM → tiết kiệm bộ nhớ với file lớn
  await pipeline(part.file, fs.createWriteStream(filepath))
}
```

### Giải thích Upload component frontend
```jsx
// customRequest: tự xử lý upload thay vì Ant Design tự gửi
const handleUpload = async ({ file, onSuccess, onError }) => {
  const formData = new FormData()
  formData.append('files', file)

  const { data } = await axios.post('/api/pig-reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  file.serverUrl = data.data[0]  // Lưu URL vào file object để dùng khi submit
  onSuccess(data)                // Báo Ant Design: upload thành công
}
```

### Tại sao lưu images là JSON trong MySQL?
```sql
images JSON  -- ["\/uploads\/abc.jpg", "\/uploads\/xyz.jpg"]
```
- Không cần bảng phụ cho 1 field đơn giản
- MySQL JSON type hỗ trợ query như: `JSON_EXTRACT(images, '$[0]')`
- Parse khi đọc: `JSON.parse(row.images)`

---

## 6. NHỮNG CHỖ CẦN HOÀN THIỆN THÊM

| Việc | Mức độ ưu tiên |
|------|---------------|
| Thêm API cho `/barns` và `/medicines` (FE đang dùng mock data) | Cao |
| Kết nối VetDiagnosis với API thật thay mock barns/meds | Cao |
| Thêm route API cho pigs, barns, feed_usages, vaccinations | Trung bình |
| Xử lý token refresh / auto logout khi hết hạn | Trung bình |
| Thêm loading skeleton cho các trang | Thấp |
| Pagination server-side cho bảng nhiều dữ liệu | Thấp |

---

## 6. LỖI THƯỜNG GẶP KHI CHẠY

### Lỗi CORS
```
Access to XMLHttpRequest at 'http://localhost:3000' from origin 'http://localhost:5173' blocked
```
**Sửa:** Kiểm tra `origin` trong `app.register(cors, { origin: 'http://localhost:5173' })`

### Lỗi JWT secret mismatch
```
JsonWebTokenError: invalid signature
```
**Sửa:** Đảm bảo `.env` có `JWT_SECRET` và backend đang đọc đúng file `.env`.

### Lỗi password không khớp
```
401 Sai mật khẩu
```
**Sửa:** Chạy `scripts/hashPasswords.js` để gen lại bcrypt hash đúng cho seed data.

### Lỗi `Cannot find module '@/store/authStore'`
**Sửa:** Kiểm tra `vite.config.js` có alias `@` → `./src` chưa:
```js
resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }
```
