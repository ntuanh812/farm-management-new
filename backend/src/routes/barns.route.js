import pool from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";

export default async function barnsRoute(app) {

  // =========================================================
  // GET ALL BARNS
  // =========================================================
  app.get(
  "/",
  { preHandler: [verifyToken] },

  async (request, reply) => {

    try {

      const [rows] = await pool.query(`
        SELECT
          b.id,
          b.code,
          b.name,
          b.capacity,
          b.barn_type,
          b.status,
          b.note,
          b.created_at,

          COUNT(
            CASE
              WHEN p.lifecycle_status = 'ACTIVE'
              THEN p.id
            END
          ) AS current_quantity

        FROM barns b

        LEFT JOIN pigs p
        ON p.barn_id = b.id

        WHERE b.deleted_at IS NULL

        GROUP BY b.id

        ORDER BY b.name ASC
      `);

      return reply.send({
        success: true,
        data: rows,
      });

    } catch (err) {

      console.error("GET BARNS ERROR:", err);

      return reply.status(500).send({
        success: false,
        message: err.message,
      });
    }
  }
);

  // =========================================================
  // CREATE BARN
  // =========================================================
  app.post(
    "/",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const {
          code,
          name,
          barn_type,
          capacity,
          note,
        } = request.body;

        // CHECK CODE
        const [exists] = await pool.query(
          `
          SELECT id
          FROM barns
          WHERE code = ?
          LIMIT 1
          `,
          [code]
        );

        if (exists.length > 0) {

          return reply.status(400).send({
            success: false,
            message:
              "Mã chuồng đã tồn tại",
          });
        }

        await pool.query(
          `
          INSERT INTO barns
          (
            code,
            name,
            capacity,
            barn_type,
            note
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            code,
            name,
            capacity,
            barn_type,
            note || null,
          ]
        );

        return reply.send({
          success: true,
          message:
            "Thêm chuồng thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể tạo chuồng",
        });
      }
    }
  );

  // =========================================================
  // UPDATE BARN
  // =========================================================
  app.put(
    "/:id",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const { id } = request.params;

        const {
          code,
          name,
          barn_type,
          capacity,
          status,
          note,
        } = request.body;

        // CHECK DUPLICATE CODE
        const [exists] = await pool.query(
          `
          SELECT id
          FROM barns
          WHERE code = ?
          AND id != ?
          LIMIT 1
          `,
          [code, id]
        );

        if (exists.length > 0) {

          return reply.status(400).send({
            success: false,
            message:
              "Mã chuồng đã tồn tại",
          });
        }

        await pool.query(
          `
          UPDATE barns
          SET
            code = ?,
            name = ?,
            capacity = ?,
            barn_type = ?,
            status = ?,
            note = ?
          WHERE id = ?
          `,
          [
            code,
            name,
            capacity,
            barn_type,
            status,
            note || null,
            id,
          ]
        );

        return reply.send({
          success: true,
          message:
            "Cập nhật chuồng thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể cập nhật chuồng",
        });
      }
    }
  );

  // =========================================================
  // DELETE BARN
  // =========================================================
  app.delete(
    "/:id",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const { id } = request.params;

        // CHECK ACTIVE PIGS
        const [pigRows] = await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM pigs
          WHERE barn_id = ?
          AND lifecycle_status = 'ACTIVE'
          `,
          [id]
        );

        const totalPigs =
          pigRows[0].total;

        // BLOCK DELETE
        if (totalPigs > 0) {

          return reply.status(400).send({
            success: false,
            message:
              "Chuồng vẫn còn vật nuôi. Hãy chuyển chuồng trước khi xóa.",
          });
        }

        // SOFT DELETE
        await pool.query(
          `
          UPDATE barns
          SET deleted_at = NOW()
          WHERE id = ?
          `,
          [id]
        );

        return reply.send({
          success: true,
          message:
            "Xóa chuồng thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể xóa chuồng",
        });
      }
    }
  );
}