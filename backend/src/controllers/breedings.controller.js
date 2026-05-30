import pool from '../config/db.js';

export const breedingsController = {
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT pb.*, p1.id AS sow_code, p2.id AS boar_code, s.full_name AS staff_name
        FROM pig_breedings pb
        LEFT JOIN pigs p1 ON pb.sow_id = p1.id
        LEFT JOIN pigs p2 ON pb.boar_id = p2.id
        LEFT JOIN staffs s ON pb.staff_id = s.id
      `;
      const params = [];
      if (request.user.role === 'FARM_WORKER') {
        sql += ' WHERE p1.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?) OR p2.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)';
        params.push(request.user.staff_id, request.user.staff_id);
      }
      sql += ' ORDER BY pb.breeding_date DESC, pb.created_at DESC';

      const [rows] = await pool.query(sql, params);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu phối giống' });
    }
  },
  create: async (request, reply) => {
    const { sow_id, boar_id, breeding_date, expected_farrow_date, status, note } = request.body;
    const staff_id = request.user.staff_id;
    try {
      await pool.query(
        'INSERT INTO pig_breedings (sow_id, boar_id, breeding_date, expected_farrow_date, status, staff_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sow_id, boar_id, breeding_date, expected_farrow_date, status, staff_id, note]
      );
      return reply.code(201).send({ success: true, message: 'Ghi nhận phối giống thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi ghi nhận' });
    }
  },
  updateStatus: async (request, reply) => {
    try {
      await pool.query('UPDATE pig_breedings SET status = ? WHERE id = ?', [request.body.status, request.params.id]);
      return reply.send({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi cập nhật' });
    }
  },
  delete: async (request, reply) => {
    try {
      await pool.query('DELETE FROM pig_breedings WHERE id = ?', [request.params.id]);
      return reply.send({ success: true, message: 'Xóa thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa' });
    }
  }
};