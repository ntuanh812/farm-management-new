import pool from '../config/db.js';

export const feedsController = {
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query('SELECT * FROM feeds ORDER BY created_at DESC');
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải danh mục cám' });
    }
  }
};