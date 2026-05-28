import pool from '../config/db.js';

export const vaccinationsController = {
  // Lấy danh sách lịch sử tiêm phòng
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT 
          v.id, v.pig_id, v.barn_id, v.vaccine_name, v.vaccinated_at, v.note,
          p.pig_code AS ear_tag, 
          b.name AS barn_name,
          e.full_name AS performed_by_name
        FROM vaccinations v
        LEFT JOIN pigs p ON v.pig_id = p.id
        LEFT JOIN barns b ON v.barn_id = b.id
        LEFT JOIN staffs e ON v.performed_by = e.id
      `;
      const params = [];
      if (request.user.role === 'FARM_WORKER') {
        sql += ' WHERE (p.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?) OR v.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?))';
        params.push(request.user.staff_id, request.user.staff_id);
      }
      sql += ' ORDER BY v.vaccinated_at DESC';

      const [rows] = await pool.query(sql, params);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi tải dữ liệu tiêm phòng' });
    }
  },

  // Thêm bản ghi tiêm phòng mới
  create: async (request, reply) => {
    const { pig_id, barn_id, vaccine_name, vaccinated_at, performed_by, note } = request.body;
    
    try {
      const [result] = await pool.query(
        `INSERT INTO vaccinations (pig_id, barn_id, vaccine_name, vaccinated_at, performed_by, note) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pig_id || null, barn_id || null, vaccine_name, vaccinated_at, performed_by, note || '']
      );
      
      return reply.code(201).send({ 
        success: true, 
        message: 'Ghi nhận tiêm phòng thành công', 
        data: { id: result.insertId } 
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi lưu lịch tiêm phòng' });
    }
  },

  // Xóa bản ghi tiêm phòng
  delete: async (request, reply) => {
    const { id } = request.params;
    try {
      const [result] = await pool.query('DELETE FROM vaccinations WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return reply.code(404).send({ success: false, message: 'Không tìm thấy bản ghi cần xóa' });
      }
      return reply.send({ success: true, message: 'Đã xóa bản ghi tiêm phòng' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi tiêm phòng' });
    }
  }
};