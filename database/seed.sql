-- ============================================================
-- FARMPRO PIG - SEED DATA
-- MYSQL 8+
-- Chạy sau schema.sql
-- ============================================================

USE farmpro_pig;

-- ============================================================
-- 1. ROLES
-- ============================================================

INSERT IGNORE INTO roles (id, code, name, description) VALUES
(1, 'ADMIN', 'Quản trị viên', 'Có toàn quyền hệ thống'),
(2, 'FARM_WORKER', 'Nhân viên', 'Quản lý lợn, chuồng trại được phân công'),
(3, 'VET_DOCTOR', 'Bác sĩ thú y', 'Quản lý sức khỏe, tiêm phòng, chuẩn đoán');

-- ============================================================
-- 2. PERMISSIONS
-- ============================================================

INSERT INTO permissions (id, code, name, module) VALUES

-- PIG
(1, 'PIG_VIEW', 'Xem danh sách lợn', 'PIG'),
(2, 'PIG_CREATE', 'Thêm lợn', 'PIG'),
(3, 'PIG_UPDATE', 'Cập nhật lợn', 'PIG'),
(4, 'PIG_DELETE', 'Xóa lợn', 'PIG'),

-- BARN
(5, 'BARN_VIEW', 'Xem chuồng trại', 'BARN'),
(6, 'BARN_CREATE', 'Thêm chuồng', 'BARN'),
(7, 'BARN_UPDATE', 'Cập nhật chuồng', 'BARN'),
(8, 'BARN_DELETE', 'Xóa chuồng', 'BARN'),

-- STAFF
(9, 'STAFF_VIEW', 'Xem nhân viên', 'STAFF'),
(10, 'STAFF_CREATE', 'Thêm nhân viên', 'STAFF'),
(11, 'STAFF_UPDATE', 'Cập nhật nhân viên', 'STAFF'),
(12, 'STAFF_DELETE', 'Xóa nhân viên', 'STAFF'),

-- FEED
(13, 'FEED_VIEW', 'Xem thức ăn', 'FEED'),
(14, 'FEED_CREATE', 'Nhập thức ăn', 'FEED'),
(15, 'FEED_UPDATE', 'Cập nhật thức ăn', 'FEED'),

-- MEDICINE
(16, 'MEDICINE_VIEW', 'Xem thuốc', 'MEDICINE'),
(17, 'MEDICINE_CREATE', 'Nhập thuốc', 'MEDICINE'),
(18, 'MEDICINE_UPDATE', 'Cập nhật thuốc', 'MEDICINE'),

-- VACCINATION
(19, 'VACCINATION_VIEW', 'Xem tiêm phòng', 'VACCINATION'),
(20, 'VACCINATION_CREATE', 'Tiêm phòng', 'VACCINATION'),

-- REPORT
(21, 'REPORT_VIEW', 'Xem báo cáo', 'REPORT'),

-- ACCOUNT
(22, 'ACCOUNT_VIEW', 'Xem tài khoản', 'ACCOUNT'),
(23, 'ACCOUNT_CREATE', 'Tạo tài khoản', 'ACCOUNT'),
(24, 'ACCOUNT_UPDATE', 'Cập nhật tài khoản', 'ACCOUNT'),

-- AUDIT
(25, 'AUDIT_VIEW', 'Xem nhật ký hệ thống', 'AUDIT');

-- ============================================================
-- 3. ROLE PERMISSIONS
-- ============================================================

-- ADMIN = toàn quyền
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- FARM_WORKER
INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1),
(2, 3),
(2, 5),
(2, 13),
(2, 16),
(2, 19);

-- VET_DOCTOR
INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1),
(3, 5),
(3, 16),
(3, 17),
(3, 18),
(3, 19),
(3, 20);

-- ============================================================
-- 4. EMPLOYEES
-- ============================================================

INSERT INTO employees (
    id,
    full_name,
    phone,
    email,
    address,
    gender,
    dob,
    role_id,
    status,
    notes
) VALUES

(1,
'Nguyễn Văn Admin',
'0901000001',
'admin@farmpro.vn',
'Hà Nội',
'male',
'1990-01-01',
1,
'active',
'Quản trị viên hệ thống'),

(2,
'Trần Văn Nam',
'0901000002',
'nam@farmpro.vn',
'Hà Nam',
'male',
'1995-03-12',
2,
'active',
'Nhân viên chăm sóc'),

