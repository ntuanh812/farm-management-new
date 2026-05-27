-- ============================================================
-- DỮ LIỆU MẪU (SEED DATA) CHO FARMPRO PIG - ĐẦY ĐỦ CÁC TRANG
-- ============================================================

USE farmpro_pig;

-- 1. THÊM NHÂN VIÊN VÀ TÀI KHOẢN (role_id 2: FARM_WORKER, 3: VET_DOCTOR)
-- Admin (role 1) đã được thêm mặc định ở cuối file schema.sql
INSERT INTO employees (id, full_name, phone, email, role_id) VALUES
(2, 'Nguyễn Văn Công', '0911222333', 'worker@farmpro.com', 2),
(3, 'Trần Thị Thúy', '0988777666', 'vet@farmpro.com', 3),
(4, 'Lê Hoàng Anh', '0933444555', 'worker2@farmpro.com', 2);

INSERT INTO accounts (id, employee_id, username, password_hash, is_active) VALUES
(2, 2, 'worker', '123456', 1),
(3, 3, 'vet', '123456', 1),
(4, 4, 'worker2', '123456', 1);

-- 2. THÊM CHUỒNG TRẠI (BARNS)
INSERT INTO barns (id, code, name, capacity, barn_type, status) VALUES
(1, 'B01', 'Chuồng Nái Đẻ 1', 20, 'SOW', 'ACTIVE'),
(2, 'B02', 'Chuồng Đực Giống', 10, 'BOAR', 'ACTIVE'),
(3, 'B03', 'Chuồng Lợn Thịt A', 100, 'FATTENING', 'ACTIVE'),
(4, 'B04', 'Chuồng Lợn Con', 50, 'PIGLET', 'ACTIVE'),
(5, 'B05', 'Chuồng Cách Ly', 20, 'ISOLATION', 'ACTIVE'),
(6, 'B06', 'Chuồng Lợn Thịt B', 100, 'FATTENING', 'ACTIVE');

-- Phân công chuồng cho nhân viên
INSERT INTO employee_barns (employee_id, barn_id) VALUES
(2, 1), (2, 3), (2, 4), (2, 5),
(4, 2), (4, 6);

-- 3. THÊM LỢN (PIGS)
INSERT INTO pigs (id, pig_code, barn_id, category, lifecycle_status, gender, entry_date, entry_weight, current_weight) VALUES
(1, 'PIG-S001', 1, 'SOW', 'ACTIVE', 'female', '2023-01-10', 80.0, 150.5),
(2, 'PIG-S002', 1, 'SOW', 'ACTIVE', 'female', '2023-02-15', 75.0, 145.0),
(3, 'PIG-B001', 2, 'BOAR', 'ACTIVE', 'male', '2023-01-05', 90.0, 180.0),
(4, 'PIG-F001', 3, 'FATTENING', 'ACTIVE', 'male', '2023-08-01', 15.0, 102.5), -- Đạt chuẩn xuất chuồng (>100kg)
(5, 'PIG-F002', 3, 'FATTENING', 'ACTIVE', 'female', '2023-08-01', 14.5, 98.0),
(6, 'PIG-P001', 4, 'PIGLET', 'ACTIVE', 'male', '2023-09-20', 2.5, 6.0),
(9, 'PIG-P002', 4, 'PIGLET', 'ACTIVE', 'female', '2023-09-20', 2.6, 6.2),
(7, 'PIG-F003', 3, 'FATTENING', 'SOLD', 'male', '2023-05-01', 15.0, 105.0),
(8, 'PIG-F004', 5, 'FATTENING', 'DEAD', 'female', '2023-06-01', 15.0, 40.0),
(10, 'PIG-F005', 6, 'FATTENING', 'ACTIVE', 'male', '2023-08-15', 16.0, 70.0);

-- 4. LỊCH SỬ CHUYỂN CHUỒNG (PIG MOVEMENTS)
INSERT INTO pig_movements (pig_id, from_barn_id, to_barn_id, move_date, staff_name, note) VALUES
(4, 4, 3, '2023-08-01', 'Nguyễn Văn Công', 'Chuyển lợn con lên chuồng thịt A'),
(5, 4, 3, '2023-08-01', 'Nguyễn Văn Công', 'Chuyển lợn con lên chuồng thịt A'),
(8, 3, 5, '2023-10-01', 'Lê Hoàng Anh', 'Cách ly do có dấu hiệu ốm');

