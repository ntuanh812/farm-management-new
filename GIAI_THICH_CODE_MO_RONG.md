# GIẢI THÍCH CODE MỞ RỘNG — FarmPro PIG
## Tính năng: Upload ảnh báo cáo lợn bệnh

---

## 1. TỔNG QUAN TÍNH NĂNG

```
[Nhân viên]
  → Vào trang "Báo cáo lợn bệnh"
  → Bấm "Tạo báo cáo mới"
  → Điền: mã lợn, chuồng, mô tả triệu chứng
  → Chọn ảnh (tối đa 5 ảnh, mỗi ảnh max 5MB)
  → Bấm "Gửi báo cáo"

[Bác sĩ thú y]
  → Vào trang "Báo cáo lợn bệnh" (menu riêng)
  → Thấy badge đỏ số báo cáo chờ xử lý
  → Bấm "Xem" → thấy ảnh to + mô tả
  → Bấm "Phản hồi" → cập nhật trạng thái + ghi chú
  → Nhân viên F5 sẽ thấy phản hồi
```

---

## 2. DATABASE — `pig_reports`

**File:** `database/add_pig_reports.sql`

```sql
CREATE TABLE pig_reports (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  pig_id        VARCHAR(20)  NOT NULL,   -- Mã lợn (VD: PIG001)
  barn_id       INT          NOT NULL,   -- Khóa ngoại → barns
  reporter_id   INT          NOT NULL,   -- Khóa ngoại → employees (nhân viên)
  description   TEXT         NOT NULL,   -- Mô tả triệu chứng
  images        JSON,                    -- Mảng URL ảnh: ["/uploads/abc.jpg"]
  status        ENUM('cho_xu_ly','dang_xu_ly','da_xu_ly') DEFAULT 'cho_xu_ly',
  vet_note      TEXT,                    -- Phản hồi của bác sĩ
  vet_doctor_id INT,                     -- Bác sĩ xử lý (nullable)
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Tại sao dùng JSON cho `images`?**
- Không cần tạo thêm bảng `pig_report_images` chỉ cho 1 field đơn giản
- MySQL JSON type hỗ trợ validate đúng format JSON khi INSERT
- Đọc ra dùng `JSON.parse()` là được

---

## 3. BACKEND — Packages mới

**File:** `backend/package.json`

```json
"@fastify/multipart": "^10.0.0",  ← Đọc file upload (multipart/form-data)
"@fastify/static":    "^9.1.0"    ← Serve file tĩnh từ thư mục uploads/
```

**Đăng ký trong `app.js`:**
```js
// Cho phép nhận file upload, max 5MB mỗi file
await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 }
})

