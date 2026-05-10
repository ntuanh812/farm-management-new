// routes/pigsRoute.js

import pool from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";

export default async function pigsRoute(app) {

  // =========================================================
  // GET ALL PIGS
  // =========================================================
  app.get(
    "/",
    { preHandler: [verifyToken] },

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
    { preHandler: [verifyToken] },

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
    { preHandler: [verifyToken] },

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
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const { id } = request.params;

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