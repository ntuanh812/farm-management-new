-- ============================================================
-- SEED DATA - DỮ LIỆU MẪU CHO FARMPRO PIG
-- ============================================================

USE farmpro_pig;

-- Thêm dữ liệu Chuồng trại
INSERT INTO barns (code, name, capacity, barn_type, status) VALUES
('B-N01', 'Chuồng Nái 01', 50, 'SOW', 'ACTIVE'),
('B-B01', 'Chuồng Đực giống 01', 10, 'BOAR', 'ACTIVE'),
('B-C01', 'Chuồng Lợn con 01', 200, 'PIGLET', 'ACTIVE'),
('B-F01', 'Chuồng Thịt 01', 100, 'FATTENING', 'ACTIVE'),
('B-F02', 'Chuồng Thịt 02', 100, 'FATTENING', 'ACTIVE');

-- Thêm Nhân viên mẫu
INSERT INTO staffs (full_name, phone, email, role_id) VALUES
('Nguyễn Văn Chăn Nuôi', '0912345678', 'worker1@farmpro.com', 2),
('Trần Thị Thú Y', '0988888888', 'vet1@farmpro.com', 3);

-- Thêm Tài khoản cho nhân viên
INSERT INTO accounts (staff_id, username, password_hash, is_active) VALUES
(2, 'worker1', '$2b$10$tZ2E2.H9F8wT5P6c3X1i.eZq/L/5L1c4o8tG0H4U5l4R3q2P1', 1), -- pass: 123456
(3, 'vet1', '$2b$10$tZ2E2.H9F8wT5P6c3X1i.eZq/L/5L1c4o8tG0H4U5l4R3q2P1', 1);

-- Phân công chuồng cho công nhân
INSERT INTO staff_barns (staff_id, barn_id) VALUES
(2, 1), (2, 3), (2, 4);

-- Thêm Cám & Thuốc
INSERT INTO feeds (name, brand, unit, stock) VALUES
('Cám heo con', 'GreenFeed', 'kg', 1000),
('Cám heo nái', 'Proconco', 'kg', 500);

INSERT INTO medicines (name, unit, stock, expiry_date) VALUES
('Kháng sinh Amox', 'Lọ', 50, '2025-12-31'),
('Vitamin C', 'Gói', 100, '2026-06-30');

-- Thêm Lợn mẫu (Chỉ sử dụng ID tự tăng)
INSERT INTO pigs (name, barn_id, category, lifecycle_status, gender, entry_date, entry_weight, current_weight, purchase_price) VALUES
('Nái York 01', 1, 'SOW', 'ACTIVE', 'female', '2023-01-10', 100, 150, 5000000),
('Nái Landrace 02', 1, 'SOW', 'ACTIVE', 'female', '2023-02-15', 110, 160, 5500000),
('Đực Duroc 01', 2, 'BOAR', 'ACTIVE', 'male', '2023-01-05', 120, 180, 8000000),
('Lợn thịt T1', 4, 'FATTENING', 'ACTIVE', 'male', '2023-10-01', 15, 80, 1500000),
('Lợn thịt T2', 4, 'FATTENING', 'ACTIVE', 'female', '2023-10-01', 14, 75, 1500000),
('Lợn thịt T3', 4, 'FATTENING', 'ACTIVE', 'male', '2023-10-01', 16, 85, 1500000),
('Lợn bán X1', 4, 'FATTENING', 'SOLD', 'male', '2023-05-01', 10, 100, 1000000),
('Lợn chết C1', 4, 'FATTENING', 'DEAD', 'female', '2023-11-01', 12, 30, 1200000);

-- Thêm lịch sử chuyển chuồng
INSERT INTO pig_movements (pig_id, from_barn_id, to_barn_id, move_date, staff_id) VALUES
(4, 3, 4, '2023-11-15', 2);

-- Phối giống mẫu
INSERT INTO pig_breedings (sow_id, boar_id, breeding_date, expected_farrow_date, status, staff_id) VALUES
(1, 3, '2023-08-01', '2023-11-24', 'SUCCESS', 2);

-- Lịch sử đẻ (Đẻ ra 2 con lợn con)
INSERT INTO pig_farrowings (sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_id) VALUES
(1, '2023-11-25', 2, 0, 3.5, 2);

INSERT INTO pigs (name, barn_id, category, lifecycle_status, gender, entry_date, entry_weight, current_weight, farrowing_id, mother_id) VALUES
('Lợn con ổ 1 - 1', 3, 'PIGLET', 'ACTIVE', 'male', '2023-11-25', 1.75, 5, 1, 1),
('Lợn con ổ 1 - 2', 3, 'PIGLET', 'ACTIVE', 'female', '2023-11-25', 1.75, 4.5, 1, 1);

-- Dữ liệu lợn chết
INSERT INTO pig_deaths (pig_id, death_date, reason, disposal_method, recorded_by) VALUES
(8, '2023-12-10', 'Viêm phổi nặng', 'Tiêu hủy', 3);

-- Dữ liệu xuất bán
INSERT INTO sale_batches (sold_at, staff_id) VALUES
('2023-12-15', 1);

INSERT INTO sale_batch_lines (sale_batch_id, pig_id, weight, price, total_amount, reason) VALUES
(1, 7, 100, 55000, 5500000, 'Xuất chuồng chuẩn');

-- Lịch sử tiêm phòng & sử dụng thức ăn
INSERT INTO vaccinations (pig_id, barn_id, vaccine_name, vaccinated_at) VALUES
(NULL, 4, 'Tai xanh', '2023-10-15');

INSERT INTO feed_usages (barn_id, feed_id, quantity_kg, used_at, staff_id) VALUES
(4, 1, 50, '2023-12-01', 2);

-- Báo cáo bệnh
INSERT INTO pig_reports (pig_id, barn_id, reporter_id, description, images, status) VALUES
(4, 4, 2, 'Lợn bỏ ăn từ sáng, đi loạng choạng, da có vết đỏ ở bụng', '[]', 'cho_xu_ly'),
(5, 4, 3, 'Tiêu chảy nặng, phân lỏng màu vàng, lợn gầy rõ rệt', '[]', 'dang_xu_ly');