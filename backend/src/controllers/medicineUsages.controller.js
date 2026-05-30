import pool from '../config/db.js';

export const medicineUsagesController = {
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT m.*, b.name AS barn_name, md.name AS medicine_name, s.full_name AS staff_name
        FROM medicine_usages m
        LEFT JOIN barns b ON m.barn_id = b.id
        LEFT JOIN medicines md ON m.medicine_id = md.id
        LEFT JOIN staffs s ON m.staff_id = s.id
      `;
      const params = [];
      if (request.user.role === 'FARM_WORKER') {
        sql += ' WHERE m.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)';
        params.push(request.user.staff_id);
      }
      sql += ' ORDER BY m.used_at DESC, m.created_at DESC';

      const [rows] = await pool.query(sql, params);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu sử dụng thuốc' });
    }
  },
  create: async (request, reply) => {
    const { barn_id, medicine_id, quantity, unit, used_at, note } = request.body;
    const staff_id = request.user.staff_id;
    
    // Extract value if it is passed as an array due to "tags" mode in Antd Select
    const medId = Array.isArray(medicine_id) ? medicine_id[0] : medicine_id;
    
    try {
      await pool.query(
        'INSERT INTO medicine_usages (barn_id, medicine_id, quantity, unit, used_at, staff_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [barn_id, medId, quantity, unit, used_at, staff_id, note]
      );
      return reply.code(201).send({ success: true, message: 'Ghi nhận sử dụng thuốc thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi ghi nhận tiêu thụ thuốc' });
    }
  },
  delete: async (request, reply) => {
    try {
      await pool.query('DELETE FROM medicine_usages WHERE id = ?', [request.params.id]);
      return reply.send({ success: true, message: 'Xóa bản ghi thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi' });
    }
  }
};