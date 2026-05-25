import pool from '../config/db.js';

export const medicineUsagesController = {
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT m.*, b.name AS barn_name 
        FROM medicine_usages m
        LEFT JOIN barns b ON m.barn_id = b.id
        ORDER BY m.used_at DESC, m.created_at DESC
      `);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu sử dụng thuốc' });
    }
  },
  create: async (request, reply) => {
    const { barn_id, medicine_name, quantity, unit, used_at, staff_name, note } = request.body;
    
    // Extract value if it is passed as an array due to "tags" mode in Antd Select
    const medName = Array.isArray(medicine_name) ? medicine_name[0] : medicine_name;
    
    try {
      await pool.query(
        'INSERT INTO medicine_usages (barn_id, medicine_name, quantity, unit, used_at, staff_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [barn_id, medName, quantity, unit, used_at, staff_name, note]
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