(3,
'Lê Thị Hoa',
'0901000003',
'hoa@farmpro.vn',
'Nam Định',
'female',
'1997-07-21',
2,
'active',
'Nhân viên chuồng nái'),

(4,
'Phạm Quốc Việt',
'0901000004',
'vietvet@farmpro.vn',
'Ninh Bình',
'male',
'1988-11-11',
3,
'active',
'Bác sĩ thú y chính');

-- ============================================================
-- 5. ACCOUNTS
-- Password demo: 123456
-- ============================================================

INSERT INTO accounts (
    id,
    employee_id,
    username,
    password_hash,
    is_active
) VALUES

(1,
1,
'admin',
'123456',
1),

(2,
2,
'namnv',
'123456',
1),

(3,
3,
'hoalt',
'123456',
1),

(4,
4,
'vietvet',
'123456',
1);

-- ============================================================
-- 6. BARNS
-- ============================================================

INSERT INTO barns (
    id,
    code,
    name,
    capacity,
    barn_type,
    status,
    note
) VALUES

(1, 'BARN-NAI-01', 'Chuồng Nái 1', 50, 'nai', 'active', 'Khu nái sinh sản'),
(2, 'BARN-CON-01', 'Chuồng Con 1', 120, 'con', 'active', 'Khu lợn con'),
(3, 'BARN-THIT-01', 'Chuồng Thịt 1', 200, 'thit', 'active', 'Khu lợn thịt'),
(4, 'BARN-DUC-01', 'Chuồng Đực 1', 20, 'duc', 'active', 'Khu lợn đực giống'),
(5, 'BARN-ISO-01', 'Chuồng Cách Ly', 30, 'cach_ly', 'active', 'Khu cách ly bệnh');

-- ============================================================
-- 7. EMPLOYEE BARNS
-- ============================================================

INSERT INTO employee_barns (
    employee_id,
    barn_id
) VALUES
(2, 2),
(2, 3),
(3, 1),
(4, 5);

-- ============================================================
-- 8. FEEDS
-- ============================================================

INSERT INTO feeds (
    id,
    name,
    brand,
    unit,
    stock,
    description
) VALUES

(1, 'Cám Lợn Con 101', 'CP', 'kg', 1500, 'Dùng cho lợn con'),
(2, 'Cám Lợn Thịt 201', 'GreenFeed', 'kg', 3000, 'Dùng cho lợn thịt'),
(3, 'Cám Nái Sinh Sản', 'Proconco', 'kg', 1200, 'Dùng cho nái');

-- ============================================================
-- 9. MEDICINES
-- ============================================================

INSERT INTO medicines (
    id,
    name,
    unit,
    stock,
    import_date,
    expiry_date,
    description
) VALUES

(1,
'Vaccine Dịch Tả Lợn',
'lọ',
50,
'2026-01-10',
'2027-01-10',
'Tiêm phòng dịch tả'),

(2,
'Amoxicillin',
'chai',
100,
'2026-02-01',
'2027-02-01',
'Kháng sinh'),

(3,
'Vitamin C',
'chai',
80,
'2026-03-01',
'2027-03-01',
'Tăng đề kháng');

-- ============================================================
-- 10. PIGS
-- ============================================================

INSERT INTO pigs (
    id,
    pig_code,
    name,
    barn_id,
    category,
    lifecycle_status,
    breed,
    gender,
    dob,
    entry_date,
    entry_weight,
    current_weight,
    note
) VALUES

(1,
'PIG-0001',
'Nái A01',
1,
'SOW',
'ACTIVE',
'Yorkshire',
'female',
'2025-01-01',
'2025-06-01',
120,
180,
'Nái sinh sản'),

(2,
'PIG-0002',
'Lợn Con B01',
2,
'PIGLET',
'ACTIVE',
'Landrace',
'male',
'2026-01-01',
'2026-02-01',
8,
25,
'Lợn con khỏe mạnh'),

(3,
'PIG-0003',
'Lợn Thịt C01',
3,
'FATTENING',
'ACTIVE',
'Duroc',
'male',
'2025-10-10',
'2025-12-01',
30,
95,
'Chuẩn bị xuất bán'),

