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

      const [rows] = await pool.query(`
        SELECT
          b.id,
          b.name,
          b.capacity,

          COUNT(
            CASE
              WHEN p.lifecycle_status = 'ACTIVE'
              THEN p.id
            END
          ) AS current_quantity,

          b.barn_type AS purpose,
          b.status,
          b.created_at AS createdAt

        FROM barns b

        LEFT JOIN pigs p
        ON p.barn_id = b.id

        GROUP BY
          b.id,
          b.name,
          b.capacity,
          b.barn_type,
          b.status,
          b.created_at

        ORDER BY b.name
      `);

      return reply.send({
        success: true,
        data: rows,
      });
    }
  );

  // =========================================================
  // CREATE BARN
  // =========================================================
  app.post(
    "/",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      const {
        name,
        purpose,
        capacity,
      } = request.body;

      await pool.query(
        `
        INSERT INTO barns
        (
          name,
          capacity,
          barn_type
        )
        VALUES (?, ?, ?)
        `,
        [
          name,
          capacity,
          purpose,
        ]
      );

      return reply.send({
        success: true,
        message: "Tạo chuồng thành công",
      });
    }
  );

  // =========================================================
  // UPDATE BARN
  // =========================================================
  app.put(
    "/:id",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      const { id } = request.params;

      const {
        name,
        purpose,
        capacity,
      } = request.body;

      await pool.query(
        `
        UPDATE barns
        SET
          name = ?,
          capacity = ?,
          barn_type = ?
        WHERE id = ?
        `,
        [
          name,
          capacity,
          purpose,
          id,
        ]
      );

      return reply.send({
        success: true,
        message:
          "Cập nhật chuồng thành công",
      });
    }
  );

  // =========================================================
  // DELETE BARN
  // =========================================================
  app.delete(
    "/:id",
    { preHandler: [verifyToken] },

    async (request, reply) => {

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

      // DELETE
      await pool.query(
        `
        DELETE FROM barns
        WHERE id = ?
        `,
        [id]
      );

      return reply.send({
        success: true,
        message:
          "Xóa chuồng thành công",
      });
    }
  );
}