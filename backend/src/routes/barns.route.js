import pool from '../config/db.js'
import { verifyToken } from '../middleware/auth.js'

export default async function barnsRoute(app) {
  // GET /api/barns — lấy danh sách chuồng (tất cả role đều cần)
  app.get('/', { preHandler: [verifyToken] }, async (request, reply) => {
    const [rows] = await pool.query(
      'SELECT id, name, capacity, barn_type, status FROM barns ORDER BY name'
    )
    return reply.send({ success: true, data: rows })
  })
}
