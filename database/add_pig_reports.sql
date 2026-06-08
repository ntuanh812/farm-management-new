-- ============================================================
-- THÊM BẢNG pig_reports (báo cáo lợn bệnh từ nhân viên)
-- Chạy file này sau khi đã import schema.sql + seed.sql
-- ============================================================

USE farmpro_pig;


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
