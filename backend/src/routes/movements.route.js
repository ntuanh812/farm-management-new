// routes/movements.route.js

import pool from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";

export default async function movementsRoute(app) {

  // =========================================================
  // GET ALL MOVEMENTS
  // =========================================================
  app.get(
    "/",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        let sql = `
          SELECT
            m.id,
            m.pig_id,
            p.category,
            p.lifecycle_status,
            m.from_barn_id,
            m.to_barn_id,
            b1.name AS from_barn_name,
            b2.name AS to_barn_name,
            m.move_date,
            m.staff_id,
            s.full_name AS staff_name,
            m.note,
            m.created_at
          FROM pig_movements m
          LEFT JOIN pigs p
          ON p.id = m.pig_id
          LEFT JOIN barns b1
          ON b1.id = m.from_barn_id
          LEFT JOIN barns b2
          ON b2.id = m.to_barn_id
          LEFT JOIN staffs s
          ON s.id = m.staff_id
        `;
        const params = [];

        if (request.user.role === 'FARM_WORKER') {
          sql += ' WHERE m.from_barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?) OR m.to_barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)';
          params.push(request.user.staff_id, request.user.staff_id);
        }

        sql += ' ORDER BY m.move_date DESC, m.id DESC';

        const [rows] = await pool.query(sql, params);

        return reply.send({
          success: true,
          data: rows,
        });

      } catch (err) {

        console.error(
          "GET MOVEMENTS ERROR:",
          err
        );

        return reply.status(500).send({
          success: false,
          message:
            "Không tải được lịch sử chuyển chuồng",
        });
      }
    }
  );

  // =========================================================
  // CREATE MOVEMENT
  // =========================================================
  app.post(
    "/",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      const connection =
        await pool.getConnection();

      try {

        await connection.beginTransaction();

        const {
          pig_ids,
          to_barn_id,
          move_date,
          note,
        } = request.body;

        const staffId = request.user.staff_id;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (
          !pig_ids ||
          !Array.isArray(pig_ids) ||
          pig_ids.length === 0
        ) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn lợn",
          });
        }

        if (!to_barn_id) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn chuồng",
          });
        }

        if (!move_date) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn ngày chuyển",
          });
        }

        if (!staffId) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn nhân viên",
          });
        }

        // =====================================================
        // GET STAFF
        // =====================================================

        const [staffRows] =
          await connection.query(
            `
            SELECT
              full_name

            FROM staffs

            WHERE id = ?
            `,
            [staffId]
          );

        if (!staffRows.length) {

          return reply.status(404).send({
            success: false,
            message:
              "Không tìm thấy nhân viên",
          });
        }

        const staffName =
          staffRows[0].full_name;

        // =====================================================
        // CHECK TARGET BARN
        // =====================================================

        const [barnRows] =
          await connection.query(
            `
            SELECT
              b.id,
              b.capacity,

              COUNT(
                CASE
                  WHEN p.lifecycle_status = 'ACTIVE'
                  THEN p.id
                END
              ) AS current_total

            FROM barns b

            LEFT JOIN pigs p
            ON p.barn_id = b.id

            WHERE b.id = ?

            GROUP BY
              b.id,
              b.capacity
            `,
            [to_barn_id]
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
        // GET PIGS
        // =====================================================

        const placeholders =
          pig_ids.map(() => "?").join(",");

        const [pigs] =
          await connection.query(
            `
            SELECT
              id,
              barn_id,
              lifecycle_status

            FROM pigs

            WHERE id IN (${placeholders})
            `,
            pig_ids
          );

        if (!pigs.length) {

          return reply.status(404).send({
            success: false,
            message:
              "Không tìm thấy lợn",
          });
        }

        // =====================================================
        // VALID ACTIVE PIGS
        // =====================================================

        const validPigs =
          pigs.filter(
            (pig) =>
              pig.lifecycle_status ===
                "ACTIVE" &&
              Number(
                pig.barn_id
              ) !==
                Number(
                to_barn_id
                )
          );

        if (!validPigs.length) {

          return reply.status(400).send({
            success: false,
            message:
              "Không có lợn hợp lệ để chuyển",
          });
        }

        // =====================================================
        // CHECK CAPACITY
        // =====================================================

        const totalAfterMove =
          Number(
            barn.current_total
          ) +
          validPigs.length;

        if (
          barn.capacity &&
          totalAfterMove >
            barn.capacity
        ) {

          return reply.status(400).send({
            success: false,
            message:
              "Chuồng vượt quá sức chứa",
          });
        }

        // =====================================================
        // INSERT MOVEMENTS
        // =====================================================

        for (const pig of validPigs) {

          // INSERT HISTORY
          await connection.query(
            `
            INSERT INTO pig_movements
            (
              pig_id,
              from_barn_id,
              to_barn_id,
              move_date,
            staff_id,
              note
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              pig.id,
              pig.barn_id,
              to_barn_id,
              move_date,
            staffId,
              note || null,
            ]
          );

          // UPDATE PIG
          await connection.query(
            `
            UPDATE pigs

            SET
              barn_id = ?,
              updated_at = NOW()

            WHERE id = ?
            `,
            [
              to_barn_id,
              pig.id,
            ]
          );
        }

        // =====================================================
        // COMMIT
        // =====================================================

        await connection.commit();

        return reply.send({
          success: true,

          moved_count:
            validPigs.length,

          message:
            "Chuyển chuồng thành công",
        });

      } catch (err) {

        await connection.rollback();

        console.error(
          "CREATE MOVEMENT ERROR:",
          err
        );

        return reply.status(500).send({
          success: false,
          message:
            "Không thể chuyển chuồng",
        });

      } finally {

        connection.release();
      }
    }
  );

  // =========================================================
  // DELETE MOVEMENT
  // =========================================================
  app.delete(
    "/:id",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const { id } =
          request.params;

        const [rows] =
          await pool.query(
            `
            SELECT id
            FROM pig_movements
            WHERE id = ?
            `,
            [id]
          );

        if (!rows.length) {

          return reply.status(404).send({
            success: false,
            message:
              "Không tìm thấy lịch sử",
          });
        }

        await pool.query(
          `
          DELETE FROM pig_movements
          WHERE id = ?
          `,
          [id]
        );

        return reply.send({
          success: true,
          message:
            "Xóa lịch sử thành công",
        });

      } catch (err) {

        console.error(
          "DELETE MOVEMENT ERROR:",
          err
        );

        return reply.status(500).send({
          success: false,
          message:
            "Không thể xóa lịch sử",
        });
      }
    }
  );
}