-- ============================================================
-- FARMPRO PIG - DATABASE SCHEMA
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS farmpro_pig
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE farmpro_pig;

-- ============================================================
-- 1. EMPLOYEES (Nhân viên)
-- ============================================================
CREATE TABLE employees (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name    VARCHAR(100)  NOT NULL,
  phone        VARCHAR(20)   UNIQUE,
  email        VARCHAR(100)  UNIQUE,
  address      TEXT,
  gender       ENUM('male','female','other') DEFAULT 'male',
  dob          DATE,
  role         ENUM('ADMIN','FARM_WORKER','VET_DOCTOR') NOT NULL DEFAULT 'FARM_WORKER',
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. ACCOUNTS (Tài khoản đăng nhập)
-- ============================================================
CREATE TABLE accounts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT UNSIGNED NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('ADMIN','FARM_WORKER','VET_DOCTOR') NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  last_login    DATETIME,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_accounts_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_accounts_employee (employee_id),
  INDEX idx_accounts_username (username)
);

-- ============================================================
-- 3. BARNS (Chuồng trại)
-- ============================================================
CREATE TABLE barns (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  capacity     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Sức chứa tối đa',

  barn_type    ENUM(
    'nai',
    'duc',
    'con',
    'thit',
    'cach_ly'
  ) NOT NULL DEFAULT 'thit',

  status       ENUM(
    'active',
    'inactive'
  ) NOT NULL DEFAULT 'active',

  note         TEXT,

  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. PIGS (Đàn lợn)
-- ============================================================
CREATE TABLE pigs (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_code          VARCHAR(50)  NOT NULL UNIQUE   COMMENT 'Mã lợn (VD: PIG-001)',
  name              VARCHAR(100),
  barn_id           INT UNSIGNED NOT NULL,
  category          ENUM('SOW','BOAR','PIGLET','FATTENING') NOT NULL,
  lifecycle_status  ENUM('ACTIVE','SOLD','DEAD') NOT NULL DEFAULT 'ACTIVE',
  breed             VARCHAR(100)  COMMENT 'Giống lợn',
  gender            ENUM('male','female') NOT NULL DEFAULT 'male',
  dob               DATE          COMMENT 'Ngày sinh',
  entry_date        DATE          NOT NULL          COMMENT 'Ngày nhập chuồng',
  entry_weight      DECIMAL(6,2)  COMMENT 'Cân nặng khi nhập (kg)',
  current_weight    DECIMAL(6,2)  COMMENT 'Cân nặng hiện tại (kg)',
  note              TEXT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pigs_barn
    FOREIGN KEY (barn_id) REFERENCES barns(id)
    ON UPDATE CASCADE,

  INDEX idx_pigs_barn      (barn_id),
  INDEX idx_pigs_category  (category),
  INDEX idx_pigs_status    (lifecycle_status)
);

-- ============================================================
-- 5. MEDICINES (Danh mục thuốc)
-- ============================================================
CREATE TABLE medicines (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  unit         VARCHAR(50)  NOT NULL  COMMENT 'Đơn vị: ml, viên, gói...',
  stock        DECIMAL(10,2) NOT NULL DEFAULT 0,
  description  TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. FEED_USAGES (Sử dụng cám)
-- ============================================================
CREATE TABLE feed_usages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  barn_id      INT UNSIGNED NOT NULL,
  feed_type    VARCHAR(100) NOT NULL  COMMENT 'Loại cám',
  quantity_kg  DECIMAL(8,2) NOT NULL,
  usage_date   DATE         NOT NULL,
  note         TEXT,
  recorded_by  INT UNSIGNED  COMMENT 'FK employee',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_feed_barn FOREIGN KEY (barn_id) REFERENCES barns(id) ON UPDATE CASCADE,
  CONSTRAINT fk_feed_emp  FOREIGN KEY (recorded_by) REFERENCES employees(id) ON DELETE SET NULL,

  INDEX idx_feed_barn (barn_id),
  INDEX idx_feed_date (usage_date)
);

-- ============================================================
-- 7. MEDICINE_USAGES (Sử dụng thuốc thông thường)
-- ============================================================
CREATE TABLE medicine_usages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_id       INT UNSIGNED NOT NULL,
  medicine_id  INT UNSIGNED NOT NULL,
  dosage       DECIMAL(8,2) NOT NULL,
  unit         VARCHAR(50)  NOT NULL,
  usage_date   DATE         NOT NULL,
  note         TEXT,
  recorded_by  INT UNSIGNED,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_medu_pig  FOREIGN KEY (pig_id)      REFERENCES pigs(id)      ON UPDATE CASCADE,
  CONSTRAINT fk_medu_med  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON UPDATE CASCADE,
  CONSTRAINT fk_medu_emp  FOREIGN KEY (recorded_by) REFERENCES employees(id) ON DELETE SET NULL,

  INDEX idx_medu_pig  (pig_id),
  INDEX idx_medu_date (usage_date)
);

