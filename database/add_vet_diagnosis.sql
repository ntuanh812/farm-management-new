-- ============================================================
-- THÊM BẢNG CHUẨN ĐOÁN VÀ ĐƠN THUỐC THÚ Y
-- ============================================================
USE farmpro_pig;

CREATE TABLE IF NOT EXISTS vet_diagnosis (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pig_id VARCHAR(50) NOT NULL COMMENT 'Có thể nhập mã lợn thủ công',
  barn_id INT UNSIGNED NOT NULL,
  diagnosis_date DATE NOT NULL,
  next_check_date DATE,
  symptoms TEXT,
  suspected_disease VARCHAR(255),
  final_disease VARCHAR(255),
  temperature DECIMAL(4,1),
  severity_level ENUM('nhe', 'trung_binh', 'nang') DEFAULT 'nhe',
  status ENUM('dang_dieu_tri', 'da_khoi', 'chet') DEFAULT 'dang_dieu_tri',
  treatment_plan TEXT,
  vet_name VARCHAR(100),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barn_id) REFERENCES barns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vet_diagnosis_medicines (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  diagnosis_id INT UNSIGNED NOT NULL,
  medicine_id INT UNSIGNED NOT NULL,
  dosage VARCHAR(50),
  unit VARCHAR(20),
  duration_days INT DEFAULT 1,
  FOREIGN KEY (diagnosis_id) REFERENCES vet_diagnosis(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);