// Serve ảnh tĩnh: GET /uploads/abc.jpg → trả file từ thư mục backend/uploads/
await app.register(staticFiles, {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
})
```

---

## 4. BACKEND — `pigReports.route.js`

**File:** `backend/src/routes/pigReports.route.js`

### 4.1 Upload ảnh

```js
app.post('/upload', { preHandler: [verifyToken] }, async (request, reply) => {
  const parts = request.files()  // async iterator — đọc từng file một

  for await (const part of parts) {
    // Kiểm tra chỉ nhận ảnh
    if (!part.mimetype.startsWith('image/')) {
      return reply.code(400).send({ message: 'Chỉ chấp nhận file ảnh' })
    }

    const filename = uniqueFilename(part.filename)  // Tạo tên ngẫu nhiên tránh trùng
    const filepath = path.join(UPLOAD_DIR, filename)

    // pipeline = đọc stream từ request → ghi stream ra disk
    // Không load toàn bộ file vào RAM → tiết kiệm bộ nhớ
    await pipeline(part.file, fs.createWriteStream(filepath))

    urls.push(`/uploads/${filename}`)
  }

  return reply.send({ success: true, data: urls })  // Trả về mảng URL
})
```

**`uniqueFilename()` — Tại sao cần đặt tên ngẫu nhiên?**
```js
function uniqueFilename(originalName) {
  const ext  = path.extname(originalName)         // Lấy đuôi: .jpg, .png
  const rand = Math.random().toString(36).slice(2, 8) // Chuỗi random 6 ký tự
  return `${Date.now()}_${rand}${ext}`            // VD: 1775891406_abc123.jpg
}
```
- Nếu 2 nhân viên upload file cùng tên → không bị đè lên nhau
- `Date.now()` = timestamp ms → luôn tăng dần → không trùng

### 4.2 Tạo báo cáo

```js
app.post('/', {
  preHandler: [verifyToken, authorizeRoles('ADMIN', 'FARM_WORKER')]
}, async (request, reply) => {
  const { pig_id, barn_id, description, images = [] } = request.body
  const reporter_id = request.user.employee_id  // Lấy từ JWT token

  await pool.query(
    'INSERT INTO pig_reports (pig_id, barn_id, reporter_id, description, images) VALUES (?,?,?,?,?)',
    [pig_id, barn_id, reporter_id, description, JSON.stringify(images)]
    //                                                   ↑ Chuyển array → chuỗi JSON để lưu DB
  )
})
```

### 4.3 Bác sĩ phản hồi

```js
app.patch('/:id/respond', {
  preHandler: [verifyToken, authorizeRoles('ADMIN', 'VET_DOCTOR')]
}, async (request, reply) => {
  const { status, vet_note } = request.body
  const vet_doctor_id = request.user.employee_id  // Tự lấy từ token, không cần FE gửi

  await pool.query(
    'UPDATE pig_reports SET status=?, vet_note=?, vet_doctor_id=? WHERE id=?',
    [status, vet_note, vet_doctor_id, request.params.id]
  )
})
```

### 4.4 Phân quyền xem danh sách

```js
// Nhân viên chỉ thấy báo cáo của mình
if (request.user.role === 'FARM_WORKER') {
  sql += ' AND pr.reporter_id = ?'
  params.push(request.user.employee_id)
}
// ADMIN và VET_DOCTOR thấy tất cả
```

### 4.5 Xóa kèm xóa file trên disk

```js
app.delete('/:id', async (request, reply) => {
  // Lấy danh sách ảnh trước khi xóa record
  const [rows] = await pool.query('SELECT images FROM pig_reports WHERE id = ?', [id])
  const imgs = JSON.parse(rows[0].images)

  // Xóa từng file vật lý
  imgs.forEach(url => {
    const file = path.join(UPLOAD_DIR, path.basename(url))
    fs.unlink(file, () => {})  // Callback rỗng = bỏ qua lỗi nếu file đã xóa
  })

  await pool.query('DELETE FROM pig_reports WHERE id = ?', [id])
})
```

---

## 5. BACKEND — `barns.route.js`

**File:** `backend/src/routes/barns.route.js`

```js
app.get('/', { preHandler: [verifyToken] }, async (request, reply) => {
  const [rows] = await pool.query(
    'SELECT id, name, capacity, barn_type, status FROM barns ORDER BY name'
  )
  return reply.send({ success: true, data: rows })
})
```

**Tại sao cần route này?**
- Frontend cần danh sách chuồng để hiển thị dropdown trong form báo cáo
- Tất cả role đều cần → chỉ cần `verifyToken`, không cần `authorizeRoles`

---

## 6. FRONTEND — `PigReport.jsx`

**File:** `frontend/src/pages/reports/PigReport.jsx`

### 6.1 Upload ảnh với `customRequest`

```jsx
const handleUpload = async ({ file, onSuccess, onError }) => {
  const formData = new FormData()
  formData.append('files', file)  // 'files' phải khớp với tên backend expect

  try {
    const { data } = await axios.post(`${API}/pig-reports/upload`, formData, {
      headers: {
        ...headers,                          // Authorization: Bearer <token>
        'Content-Type': 'multipart/form-data'  // Bắt buộc cho file upload
      }
    })

    file.serverUrl = data.data[0]  // Gắn URL vào file object để dùng khi submit
    onSuccess(data)                // Báo Ant Design: upload OK → hiện dấu tích xanh
  } catch (err) {
    onError(err)                   // Báo Ant Design: lỗi → hiện X đỏ
  }
}
```

**Tại sao dùng `customRequest` thay vì `action` prop?**
- `action` prop: Ant Design tự gửi request không có Authorization header → backend từ chối 401
- `customRequest`: tự kiểm soát hoàn toàn → thêm được header JWT

### 6.2 Submit báo cáo

```jsx
const handleSubmit = async () => {
  const values = await form.validateFields()  // Validate trước khi submit

  // Lấy URL từ các file đã upload thành công
  const images = fileList
    .filter(f => f.status === 'done' && f.originFileObj?.serverUrl)
    //           ↑ Chỉ lấy file upload thành công (không lấy file lỗi)
    .map(f => f.originFileObj.serverUrl)
    //        ↑ Lấy URL đã gắn ở bước handleUpload

  await axios.post(`${API}/pig-reports`, { ...values, images }, { headers })
}
```

### 6.3 Component Upload của Ant Design

```jsx
<Upload
  customRequest={handleUpload}    // Hàm xử lý upload tự viết
  listType="picture-card"         // Hiển thị dạng ô vuông có preview ảnh
  fileList={fileList}             // State quản lý danh sách file
  onChange={({ fileList: fl }) => setFileList(fl)}  // Cập nhật state mỗi khi thêm/xóa
  maxCount={5}                    // Tối đa 5 ảnh
  accept="image/*"                // Chỉ chọn được file ảnh
  multiple                        // Cho phép chọn nhiều file cùng lúc