-- ============================================================
-- 8. VACCINATIONS (Tiêm phòng)
-- ============================================================
CREATE TABLE vaccinations (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_id          INT UNSIGNED NOT NULL,
  medicine_id     INT UNSIGNED NOT NULL,
  vaccine_date    DATE         NOT NULL,
  next_date       DATE,
  dosage          DECIMAL(8,2),
  unit            VARCHAR(50),
  vet_doctor_id   INT UNSIGNED,
  note            TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_vac_pig  FOREIGN KEY (pig_id)        REFERENCES pigs(id)       ON UPDATE CASCADE,
  CONSTRAINT fk_vac_med  FOREIGN KEY (medicine_id)   REFERENCES medicines(id)  ON UPDATE CASCADE,
  CONSTRAINT fk_vac_vet  FOREIGN KEY (vet_doctor_id) REFERENCES employees(id)  ON DELETE SET NULL,

  INDEX idx_vac_pig  (pig_id),
  INDEX idx_vac_date (vaccine_date)
);

-- ============================================================
-- 9. VET_DIAGNOSIS (Chuẩn đoán bệnh)
-- ============================================================
CREATE TABLE vet_diagnosis (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_id           INT UNSIGNED NOT NULL,
  barn_id          INT UNSIGNED NOT NULL,
  diagnosis_date   DATE         NOT NULL,
  symptoms         TEXT         NOT NULL  COMMENT 'Triệu chứng',
  suspected_disease VARCHAR(200)          COMMENT 'Bệnh nghi ngờ',
  final_disease    VARCHAR(200)           COMMENT 'Kết luận bệnh',
  temperature      DECIMAL(4,1)          COMMENT 'Nhiệt độ (°C)',
  weight           DECIMAL(6,2)          COMMENT 'Cân nặng lúc khám (kg)',
  severity_level   ENUM('nhe','vua','nang') NOT NULL DEFAULT 'nhe',
  treatment_plan   TEXT,
  next_check_date  DATE,
  vet_doctor_id    INT UNSIGNED,
  status           ENUM('dang_dieu_tri','da_khoi','tu_vong') NOT NULL DEFAULT 'dang_dieu_tri',
  note             TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_vd_pig  FOREIGN KEY (pig_id)        REFERENCES pigs(id)      ON UPDATE CASCADE,
  CONSTRAINT fk_vd_barn FOREIGN KEY (barn_id)       REFERENCES barns(id)     ON UPDATE CASCADE,
  CONSTRAINT fk_vd_vet  FOREIGN KEY (vet_doctor_id) REFERENCES employees(id) ON DELETE SET NULL,

  INDEX idx_vd_pig    (pig_id),
  INDEX idx_vd_barn   (barn_id),
  INDEX idx_vd_date   (diagnosis_date),
  INDEX idx_vd_status (status)
);

-- ============================================================
-- 10. VET_DIAGNOSIS_MEDICINES (Thuốc dùng trong chuẩn đoán)
-- ============================================================
CREATE TABLE vet_diagnosis_medicines (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  diagnosis_id   INT UNSIGNED NOT NULL,
  medicine_id    INT UNSIGNED NOT NULL,
  dosage         DECIMAL(8,2) NOT NULL,
  unit           VARCHAR(50)  NOT NULL,
  duration_days  INT UNSIGNED NOT NULL DEFAULT 1,
  note           TEXT,

  CONSTRAINT fk_vdm_diag FOREIGN KEY (diagnosis_id) REFERENCES vet_diagnosis(id) ON DELETE CASCADE,
  CONSTRAINT fk_vdm_med  FOREIGN KEY (medicine_id)  REFERENCES medicines(id)     ON UPDATE CASCADE,

  INDEX idx_vdm_diag (diagnosis_id)
);

