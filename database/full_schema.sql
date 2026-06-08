-- ============================================================
-- TỔNG HỢP DATABASE SCHEMA - FARM MANAGEMENT
-- Chứa toàn bộ cấu trúc bảng và các cập nhật mới nhất (Tồn kho, Cám, Thuốc, Vaccine, Báo cáo)
-- ============================================================

CREATE DATABASE IF NOT EXISTS farmpro_pig DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE farmpro_pig;

-- 1. Bảng Vai trò (Roles)
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Bảng Nhân viên (Staffs)
CREATE TABLE IF NOT EXISTS staffs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  gender ENUM('male', 'female', 'other') DEFAULT 'male',
  dob DATE,
  address TEXT,
  avatar_url VARCHAR(255),
  role_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bảng Tài khoản (Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bảng Chuồng trại (Barns)
CREATE TABLE IF NOT EXISTS barns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  capacity INT NOT NULL,
  barn_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Bảng Phân công chuồng cho nhân viên (Staff_Barns)
CREATE TABLE IF NOT EXISTS staff_barns (
  staff_id INT NOT NULL,
  barn_id INT NOT NULL,
  PRIMARY KEY (staff_id, barn_id),
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Bảng Quản lý Đàn Lợn (Pigs)
CREATE TABLE IF NOT EXISTS pigs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  barn_id INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  lifecycle_status VARCHAR(50) DEFAULT 'ACTIVE',
  gender ENUM('male', 'female', 'other') DEFAULT 'male',
  dob DATE,
  entry_date DATE NOT NULL,
  entry_weight DECIMAL(10,2),
  current_weight DECIMAL(10,2),
  purchase_price DECIMAL(15,2),
  farrowing_id INT NULL,
  mother_id INT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Bảng Lịch sử chuyển chuồng (Pig_Movements)
CREATE TABLE IF NOT EXISTS pig_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pig_id INT NOT NULL,
  from_barn_id INT NOT NULL,
  to_barn_id INT NOT NULL,
  move_date DATE NOT NULL,
  staff_id INT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (from_barn_id) REFERENCES barns(id) ON DELETE CASCADE,
  FOREIGN KEY (to_barn_id) REFERENCES barns(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Bảng Báo cáo lợn chết (Pig_Deaths)
CREATE TABLE IF NOT EXISTS pig_deaths (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pig_id INT NOT NULL,
  death_date DATE NOT NULL,
  reason VARCHAR(255),
  disposal_method VARCHAR(255),
  note TEXT,
  recorded_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES staffs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Bảng Phối giống (Pig_Breedings)
CREATE TABLE IF NOT EXISTS pig_breedings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sow_id INT NOT NULL,
  boar_id INT NOT NULL,
  breeding_date DATE NOT NULL,
  expected_farrow_date DATE,
  status VARCHAR(50) DEFAULT 'PENDING',
  staff_id INT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sow_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (boar_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Bảng Đẻ con (Pig_Farrowings)
CREATE TABLE IF NOT EXISTS pig_farrowings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sow_id INT NOT NULL,
  farrow_date DATE NOT NULL,
  alive_piglets INT DEFAULT 0,
  dead_piglets INT DEFAULT 0,
  total_weight DECIMAL(10,2) DEFAULT 0,
  staff_id INT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sow_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Bảng Phiếu xuất bán tổng (Sale_Batches)
CREATE TABLE IF NOT EXISTS sale_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sold_at DATETIME NOT NULL,
  staff_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Bảng Chi tiết lợn xuất bán (Sale_Batch_Lines)
CREATE TABLE IF NOT EXISTS sale_batch_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_batch_id INT NOT NULL,
  pig_id INT NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  reason TEXT,
  note TEXT,
  FOREIGN KEY (sale_batch_id) REFERENCES sale_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Bảng Danh mục Cám & Tồn kho (Feeds)
CREATE TABLE IF NOT EXISTS feeds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stock DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Bảng Ghi nhận tiêu thụ Cám (Feed_Usages)
CREATE TABLE IF NOT EXISTS feed_usages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barn_id INT NOT NULL,
  feed_id INT NOT NULL,
  quantity_kg DECIMAL(10,2) NOT NULL,
  used_at DATE NOT NULL,
  staff_id INT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Bảng Danh mục Thuốc Thú y & Tồn kho (Medicines)
CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  stock DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Bảng Ghi nhận sử dụng Thuốc (Medicine_Usages)
CREATE TABLE IF NOT EXISTS medicine_usages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barn_id INT NOT NULL,
  pig_id INT NULL,
  medicine_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  used_at DATE NOT NULL,
  staff_id INT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE,
  FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Bảng Danh mục Vaccine & Tồn kho (Vaccines)
CREATE TABLE IF NOT EXISTS vaccines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  stock DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Bảng Ghi nhận Tiêm phòng (Vaccine_Usages)
CREATE TABLE IF NOT EXISTS vaccine_usages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pig_id INT NULL,
  barn_id INT NULL,
  vaccine_id INT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50),
  vaccinated_at DATE NOT NULL,
  performed_by INT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE,
  FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES staffs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Bảng Ghi nhận Báo cáo lợn bệnh (Pig_Reports)
CREATE TABLE IF NOT EXISTS pig_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pig_id INT NOT NULL,
  barn_id INT NOT NULL,
  reporter_id INT NOT NULL,
  description TEXT NOT NULL,
  images JSON COMMENT 'Danh sách đường dẫn ảnh',
  status ENUM('cho_xu_ly','dang_xu_ly','da_xu_ly') DEFAULT 'cho_xu_ly',
  vet_note TEXT COMMENT 'Ghi chú phản hồi của bác sĩ',
  vet_doctor_id INT NULL COMMENT 'Bác sĩ xử lý',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES staffs(id) ON DELETE CASCADE,
  FOREIGN KEY (vet_doctor_id) REFERENCES staffs(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_reporter (reporter_id),
  INDEX idx_barn (barn_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Bảng Tin nhắn báo cáo (Pig_Report_Messages)
CREATE TABLE IF NOT EXISTS pig_report_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pig_report_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  images JSON COMMENT 'Danh sách đường dẫn ảnh đính kèm',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pig_report_id) REFERENCES pig_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES staffs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;