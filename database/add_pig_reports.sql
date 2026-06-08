-- ============================================================
-- THÊM BẢNG pig_reports (báo cáo lợn bệnh từ nhân viên)
-- Chạy file này sau khi đã import schema.sql + seed.sql
-- ============================================================

USE farmpro_pig;

CREATE TABLE IF NOT EXISTS pig_reports (
  id            INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  pig_id        INT UNSIGNED NOT NULL COMMENT 'Mã lợn',
  barn_id       INT UNSIGNED NOT NULL COMMENT 'Chuồng',
  reporter_id   INT UNSIGNED NOT NULL COMMENT 'Nhân viên báo cáo',
  description   TEXT         NOT NULL COMMENT 'Mô tả triệu chứng',
  images        JSON                  COMMENT 'Danh sách đường dẫn ảnh',
  status        ENUM('cho_xu_ly','dang_xu_ly','da_xu_ly') DEFAULT 'cho_xu_ly',
  vet_note      TEXT                  COMMENT 'Ghi chú phản hồi của bác sĩ',
  vet_doctor_id INT UNSIGNED          COMMENT 'Bác sĩ xử lý',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (pig_id)        REFERENCES pigs(id)    ON DELETE CASCADE,
  FOREIGN KEY (barn_id)       REFERENCES barns(id)      ON DELETE CASCADE,
  FOREIGN KEY (reporter_id)   REFERENCES staffs(id)  ON DELETE CASCADE,
  FOREIGN KEY (vet_doctor_id) REFERENCES staffs(id)  ON DELETE SET NULL,

  INDEX idx_status    (status),
  INDEX idx_reporter  (reporter_id),
  INDEX idx_barn      (barn_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pig_report_messages (
  id            INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  pig_report_id INT UNSIGNED NOT NULL,
  sender_id     INT UNSIGNED NOT NULL,
  message       TEXT         NOT NULL,
  images        JSON                  COMMENT 'Danh sách đường dẫn ảnh đính kèm',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pig_report_id) REFERENCES pig_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id)     REFERENCES staffs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dữ liệu mẫu
INSERT INTO pig_reports (pig_id, barn_id, reporter_id, description, images, status) VALUES
(4, 4, 2, 'Lợn bỏ ăn từ sáng, đi loạng choạng, da có vết đỏ ở bụng', '[]', 'cho_xu_ly'),
(5, 4, 3, 'Tiêu chảy nặng, phân lỏng màu vàng, lợn gầy rõ rệt', '[]', 'dang_xu_ly');
