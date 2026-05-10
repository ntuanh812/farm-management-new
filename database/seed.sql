USE farmpro_pig;

-- ============================================================
-- EMPLOYEES
-- ============================================================

INSERT INTO employees
(
    full_name,
    phone,
    email,
    gender,
    role,
    status
)
VALUES
(
    'Nguyễn Văn Admin',
    '0901000001',
    'admin@farmpro.vn',
    'male',
    'ADMIN',
    'active'
),
(
    'Trần Thị Lan',
    '0901000002',
    'lan@farmpro.vn',
    'female',
    'FARM_WORKER',
    'active'
),
(
    'Lê Văn Hùng',
    '0901000003',
    'hung@farmpro.vn',
    'male',
    'FARM_WORKER',
    'active'
),
(
    'Phạm Thị Bác Sĩ',
    '0901000004',
    'bacsi@farmpro.vn',
    'female',
    'VET_DOCTOR',
    'active'
);

-- ============================================================
-- ACCOUNTS
-- password = 123456
-- ============================================================

INSERT INTO accounts
(
    employee_id,
    username,
    password_hash,
    is_active
)
VALUES
(
    1,
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    1
),
(
    2,
    'nhanvien1',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    1
),
(
    3,
    'nhanvien2',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    1
),
(
    4,
    'bacsi1',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    1
);

-- ============================================================
-- BARNS
-- ============================================================

INSERT INTO barns
(
    code,
    name,
    capacity,
    barn_type,
    status,
    note
)
VALUES
(
    'NAI-A1',
    'Chuồng Nái A1',
    20,
    'nai',
    'active',
    'Chuồng nái chính'
),
(
    'DUC-B1',
    'Chuồng Đực B1',
    5,
    'duc',
    'active',
    'Chuồng đực giống'
),
(
    'CON-C1',
    'Chuồng Con C1',
    50,
    'con',
    'active',
    'Chuồng lợn con'
),
(
    'THIT-D1',
    'Chuồng Thịt D1',
    40,
    'thit',
    'active',
    'Chuồng lợn thịt'
),
(
    'ISO-E1',
    'Chuồng Cách Ly E1',
    10,
    'cach_ly',
    'active',
    'Chuồng cách ly'
);

-- ============================================================
-- FEEDS
-- ============================================================

INSERT INTO feeds
(
    name,
    brand,
    unit,
    stock,
    description
)
VALUES
(
    'Cám nái sinh sản',
    'CP',
    'kg',
    1000,
    'Dùng cho lợn nái'
),
(
    'Cám thịt 559',
    'Cargill',
    'kg',
    2000,
    'Dùng cho lợn thịt'
),
(
    'Cám con tập ăn',
    'GreenFeed',
    'kg',
    500,
    'Dùng cho lợn con'
);

-- ============================================================
-- PIGS
-- ============================================================

INSERT INTO pigs
(
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
    current_weight
)
VALUES
(
    'PIG-001',
    'Nái Hoa',
    1,
    'SOW',
    'ACTIVE',
    'Yorkshire',
    'female',
    '2022-01-15',
    '2022-03-01',
    30,
    180
),
(
    'PIG-002',
    'Đực Hùng',
    2,
    'BOAR',
    'ACTIVE',
    'Duroc',
    'male',
    '2021-06-20',
    '2021-09-01',
    35,
    220
),
(
    'PIG-003',
    'Con-001',
    3,
    'PIGLET',
    'ACTIVE',
    'Landrace',
    'male',
    '2024-01-10',
    '2024-01-10',
    1.5,
    18
),
(
    'PIG-004',
    'Thịt-001',
    4,
    'FATTENING',
    'ACTIVE',
    'Hybrid F1',
    'male',
    '2023-08-01',
    '2023-10-01',
    20,
    95
);

-- ============================================================
-- MEDICINES
-- ============================================================

INSERT INTO medicines
(
    name,
    unit,
    stock,
    description
)
VALUES
(
    'Amoxicillin 20%',
    'ml',
    500,
    'Kháng sinh phổ rộng'
),
(
    'Vitamin C',
    'gói',
    1000,
    'Bổ sung vitamin'
),
(
    'Vaccine PRRS',
    'liều',
    200,
    'Vaccine PRRS'
);

-- ============================================================
-- FEED USAGES
-- ============================================================

INSERT INTO feed_usages
(
    barn_id,
    feed_id,
    quantity_kg,
    usage_date,
    note,
    recorded_by
)
VALUES
(
    1,
    1,
    80,
    '2025-04-08',
    'Cho lợn nái ăn',
    2
),
(
    4,
    2,
    160,
    '2025-04-08',
    'Cho lợn thịt ăn',
    3
);

-- ============================================================
-- VACCINATIONS
-- ============================================================

INSERT INTO vaccinations
(
    pig_id,
    medicine_id,
    vaccine_date,
    next_date,
    dosage,
    unit,
    vet_doctor_id,
    note
)
VALUES
(
    1,
    3,
    '2025-01-10',
    '2025-07-10',
    2,
    'liều',
    4,
    'Tiêm định kỳ'
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

INSERT INTO activity_logs
(
    account_id,
    action,
    target_table,
    target_id,
    description
)
VALUES
(
    1,
    'CREATE',
    'pigs',
    1,
    'Tạo lợn mới'
),
(
    1,
    'UPDATE',
    'barns',
    1,
    'Cập nhật chuồng'
);