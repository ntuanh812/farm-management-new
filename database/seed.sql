-- ============================================================
-- FARMPRO PIG - SEED DATA (Dữ liệu mẫu)
-- Chạy sau schema.sql
-- ============================================================

USE farmpro_pig;

-- ============================================================
-- EMPLOYEES
-- ============================================================
INSERT INTO employees (full_name, phone, email, gender, role, status) VALUES
('Nguyễn Văn Admin',   '0901000001', 'admin@farmpro.vn',   'male',   'ADMIN',       'active'),
('Trần Thị Lan',       '0901000002', 'lan@farmpro.vn',     'female', 'FARM_WORKER', 'active'),
('Lê Văn Hùng',        '0901000003', 'hung@farmpro.vn',    'male',   'FARM_WORKER', 'active'),
('Phạm Thị Bác Sĩ',   '0901000004', 'bacsi@farmpro.vn',   'female', 'VET_DOCTOR',  'active');

-- ============================================================
-- ACCOUNTS (password: 123456 - bcrypt hash)
-- Hash được tạo bằng bcrypt saltRounds=10
-- Khi test dùng: bcrypt.hashSync('123456', 10)
-- ============================================================
INSERT INTO accounts (employee_id, username, password_hash, role, is_active) VALUES
(1, 'admin',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN',       1),
(2, 'nhanvien1',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'FARM_WORKER', 1),
(3, 'nhanvien2',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'FARM_WORKER', 1),
(4, 'bacsi1',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'VET_DOCTOR',  1);

-- ============================================================
-- BARNS (Chuồng trại)
-- ============================================================
INSERT INTO barns (name, capacity, barn_type, status, note) VALUES
('Chuồng Nái A1',    20, 'nai',      'active', 'Chuồng nái chính'),
('Chuồng Đực B1',     5, 'duc',      'active', 'Chuồng đực giống'),
('Chuồng Con C1',    50, 'con',      'active', 'Chuồng lợn con sau cai sữa'),
('Chuồng Thịt D1',   40, 'thit',     'active', 'Chuồng lợn thịt vỗ béo'),
('Chuồng Cách Ly E1', 10, 'cach_ly', 'active', 'Chuồng cách ly khi bệnh');

-- ============================================================
-- PIGS (Đàn lợn mẫu)
-- ============================================================
INSERT INTO pigs (pig_code, name, barn_id, category, lifecycle_status, breed, gender, dob, entry_date, entry_weight, current_weight) VALUES
('PIG-001', 'Nái Hoa',   1, 'SOW',       'ACTIVE', 'Yorkshire',   'female', '2022-01-15', '2022-03-01', 30.0,  180.5),
('PIG-002', 'Nái Đào',   1, 'SOW',       'ACTIVE', 'Landrace',    'female', '2022-02-10', '2022-04-01', 28.5,  175.0),
('PIG-003', 'Đực Hùng',  2, 'BOAR',      'ACTIVE', 'Duroc',       'male',   '2021-06-20', '2021-09-01', 35.0,  220.0),
('PIG-004', 'Con-001',   3, 'PIGLET',    'ACTIVE', 'Yorkshire',   'male',   '2024-01-10', '2024-01-10', 1.5,   18.0),
('PIG-005', 'Con-002',   3, 'PIGLET',    'ACTIVE', 'Landrace',    'female', '2024-01-10', '2024-01-10', 1.2,   15.0),
('PIG-006', 'Thịt-001',  4, 'FATTENING', 'ACTIVE', 'Hybrid F1',   'male',   '2023-08-01', '2023-10-01', 20.0, 95.0),
('PIG-007', 'Thịt-002',  4, 'FATTENING', 'ACTIVE', 'Hybrid F1',   'female', '2023-08-05', '2023-10-05', 18.0, 90.5),
('PIG-008', 'Nái Xuân',  5, 'SOW',       'ACTIVE', 'Yorkshire',   'female', '2022-05-01', '2022-07-01', 29.0,  160.0);

-- ============================================================
-- MEDICINES (Danh mục thuốc)
-- ============================================================
INSERT INTO medicines (name, unit, stock, description) VALUES
('Amoxicillin 20%',      'ml',   500.0, 'Kháng sinh phổ rộng'),
('Oxytetracycline',      'ml',   300.0, 'Kháng sinh điều trị hô hấp'),
('Vaccine Dịch Tả Lợn',  'liều', 200.0, 'Vaccine phòng dịch tả lợn cổ điển'),
('Vaccine PRRS',         'liều', 150.0, 'Vaccine hội chứng rối loạn sinh sản'),
('Vitamin C',            'gói',  1000.0,'Bổ sung vitamin tăng đề kháng'),
('Dexamethasone',        'ml',   200.0, 'Chống viêm, chống sốc'),
('Ivermectin',           'ml',   250.0, 'Trị ký sinh trùng'),
('Paracetamol heo',      'viên', 500.0, 'Hạ sốt giảm đau');

-- ============================================================
-- VET_DIAGNOSIS (Chuẩn đoán mẫu)
-- ============================================================
INSERT INTO vet_diagnosis (pig_id, barn_id, diagnosis_date, symptoms, suspected_disease, final_disease, temperature, weight, severity_level, treatment_plan, next_check_date, vet_doctor_id, status, note) VALUES
(8, 5, '2025-04-01', 'Sốt cao, bỏ ăn, thở nhanh', 'Viêm phổi', 'Viêm phổi do Pasteurella', 40.5, 155.0, 'vua',
 'Tiêm Amoxicillin 5mg/kg x 5 ngày, bổ sung Vitamin C', '2025-04-06', 4, 'dang_dieu_tri', 'Cách ly khỏi đàn'),

(6, 4, '2025-04-03', 'Tiêu chảy, mất nước nhẹ', 'Tiêu chảy do vi khuẩn', 'Tiêu chảy E.coli', 39.2, 90.0, 'nhe',
 'Bù điện giải, kháng sinh Oxytetracycline', '2025-04-08', 4, 'dang_dieu_tri', NULL);

-- ============================================================
-- VET_DIAGNOSIS_MEDICINES
-- ============================================================
INSERT INTO vet_diagnosis_medicines (diagnosis_id, medicine_id, dosage, unit, duration_days, note) VALUES
(1, 1, 10.0, 'ml', 5, 'Tiêm bắp sáng sớm'),
(1, 5, 1.0,  'gói', 5, 'Hòa nước uống'),
(2, 2, 8.0,  'ml', 3, 'Tiêm bắp'),
(2, 5, 1.0,  'gói', 3, 'Bổ sung sức đề kháng');

-- ============================================================
-- VACCINATIONS
-- ============================================================
INSERT INTO vaccinations (pig_id, medicine_id, vaccine_date, next_date, dosage, unit, vet_doctor_id, note) VALUES
(1, 3, '2025-01-10', '2025-07-10', 2.0, 'liều', 4, 'Tiêm nhắc lại 6 tháng/lần'),
(2, 3, '2025-01-10', '2025-07-10', 2.0, 'liều', 4, NULL),
(3, 4, '2025-02-15', '2025-08-15', 2.0, 'liều', 4, 'Lợn đực giống tiêm PRRS');

-- ============================================================
-- FEED_USAGES
-- ============================================================
INSERT INTO feed_usages (barn_id, feed_type, quantity_kg, usage_date, note, recorded_by) VALUES
(1, 'Cám nái sinh sản', 80.0,  '2025-04-08', 'Cám cho lợn nái chuồng A1', 2),
(2, 'Cám hỗn hợp',     25.0,  '2025-04-08', NULL, 2),
(3, 'Cám con tập ăn',  30.0,  '2025-04-08', NULL, 3),
(4, 'Cám thịt 559',   160.0,  '2025-04-08', 'Cám vỗ béo giai đoạn cuối', 3);

-- ============================================================
-- BREEDING_RECORDS
-- ============================================================
INSERT INTO breeding_records (sow_id, boar_id, breeding_date, method, status, expected_date, note, recorded_by) VALUES
(1, 3, '2025-02-01', 'natural',    'pregnant', '2025-05-27', 'Thai kỳ bình thường', 2),
(2, 3, '2025-03-10', 'artificial', 'waiting',  '2026-01-14', NULL, 2);

-- ============================================================
-- ACTIVITY_LOGS
-- ============================================================
INSERT INTO activity_logs (account_id, action, target_table, target_id, description) VALUES
(1, 'CREATE_PIG',      'pigs',          8, 'Thêm lợn Nái Xuân vào chuồng cách ly'),
(4, 'CREATE_DIAGNOSIS','vet_diagnosis', 1, 'Tạo phiếu chuẩn đoán cho PIG-008'),
(2, 'CREATE_FEED',     'feed_usages',   1, 'Ghi nhận sử dụng cám chuồng A1');
