// routes/pigsRoute.js

import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";

export default async function pigsRoute(app) {

  // =========================================================
  // GET ALL PIGS
  // =========================================================
  app.get(
    "/",
    { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') },

    async (request, reply) => {

      try {

        let sql = `
          SELECT
            p.id,
            p.pig_code AS earTag,
            p.name,
            p.barn_id AS barnId,
            b.name AS barnName,
            p.category,
            p.lifecycle_status AS lifecycleStatus,
            p.gender,
            p.dob,
            p.entry_date AS arrivedAt,
            p.entry_weight,
            p.current_weight AS weightKg,
            p.purchase_price AS purchasePrice,
            p.note,
            p.created_at,
            p.updated_at,
            TIMESTAMPDIFF(
              DAY,
              p.dob,
              CURDATE()
            ) AS ageDays,
            (
            EXISTS(SELECT 1 FROM pig_reports pr WHERE pr.pig_id = p.pig_code AND pr.status IN ('cho_xu_ly', 'dang_xu_ly'))
          ) AS isSick,
          (SELECT MAX(death_date) FROM pig_deaths pd WHERE pd.pig_id = p.id) AS deathDate,
          (SELECT MAX(sb.sold_at) FROM sale_batch_lines sbl JOIN sale_batches sb ON sb.id = sbl.sale_batch_id WHERE sbl.ear_tag = p.pig_code) AS soldAt
          FROM pigs p
          LEFT JOIN barns b
          ON b.id = p.barn_id
        `;
        const params = [];

        if (request.user.role === 'FARM_WORKER') {
          // Fallback: Lấy staff_id, dự phòng token cũ đang còn lưu employee_id
          const staffId = request.user.staff_id || request.user.employee_id || request.user.id;
          sql += ' WHERE p.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)';
          params.push(staffId);
        }
        
        sql += ' ORDER BY p.created_at DESC';

        const [rows] = await pool.query(sql, params);

        return reply.send({
          success: true,
          data: rows,
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không tải được danh sách lợn",
        });
      }
    }
  );

  // =========================================================
  // CREATE PIG
  // =========================================================
  app.post(
    "/",
    { preHandler: protect('ADMIN', 'FARM_WORKER') },

    async (request, reply) => {

      try {

        const {
          pig_code,
          name,
          barn_id,
          category,
          gender,
          dob,
          entry_date,
          entry_weight,
          current_weight,
          purchase_price,
          note,
        } = request.body;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (
          !pig_code ||
          !barn_id ||
          !category ||
          !entry_date
        ) {

          return reply.status(400).send({
            success: false,
            message:
              "Thiếu dữ liệu bắt buộc",
          });
        }

        // =====================================================
        // CHECK DUPLICATE CODE
        // =====================================================

        const [exists] =
          await pool.query(
            `
            SELECT id
            FROM pigs
            WHERE pig_code = ?
            `,
            [pig_code]
          );

        if (exists.length > 0) {

          return reply.status(400).send({
            success: false,
            message:
              "Mã lợn đã tồn tại",
          });
        }

        // =====================================================
        // CHECK BARN
        // =====================================================

        const [barnRows] =
          await pool.query(
            `
            SELECT
              capacity,

              (
                SELECT COUNT(*)
                FROM pigs
                WHERE barn_id = ?
                AND lifecycle_status = 'ACTIVE'
              ) AS current_total

            FROM barns
            WHERE id = ?
            `,
            [
              barn_id,
              barn_id,
            ]
          );

        if (!barnRows.length) {

          return reply.status(404).send({
            success: false,
            message:
              "Không tìm thấy chuồng",
          });
        }

        const barn = barnRows[0];

        // =====================================================
        // CHECK CAPACITY
        // =====================================================

        if (
          barn.current_total >=
          barn.capacity
        ) {

          return reply.status(400).send({
            success: false,
            message:
              "Chuồng đã đầy",
          });
        }

        // =====================================================
        // INSERT
        // =====================================================

        await pool.query(
          `
          INSERT INTO pigs
          (
            pig_code,
            name,
            barn_id,
            category,
            gender,
            dob,
            entry_date,
            entry_weight,
            current_weight,
            purchase_price,
            note
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            pig_code,
            name || null,
            barn_id,
            category,
            gender || "male",
            dob || null,
            entry_date,
            entry_weight || null,
            current_weight || null,
            purchase_price || null,
            note || null,
          ]
        );

        return reply.send({
          success: true,
          message:
            "Nhập lợn thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể nhập lợn",
        });
      }
    }
  );

  // =========================================================
  // UPDATE PIG
  // =========================================================
  app.put(
    "/:id",
    { preHandler: protect('ADMIN', 'FARM_WORKER') },

    async (request, reply) => {

      try {

        const { id } = request.params;

        const {
          pig_code,
          name,
          barn_id,
          category,
          gender,
          dob,
          entry_date,
          entry_weight,
          current_weight,
          purchase_price,
          note,
        } = request.body;

        // 1. Lấy trạng thái cũ của lợn để so sánh
        const [oldPig] = await pool.query('SELECT lifecycle_status FROM pigs WHERE id = ?', [id]);
        const oldStatus = oldPig.length > 0 ? oldPig[0].lifecycle_status : null;

        // KHÓA CHỈNH SỬA NẾU LỢN ĐÃ CHẾT HOẶC ĐÃ BÁN
        if (oldStatus === 'DEAD' || oldStatus === 'SOLD') {
          return reply.status(400).send({
            success: false,
            message: "Hồ sơ đã bị khóa. Không thể chỉnh sửa thông tin của lợn đã chết hoặc đã xuất bán."
          });
        }

        await pool.query(
          `
          UPDATE pigs
          SET
            pig_code = ?,
            name = ?,
            barn_id = ?,
            category = ?,
            gender = ?,
            dob = ?,
            entry_date = ?,
            entry_weight = ?,
            current_weight = ?,
            purchase_price = ?,
            note = ?
          WHERE id = ?
          `,
          [
            pig_code,
            name,
            barn_id,
            category,
            gender,
            dob,
            entry_date,
            entry_weight,
            current_weight,
            purchase_price,
            note,
            id,
          ]
        );

        return reply.send({
          success: true,
          message:
            "Cập nhật lợn thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể cập nhật lợn",
        });
      }
    }
  );

  // =========================================================
  // DELETE PIG
  // =========================================================
  app.delete(
    "/:id",
    { preHandler: protect('ADMIN') },

    async (request, reply) => {

      try {

        const { id } = request.params;

        const [pigInfo] = await pool.query('SELECT lifecycle_status FROM pigs WHERE id = ?', [id]);
        if (pigInfo.length > 0 && (pigInfo[0].lifecycle_status === 'SOLD' || pigInfo[0].lifecycle_status === 'DEAD')) {
          return reply.status(400).send({
            success: false,
            message:
              "Không thể xóa lợn đã xuất bán hoặc đã chết để bảo vệ toàn vẹn dữ liệu thống kê.",
          });
        }

        await pool.query(
          `
          DELETE FROM pigs
          WHERE id = ?
          `,
          [id]
        );

        return reply.send({
          success: true,
          message:
            "Xóa lợn thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể xóa lợn",
        });
      }
    }
  );
}