-- ============================================================
-- 11. BREEDING_RECORDS (Phối giống)
-- ============================================================
CREATE TABLE breeding_records (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sow_id          INT UNSIGNED NOT NULL   COMMENT 'Lợn nái',
  boar_id         INT UNSIGNED            COMMENT 'Lợn đực (NULL nếu thụ tinh nhân tạo)',
  breeding_date   DATE         NOT NULL,
  method          ENUM('natural','artificial') NOT NULL DEFAULT 'natural',
  status          ENUM('waiting','pregnant','failed') NOT NULL DEFAULT 'waiting',
  expected_date   DATE                    COMMENT 'Ngày đẻ dự kiến',
  note            TEXT,
  recorded_by     INT UNSIGNED,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_br_sow  FOREIGN KEY (sow_id)      REFERENCES pigs(id)      ON UPDATE CASCADE,
  CONSTRAINT fk_br_boar FOREIGN KEY (boar_id)     REFERENCES pigs(id)      ON DELETE SET NULL,
  CONSTRAINT fk_br_emp  FOREIGN KEY (recorded_by) REFERENCES employees(id) ON DELETE SET NULL,

  INDEX idx_br_sow  (sow_id),
  INDEX idx_br_date (breeding_date)
);

-- ============================================================
-- 12. FARROWING_RECORDS (Đẻ con)
-- ============================================================
CREATE TABLE farrowing_records (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  breeding_id     INT UNSIGNED NOT NULL,
  sow_id          INT UNSIGNED NOT NULL,
  farrowing_date  DATE         NOT NULL,
  total_born      INT UNSIGNED NOT NULL DEFAULT 0,
  born_alive      INT UNSIGNED NOT NULL DEFAULT 0,
  stillborn       INT UNSIGNED NOT NULL DEFAULT 0,
  note            TEXT,
  recorded_by     INT UNSIGNED,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_fr_breeding FOREIGN KEY (breeding_id) REFERENCES breeding_records(id) ON UPDATE CASCADE,
  CONSTRAINT fk_fr_sow      FOREIGN KEY (sow_id)      REFERENCES pigs(id)             ON UPDATE CASCADE,
  CONSTRAINT fk_fr_emp      FOREIGN KEY (recorded_by) REFERENCES employees(id)        ON DELETE SET NULL,

  INDEX idx_fr_sow  (sow_id),
  INDEX idx_fr_date (farrowing_date)
);

-- ============================================================
-- 13. PIG_MOVEMENTS (Chuyển chuồng)
-- ============================================================
CREATE TABLE pig_movements (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_id         INT UNSIGNED NOT NULL,
  from_barn_id   INT UNSIGNED,
  to_barn_id     INT UNSIGNED NOT NULL,
  move_date      DATE         NOT NULL,
  reason         VARCHAR(200),
  note           TEXT,
  recorded_by    INT UNSIGNED,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_pm_pig      FOREIGN KEY (pig_id)      REFERENCES pigs(id)  ON UPDATE CASCADE,
  CONSTRAINT fk_pm_from     FOREIGN KEY (from_barn_id) REFERENCES barns(id) ON DELETE SET NULL,
  CONSTRAINT fk_pm_to       FOREIGN KEY (to_barn_id)  REFERENCES barns(id)  ON UPDATE CASCADE,
  CONSTRAINT fk_pm_emp      FOREIGN KEY (recorded_by) REFERENCES employees(id) ON DELETE SET NULL,

  INDEX idx_pm_pig  (pig_id),
  INDEX idx_pm_date (move_date)
);

-- ============================================================
-- 14. ACTIVITY_LOGS (Nhật ký hoạt động)
-- ============================================================
CREATE TABLE activity_logs (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id   INT UNSIGNED,
  action       VARCHAR(100) NOT NULL  COMMENT 'VD: CREATE_PIG, DELETE_BARN...',
  target_table VARCHAR(50)           COMMENT 'Bảng bị tác động',
  target_id    INT UNSIGNED,
  description  TEXT,
  ip_address   VARCHAR(45),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_al_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,

  INDEX idx_al_account (account_id),
  INDEX idx_al_date    (created_at)
);