-- 5. VẬT TƯ (CÁM & THUỐC)
INSERT INTO feeds (id, name, brand, unit, stock) VALUES
(1, 'Cám lợn con tập ăn', 'DeHeus', 'kg', 500),
(2, 'Cám lợn thịt 30-60kg', 'CP', 'kg', 1000),
(3, 'Cám nái mang thai', 'GreenFeed', 'kg', 300),
(4, 'Cám vỗ béo xuất chuồng', 'Dabaco', 'kg', 800);

INSERT INTO medicines (id, name, unit, stock, expiry_date) VALUES
(1, 'Vaccine Dịch tả lợn', 'Liều', 200, '2025-12-31'),
(2, 'Kháng sinh Amoxicillin', 'Chai', 50, '2024-10-15'),
(3, 'Thuốc sát trùng', 'Lít', 100, '2025-05-20'),
(4, 'Vaccine Lở mồm long móng', 'Liều', 150, '2024-11-30');

-- 6. DỮ LIỆU SINH SẢN (Phối giống & Đẻ con)
INSERT INTO pig_breedings (sow_id, boar_id, breeding_date, expected_farrow_date, status, staff_name) VALUES
(1, 3, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 54 DAY), 'SUCCESS', 'Nguyễn Văn Công'),
(2, 3, DATE_SUB(CURDATE(), INTERVAL 125 DAY), DATE_SUB(CURDATE(), INTERVAL 11 DAY), 'SUCCESS', 'Nguyễn Văn Công');

INSERT INTO pig_farrowings (sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note) VALUES
(2, DATE_SUB(CURDATE(), INTERVAL 11 DAY), 12, 1, 16.5, 'Nguyễn Văn Công', 'Đẻ lứa 2, nái mẹ khỏe mạnh, con đều');

-- 7. LỢN CHẾT & XUẤT BÁN
INSERT INTO pig_deaths (pig_id, death_date, reason, disposal_method, recorded_by) VALUES
(8, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Viêm phổi phức hợp', 'Tiêu hủy sinh học (Đốt)', 'Lê Hoàng Anh');

INSERT INTO sale_batches (id, sold_at, staff_name) VALUES
(1, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Admin System');

INSERT INTO sale_batch_lines (sale_batch_id, ear_tag, weight, price, total_amount) VALUES
(1, 'PIG-F003', 105.0, 50000, 5250000);

-- 8. THÚ Y: BÁO CÁO BỆNH, KHÁM CHỮA BỆNH & TIÊM PHÒNG
INSERT INTO pig_reports (pig_id, barn_id, reporter_id, description, status, vet_note, vet_doctor_id) VALUES
('PIG-S002', 1, 2, 'Lợn nái bỏ ăn, sốt nhẹ, nằm ì một chỗ', 'cho_xu_ly', NULL, NULL),
('PIG-F001', 3, 2, 'Ho khạc, thở dốc, chảy nước mũi', 'da_xu_ly', 'Đã xuống khám và chẩn đoán viêm phổi. Cách ly tiêm thuốc.', 3);

-- Lịch sử tiêm phòng
INSERT INTO vaccinations (pig_id, vaccine_name, vaccinated_at, performed_by, note) VALUES
(6, 'Vaccine Dịch tả lợn', CURDATE(), 3, 'Tiêm phòng lợn con 30 ngày tuổi'),
(9, 'Vaccine Dịch tả lợn', CURDATE(), 3, 'Tiêm phòng lợn con 30 ngày tuổi'),
(4, 'Vaccine Lở mồm long móng', DATE_SUB(CURDATE(), INTERVAL 60 DAY), 3, 'Tiêm định kỳ');

-- 9. LỊCH SỬ TIÊU THỤ VẬT TƯ (Cám & Thuốc)
INSERT INTO feed_usages (barn_id, feed_type, quantity_kg, used_at, staff_name) VALUES
(3, 'Cám lợn thịt 30-60kg', 50, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Nguyễn Văn Công'),
(6, 'Cám lợn thịt 30-60kg', 25, CURDATE(), 'Lê Hoàng Anh'),
(1, 'Cám nái mang thai', 10, CURDATE(), 'Nguyễn Văn Công'),
(4, 'Cám lợn con tập ăn', 5, CURDATE(), 'Nguyễn Văn Công');

INSERT INTO medicine_usages (barn_id, medicine_name, quantity, unit, used_at, staff_name, note) VALUES
(1, 'Thuốc sát trùng', 2.0, 'Lít', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Trần Thị Thúy', 'Phun sát trùng định kỳ khu nái đẻ'),
(3, 'Kháng sinh Amoxicillin', 0.5, 'Chai', CURDATE(), 'Trần Thị Thúy', 'Dùng điều trị lợn ho');
