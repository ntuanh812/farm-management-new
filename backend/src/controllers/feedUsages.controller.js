import pool from '../config/db.js';

export const feedUsagesController = {
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT f.*, b.name AS barn_name, fd.name AS feed_name, s.full_name AS staff_name
        FROM feed_usages f
        LEFT JOIN barns b ON f.barn_id = b.id
        LEFT JOIN feeds fd ON f.feed_id = fd.id
        LEFT JOIN staffs s ON f.staff_id = s.id
      `;
      const params = [];
      if (request.user.role === 'FARM_WORKER') {
        sql += ' WHERE f.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)';
        params.push(request.user.staff_id);
      }
      sql += ' ORDER BY f.used_at DESC, f.created_at DESC';

      const [rows] = await pool.query(sql, params);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu cám' });
    }
  },
  create: async (request, reply) => {
    const { barn_id, feed_id, quantity_kg, used_at, note } = request.body;
    const staff_id = request.user.staff_id;
    try {
      await pool.query(
        'INSERT INTO feed_usages (barn_id, feed_id, quantity_kg, used_at, staff_id, note) VALUES (?, ?, ?, ?, ?, ?)',
        [barn_id, feed_id, quantity_kg, used_at, staff_id, note]
      );
      return reply.code(201).send({ success: true, message: 'Ghi nhận thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi ghi nhận tiêu thụ cám' });
    }
  },
  delete: async (request, reply) => {
    try {
      await pool.query('DELETE FROM feed_usages WHERE id = ?', [request.params.id]);
      return reply.send({ success: true, message: 'Xóa thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi' });
    }
  }
};