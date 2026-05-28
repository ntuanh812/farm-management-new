-- ============================================================
-- FARMPRO PIG - COMPLETE DATABASE SCHEMA
-- MYSQL 8+
-- ============================================================

DROP DATABASE IF EXISTS farmpro_pig;

CREATE DATABASE farmpro_pig
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE farmpro_pig;

-- ============================================================
-- 0. RBAC (Roles & Permissions)
-- ============================================================

CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'ADMIN', 'FARM_WORKER', 'VET_DOCTOR'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'PIG_VIEW', 'PIG_CREATE', 'BARN_MANAGE'
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL, -- e.g., 'PIG', 'BARN', 'STAFF'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================================
-- 1. staffS
-- ============================================================

CREATE TABLE staffs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    address TEXT,
    gender ENUM('male', 'female', 'other') DEFAULT 'male',
    dob DATE,
    role_id INT UNSIGNED,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    avatar_url VARCHAR(255) NULL,
    notes TEXT,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

-- ============================================================
-- 2. ACCOUNTS
-- ============================================================

CREATE TABLE accounts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_staff FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 3. BARNS
-- ============================================================

CREATE TABLE barns (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    capacity INT UNSIGNED NOT NULL DEFAULT 0,
    barn_type VARCHAR(50) NOT NULL DEFAULT 'FATTENING',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    note TEXT,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 3.5. staff_BARNS (Barn-Level Access)
-- ============================================================

CREATE TABLE staff_barns (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    barn_id INT UNSIGNED NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eb_staff FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE,
    CONSTRAINT fk_eb_barn FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (staff_id, barn_id)
);

-- ============================================================
-- 4. FEEDS
-- ============================================================

CREATE TABLE feeds (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    unit VARCHAR(50) NOT NULL DEFAULT 'kg',
    stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. PIGS
-- ============================================================

CREATE TABLE pigs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pig_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100),
    barn_id INT UNSIGNED NOT NULL,
    category ENUM('SOW', 'BOAR', 'PIGLET', 'FATTENING') NOT NULL,
    lifecycle_status ENUM('ACTIVE', 'SOLD', 'DEAD') NOT NULL DEFAULT 'ACTIVE',
    breed VARCHAR(100),
    gender ENUM('male', 'female') NOT NULL DEFAULT 'male',
    dob DATE,
    entry_date DATE NOT NULL,
    entry_weight DECIMAL(6,2),
    current_weight DECIMAL(6,2),
    purchase_price DECIMAL(15,2) DEFAULT 0,
    farrowing_id INT UNSIGNED DEFAULT NULL COMMENT 'ID của ổ đẻ',
    mother_id INT UNSIGNED DEFAULT NULL COMMENT 'ID lợn nái mẹ',
    note TEXT,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pigs_barn FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_pigs_barn (barn_id),
    INDEX idx_pigs_code (pig_code),
    INDEX idx_pigs_status (lifecycle_status)
);

-- ============================================================
-- 6. PIG MOVEMENTS
-- ============================================================

CREATE TABLE pig_movements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pig_id INT UNSIGNED NOT NULL,
    from_barn_id INT UNSIGNED,
    to_barn_id INT UNSIGNED,
    move_date DATE NOT NULL,
    staff_name VARCHAR(255),
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pm_pig FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pm_from FOREIGN KEY (from_barn_id) REFERENCES barns(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pm_to FOREIGN KEY (to_barn_id) REFERENCES barns(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_pm_pig (pig_id),
    INDEX idx_pm_date (move_date)
);

-- ============================================================
-- 7. MEDICINES
-- ============================================================

CREATE TABLE medicines (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    import_date DATE,
    expiry_date DATE,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. FEED USAGES
-- ============================================================

CREATE TABLE feed_usages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    barn_id INT UNSIGNED NOT NULL,
    feed_type VARCHAR(100) NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL,
    used_at DATE NOT NULL,
    staff_name VARCHAR(100),
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feed_barn FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE
);

-- ============================================================
-- 9. MEDICINE USAGES
-- ============================================================

CREATE TABLE medicine_usages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    barn_id INT UNSIGNED NOT NULL,
    medicine_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    used_at DATE NOT NULL,
    staff_name VARCHAR(100),
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_medu_barn FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE
);

-- ============================================================
-- 10. VACCINATIONS
-- ============================================================

CREATE TABLE vaccinations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pig_id INT UNSIGNED,
    barn_id INT UNSIGNED,
    vaccine_name VARCHAR(100) NOT NULL,
    vaccinated_at DATE NOT NULL,
    performed_by INT UNSIGNED,
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vac_pig FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE,
    CONSTRAINT fk_vac_barn FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE,
    CONSTRAINT fk_vac_emp FOREIGN KEY (performed_by) REFERENCES staffs(id) ON DELETE SET NULL
);

