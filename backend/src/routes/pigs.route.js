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

        const [rows] = await pool.query(`
          SELECT
            p.id,

            p.pig_code AS earTag,

            p.name,

            p.barn_id AS barnId,

            b.name AS barnName,

            p.category,

            p.lifecycle_status AS lifecycleStatus,

            p.breed,

            p.gender,

            p.dob,

            p.entry_date AS arrivedAt,

            p.entry_weight,

            p.current_weight AS weightKg,

            p.note,

            p.created_at,

            p.updated_at,

            TIMESTAMPDIFF(
              DAY,
              p.dob,
              CURDATE()
            ) AS ageDays

          FROM pigs p

          LEFT JOIN barns b
          ON b.id = p.barn_id

          ORDER BY p.created_at DESC
        `);

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
          breed,
          gender,
          dob,
          entry_date,
          entry_weight,
          current_weight,
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
            breed,
            gender,
            dob,
            entry_date,
            entry_weight,
            current_weight,
            note
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            pig_code,
            name || null,
            barn_id,
            category,
            breed || null,
            gender || "male",
            dob || null,
            entry_date,
            entry_weight || null,
            current_weight || null,
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
          lifecycle_status,
          breed,
          gender,
          dob,
          entry_date,
          entry_weight,
          current_weight,
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
            lifecycle_status = ?,
            breed = ?,
            gender = ?,
            dob = ?,
            entry_date = ?,
            entry_weight = ?,
            current_weight = ?,
            note = ?
          WHERE id = ?
          `,
          [
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
            current_weight,
            note,
            id,
          ]
        );

        // 2. ĐỒNG BỘ: Nếu trạng thái đổi thành DEAD, tự động tạo bản ghi bên Lợn chết
        if (oldStatus !== 'DEAD' && lifecycle_status === 'DEAD') {
          await pool.query(
            `INSERT INTO pig_deaths (pig_id, death_date, reason, disposal_method, recorded_by, note)
             VALUES (?, CURDATE(), ?, ?, ?, ?)`,
            [id, 'Chưa xác định', 'Khác', 'Hệ thống', 'Tự động tạo khi chuyển trạng thái ở Danh sách lợn']
          );
        }

        // 3. ĐỒNG BỘ: Nếu trạng thái đổi thành SOLD, tự động tạo bản ghi bên Xuất bán
        if (oldStatus !== 'SOLD' && lifecycle_status === 'SOLD') {
          const [batchRes] = await pool.query(
            'INSERT INTO sale_batches (sold_at, staff_name) VALUES (CURDATE(), ?)',
            ['Hệ thống']
          );
          await pool.query(
            'INSERT INTO sale_batch_lines (sale_batch_id, ear_tag, weight, price, total_amount, reason, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [batchRes.insertId, pig_code, current_weight || 0, 0, 0, 'Xuất bán tự động', 'Tự động tạo khi chuyển trạng thái ở Danh sách lợn']
          );
        }

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