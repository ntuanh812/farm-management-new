# 🐷 HƯỚNG DẪN CHẠY DỰ ÁN FARMPRO PIG

## YÊU CẦU MÁY TÍNH
- Node.js >= 18 (tải tại https://nodejs.org)
- XAMPP (có MySQL) — hướng dẫn bên dưới
- Trình duyệt Chrome / Edge

---

## BƯỚC 1 — CÀI XAMPP & KHỞI ĐỘNG MYSQL

### 1.1 Tải XAMPP
- Vào: https://www.apachefriends.org/download.html
- Chọn bản **Windows**, **PHP 8.x**
- Cài bình thường (Next → Next → Install)

### 1.2 Khởi động MySQL
1. Mở **XAMPP Control Panel** (tìm trong Start Menu)
2. Bấm **Start** cạnh **Apache**
3. Bấm **Start** cạnh **MySQL**
4. Thấy nền xanh lá = đang chạy ✅

### 1.3 Mở phpMyAdmin
- Mở trình duyệt → vào: **http://localhost/phpmyadmin**
- Tài khoản mặc định XAMPP: `root` / không có password

---

## BƯỚC 2 — TẠO DATABASE

### 2.1 Tạo database `farmpro_pig`
1. Trong phpMyAdmin, bấm tab **"Cơ sở dữ liệu"**
2. Ô tên: nhập `farmpro_pig`
3. Bộ mã: chọn `utf8mb4_general_ci`
4. Bấm **Tạo**

### 2.2 Import schema (tạo bảng)
1. Bấm vào database `farmpro_pig` ở sidebar trái
2. Bấm tab **Nhập**
3. Bấm **Chọn tệp** → chọn file:
   ```
   farm-management/database/schema.sql
   ```
4. Bấm **Nhập** (nút cuối trang)

### 2.3 Import seed (dữ liệu mẫu)
1. Làm lại bước trên, lần này chọn file:
   ```
   farm-management/database/seed.sql
   ```
2. Bấm **Nhập**

✅ Xong — sidebar trái sẽ hiện các bảng: `employees`, `accounts`, `barns`, `pigs`,...

### 2.4 Import bảng báo cáo lợn bệnh (tính năng upload ảnh)
1. Chọn database `farmpro_pig`
2. Bấm tab **Nhập** → chọn file:
   ```
   farm-management/database/add_pig_reports.sql
   ```
3. Bấm **Nhập**

---

## BƯỚC 3 — CHẠY BACKEND

### 3.1 Mở terminal, vào thư mục backend
```bash
cd farm-management/backend
```

### 3.2 Cài thư viện (chỉ làm 1 lần)
```bash
npm install
```

### 3.3 Kiểm tra file .env
Mở file `backend/.env`, đảm bảo đúng thông tin:
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=        ← để trống nếu XAMPP mặc định
DB_NAME=farmpro_pig
JWT_SECRET=farmpro_secret_key_2025
JWT_EXPIRES=7d
```
> ⚠️ Nếu bạn đặt password MySQL thì điền vào `DB_PASSWORD=`

### 3.4 Chạy backend
```bash
npm run dev
```

✅ Thành công khi thấy:
```
Server listening at http://127.0.0.1:3000
```

---

## BƯỚC 4 — CHẠY FRONTEND

### 4.1 Mở terminal MỚI (giữ nguyên terminal backend), vào thư mục frontend
```bash
cd farm-management/frontend
```

### 4.2 Cài thư viện (chỉ làm 1 lần)
```bash
npm install
# hoặc nếu dùng yarn:
yarn install
```

### 4.3 Chạy frontend
```bash
npm run dev
# hoặc:
yarn dev
```

✅ Thành công khi thấy:
```
Local: http://localhost:5173/
```

---

## BƯỚC 5 — MỞ TRÌNH DUYỆT

Vào địa chỉ: **http://localhost:5173**

Trang login hiện ra → đăng nhập với tài khoản bên dưới.

---

## TÀI KHOẢN ĐĂNG NHẬP

| Username | Mật khẩu | Vai trò | Trang chủ sau login |
|----------|----------|---------|-------------------|
| `admin` | `password` | Quản trị viên | `/dashboard` |
| `nhanvien1` | `password` | Nhân viên chăn nuôi | `/employee/dashboard` |
| `nhanvien2` | `password` | Nhân viên chăn nuôi | `/employee/dashboard` |
| `bacsi1` | `password` | Bác sĩ thú y | `/vet/dashboard` |

---

## LỖI THƯỜNG GẶP & CÁCH SỬA

### ❌ Backend báo `ER_ACCESS_DENIED_ERROR`
**Nguyên nhân:** Sai password MySQL
**Sửa:** Mở `backend/.env` → xóa trắng `DB_PASSWORD=`

### ❌ Backend báo `ECONNREFUSED`
**Nguyên nhân:** MySQL chưa chạy
**Sửa:** Mở XAMPP Control Panel → bấm Start cạnh MySQL

### ❌ Frontend báo `Network Error` khi login
**Nguyên nhân:** Backend chưa chạy
**Sửa:** Kiểm tra terminal backend còn chạy không, nếu không thì chạy lại `npm run dev`

### ❌ Trang trắng hoặc lỗi `Cannot find module`
**Nguyên nhân:** Chưa `npm install`
**Sửa:** Chạy `npm install` trong thư mục `frontend/` và `backend/`

### ❌ Port bị chiếm (EADDRINUSE)
**Nguyên nhân:** Đã có app chạy ở port 3000 hoặc 5173
**Sửa:** Tắt app đó hoặc đổi port trong `.env`

---

## CẤU TRÚC THƯ MỤC

```
farm-management/
├── backend/          ← Node.js Fastify API
│   ├── src/
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   └── routes/
│   └── .env          ← Cấu hình DB + JWT
├── database/
│   ├── schema.sql    ← Tạo bảng
│   └── seed.sql      ← Dữ liệu mẫu
├── frontend/         ← React + Ant Design
│   └── src/
├── PLAN.md           ← Kiến trúc hệ thống
└── REVIEW.md         ← Giải thích code
```

---

## TỔNG QUÁT LUỒNG CHẠY

```
XAMPP MySQL (port 3306)
        ↑
Backend Fastify (port 3000)  ←→  Database farmpro_pig
        ↑
Frontend React (port 5173)
        ↑
Trình duyệt người dùng
```
