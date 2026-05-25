import pool from '../config/db.js';

export const farrowingsController = {
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT pf.*, p.pig_code AS sow_code
        FROM pig_farrowings pf
        LEFT JOIN pigs p ON pf.sow_id = p.id
        ORDER BY pf.farrow_date DESC, pf.created_at DESC
      `);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu đẻ con' });
    }
  },
  create: async (request, reply) => {
    const { sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note } = request.body;
    try {
      await pool.query(
        'INSERT INTO pig_farrowings (sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note]
      );
      return reply.code(201).send({ success: true, message: 'Ghi nhận đẻ con thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi ghi nhận' });
    }
  },
  delete: async (request, reply) => {
    try {
      await pool.query('DELETE FROM pig_farrowings WHERE id = ?', [request.params.id]);
      return reply.send({ success: true, message: 'Xóa thành công' });
    } catch (error) { return reply.code(500).send({ success: false, message: 'Lỗi khi xóa' }); }
  }
};