-- ============================================================
-- 11. AUDIT LOGS (formerly Activity Logs)
-- ============================================================

CREATE TABLE audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id INT UNSIGNED,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
    table_name VARCHAR(50),
    record_id INT UNSIGNED,
    old_data JSON,
    new_data JSON,
    description TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================
-- 12. CÁC BẢNG MỚI ĐÃ ĐƯỢC THÊM QUÁ TRÌNH REFACTOR
-- ============================================================

CREATE TABLE pig_deaths (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_id INT UNSIGNED NOT NULL,
  death_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  disposal_method VARCHAR(255),
  note TEXT,
  recorded_by VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE
);

CREATE TABLE pig_breedings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sow_id INT UNSIGNED NOT NULL,
  boar_id INT UNSIGNED NOT NULL,
  breeding_date DATE NOT NULL,
  expected_farrow_date DATE,
  status VARCHAR(50) DEFAULT 'PENDING',
  staff_name VARCHAR(100),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sow_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (boar_id) REFERENCES pigs(id) ON DELETE CASCADE
);

CREATE TABLE pig_farrowings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sow_id INT UNSIGNED NOT NULL,
  farrow_date DATE NOT NULL,
  alive_piglets INT NOT NULL DEFAULT 0,
  dead_piglets INT NOT NULL DEFAULT 0,
  total_weight DECIMAL(10,2),
  staff_name VARCHAR(100),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sow_id) REFERENCES pigs(id) ON DELETE CASCADE
);

CREATE TABLE sale_batches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sold_at DATE NOT NULL,
  staff_name VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_batch_lines (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_batch_id INT UNSIGNED NOT NULL,
  ear_tag VARCHAR(50) NOT NULL,
  weight DECIMAL(10, 2) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  reason VARCHAR(255),
  note TEXT,
  FOREIGN KEY (sale_batch_id) REFERENCES sale_batches(id) ON DELETE CASCADE
);

-- ============================================================
-- 13. THÚ Y VÀ BÁO CÁO BỆNH
-- ============================================================

CREATE TABLE IF NOT EXISTS pig_reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_id VARCHAR(50) NOT NULL COMMENT 'Mã lợn',
  barn_id INT UNSIGNED NOT NULL COMMENT 'Chuồng',
  reporter_id INT UNSIGNED NOT NULL COMMENT 'Nhân viên báo cáo',
  description TEXT NOT NULL COMMENT 'Mô tả triệu chứng',
  images JSON COMMENT 'Danh sách đường dẫn ảnh',
  status VARCHAR(50) DEFAULT 'cho_xu_ly',
  vet_note TEXT COMMENT 'Ghi chú phản hồi của bác sĩ',
  vet_doctor_id INT UNSIGNED COMMENT 'Bác sĩ xử lý',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES staffs(id) ON DELETE CASCADE,
  FOREIGN KEY (vet_doctor_id) REFERENCES staffs(id) ON DELETE SET NULL
);

-- ============================================================
-- INITIAL SEED DATA FOR RBAC
-- ============================================================

INSERT INTO roles (id, code, name, description) VALUES
(1, 'ADMIN', 'Quản trị viên', 'Có toàn quyền hệ thống'),
(2, 'FARM_WORKER', 'Nhân viên', 'Quản lý lợn, chuồng trại được phân công'),
(3, 'VET_DOCTOR', 'Bác sĩ thú y', 'Quản lý sức khỏe, tiêm phòng, chuẩn đoán');

-- ============================================================
-- TÀI KHOẢN ADMIN MẶC ĐỊNH (Mật khẩu: 123456)
-- ============================================================

INSERT INTO staffs (id, full_name, phone, email, role_id) VALUES
(1, 'Admin System', '0987654321', 'admin@farmpro.com', 1);

INSERT INTO accounts (id, staff_id, username, password_hash, is_active) VALUES
(1, 1, 'admin', '123456', 1);

-- ============================================================
-- CẬP NHẬT CÁC RÀNG BUỘC KHÓA NGOẠI CHÉO (CIRCULAR DEPENDENCY)
-- ============================================================

ALTER TABLE pigs
  ADD CONSTRAINT fk_pigs_farrowing FOREIGN KEY (farrowing_id) REFERENCES pig_farrowings(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_pigs_mother FOREIGN KEY (mother_id) REFERENCES pigs(id) ON DELETE SET NULL;