(4,
'PIG-0004',
'Đực Giống D01',
4,
'BOAR',
'ACTIVE',
'Pietrain',
'male',
'2024-08-01',
'2024-12-01',
140,
220,
'Đực giống chính');

-- ============================================================
-- 11. PIG MOVEMENTS
-- ============================================================

INSERT INTO pig_movements (
    pig_id,
    from_barn_id,
    to_barn_id,
    move_date,
    staff_name,
    note
) VALUES

(2, 2, 3, '2026-04-10', 'Trần Văn Nam', 'Chuyển sang khu nuôi thịt'),
(3, 3, 5, '2026-04-20', 'Phạm Quốc Việt', 'Theo dõi sức khỏe');

-- ============================================================
-- 12. FEED USAGES
-- ============================================================

INSERT INTO feed_usages (
    barn_id,
    feed_type,
    quantity_kg,
    used_at,
    staff_name,
    note
) VALUES
(1, 'Cám nái mang thai', 120, '2026-05-01', 'Lê Thị Hoa', 'Cho ăn định kỳ'),
(2, 'Cám lợn con tập ăn', 80, '2026-05-01', 'Trần Văn Nam', 'Lợn con ăn sáng'),
(3, 'Cám lợn xuất chuồng', 200, '2026-05-01', 'Trần Văn Nam', 'Lợn thịt ăn chiều');

-- ============================================================
-- 13. MEDICINE USAGES
-- ============================================================

INSERT INTO medicine_usages (
    barn_id,
    medicine_name,
    quantity,
    unit,
    used_at,
    staff_name,
    note
) VALUES
(3, 'Kháng sinh (Amoxicillin)', 10, 'ml', '2026-05-02', 'Phạm Quốc Việt', 'Điều trị ho'),
(2, 'Thuốc bổ (Vitamin C)', 5, 'ml', '2026-05-03', 'Phạm Quốc Việt', 'Tăng đề kháng');

-- ============================================================
-- 14. VACCINATIONS
-- ============================================================

INSERT INTO vaccinations (
    pig_id,
    vaccine_name,
    vaccinated_at,
    performed_by,
    note
) VALUES
(1, 'Vaccine Dịch Tả Lợn', '2026-05-01', 4, 'Tiêm định kỳ'),
(2, 'Vaccine Tai Xanh', '2026-05-02', 4, 'Tiêm lần đầu');

-- ============================================================
-- 15. AUDIT LOGS
-- ============================================================

INSERT INTO audit_logs (
    account_id,
    action,
    table_name,
    record_id,
    description,
    ip_address
) VALUES

(1, 'LOGIN', 'accounts', 1, 'Admin đăng nhập hệ thống', '127.0.0.1'),
(1, 'CREATE', 'pigs', 4, 'Thêm mới lợn đực giống', '127.0.0.1'),
(4, 'UPDATE', 'medicine_usages', 1, 'Cập nhật điều trị cho lợn', '127.0.0.1');

-- ============================================================
-- 16. DATA CHO CÁC BẢNG MỚI (Sinh sản, Xuất bán, Chết)
-- ============================================================

INSERT INTO pig_deaths (pig_id, death_date, reason, disposal_method, note, recorded_by) VALUES
(2, '2026-06-01', 'Tiêu chảy cấp', 'Tiêu hủy sinh học (Đốt)', 'Chết 1 con nhỏ', 'Trần Văn Nam');

INSERT INTO pig_breedings (sow_id, boar_id, breeding_date, expected_farrow_date, status, staff_name, note) VALUES
(1, 4, '2025-02-01', '2025-05-26', 'SUCCESS', 'Lê Thị Hoa', 'Phối giống lần 1 thành công');

INSERT INTO pig_farrowings (sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note) VALUES
(1, '2025-05-26', 12, 1, 15.5, 'Lê Thị Hoa', 'Nái đẻ an toàn, 1 con lưu thai');

INSERT INTO sale_batches (id, sold_at, staff_name) VALUES
(1, '2025-12-05', 'Trần Văn Nam');

INSERT INTO sale_batch_lines (sale_batch_id, ear_tag, weight, price, total_amount, reason, note) VALUES
(1, 'PIG-0003', 105, 50000, 5250000, 'Xuất thịt', 'Khách hàng sỉ');

-- ============================================================
-- DONE
-- ============================================================

SELECT 'SEED DATA INSERTED SUCCESSFULLY' AS message;