>
  {fileList.length < 5 && <div>+</div>}  {/* Ẩn nút + khi đủ 5 ảnh */}
</Upload>
```

---

## 7. FRONTEND — `VetReview.jsx`

**File:** `frontend/src/pages/reports/VetReview.jsx`

### 7.1 Badge đỏ số báo cáo chờ

```jsx
const pendingCount = list.filter(r => r.status === 'cho_xu_ly').length

<PageHeader
  title={
    <Space>
      Báo cáo lợn bệnh
      {pendingCount > 0 && (
        <Badge count={pendingCount} style={{ background: '#c44536' }} />
        // Hiện số đỏ khi có báo cáo chưa xử lý
      )}
    </Space>
  }
/>
```

### 7.2 Row màu cam cho báo cáo khẩn

```jsx
<Table
  rowClassName={rec => rec.status === 'cho_xu_ly' ? 'row-urgent' : ''}
  // Thêm class 'row-urgent' vào hàng chờ xử lý
/>
```

```scss
// _reports.scss
.reports-page .row-urgent td {
  background: #fff9f0 !important;  // Nền cam nhạt
}
```

### 7.3 Luồng xem → phản hồi

```
Bấm "Xem"      → setSelected(rec) + setOpenDetail(true)  → Modal hiện ảnh
Bấm "Phản hồi" → setSelected(rec) + setOpenRespond(true) → Modal phản hồi
Trong detail, bấm "Phản hồi ngay" → đóng detail → mở respond modal ngay
```

---

## 8. SCSS — `_reports.scss`

**File:** `frontend/src/styles/pages/reports/_reports.scss`

```scss
.reports-page {
  // Không có padding ở đây vì PageHeader tự có padding riêng

  &__body {
    padding: 24px 32px;  // Padding cho nội dung bên dưới PageHeader
  }

  &__toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;  // Khoảng cách giữa toolbar và bảng
  }

  .row-urgent td {
    background: #fff9f0 !important;  // !important để override Ant Design
  }
}
```

**Import vào `style.scss`:**
```scss
@use "pages/reports";  // Phải khai báo ở đây mới có hiệu lực toàn app
```

---

## 9. CẤU TRÚC FILE MỚI

```
backend/
├── uploads/                        ← Ảnh upload lưu tại đây (tạo tự động)
└── src/routes/
    ├── pigReports.route.js         ← Upload + CRUD báo cáo
    └── barns.route.js              ← GET danh sách chuồng

database/
└── add_pig_reports.sql             ← Bảng pig_reports (import thêm vào phpMyAdmin)

frontend/src/
├── pages/reports/
│   ├── PigReport.jsx               ← Nhân viên: tạo báo cáo + upload ảnh
│   └── VetReview.jsx               ← Bác sĩ: xem ảnh + phản hồi
└── styles/pages/reports/
    ├── _reports.scss               ← Style cho 2 trang trên
    └── _index.scss                 ← @forward 'reports'
```

---

## 10. LỖI THƯỜNG GẶP

### Upload ảnh thất bại (401)
**Nguyên nhân:** Thiếu Authorization header
**Sửa:** Đảm bảo `customRequest` gửi `headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }`

### Dropdown chuồng trống
**Nguyên nhân:** Thiếu route `/api/barns` hoặc backend chưa restart
**Sửa:** Kiểm tra `barns.route.js` đã được đăng ký trong `app.js` chưa

### Ảnh hiện icon lỗi (broken image)
**Nguyên nhân:** URL ảnh sai, hoặc `@fastify/static` chưa đăng ký
**Sửa:** Kiểm tra `http://localhost:3000/uploads/<tên_file>` có truy cập được không

### Nhân viên thấy báo cáo của người khác
**Nguyên nhân:** Backend query thiếu điều kiện lọc theo `reporter_id`
**Sửa:** Backend đã xử lý: `if (role === 'FARM_WORKER') { sql += AND reporter_id = ? }`
