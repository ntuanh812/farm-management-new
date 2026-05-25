import pool from '../config/db.js';

export const vaccinationsController = {
  // Lấy danh sách lịch sử tiêm phòng
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          v.id, v.pig_id, v.vaccine_name, v.vaccinated_at, v.note,
          p.ear_tag, 
          e.full_name AS performed_by_name
        FROM vaccinations v
        LEFT JOIN pigs p ON v.pig_id = p.id
        LEFT JOIN employees e ON v.performed_by = e.id
        ORDER BY v.vaccinated_at DESC
      `);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi tải dữ liệu tiêm phòng' });
    }
  },

  // Thêm bản ghi tiêm phòng mới
  create: async (request, reply) => {
    const { pig_id, vaccine_name, vaccinated_at, performed_by, note } = request.body;
    
    try {
      const [result] = await pool.query(
        `INSERT INTO vaccinations (pig_id, vaccine_name, vaccinated_at, performed_by, note) 
         VALUES (?, ?, ?, ?, ?)`,
        [pig_id, vaccine_name, vaccinated_at, performed_by, note || '']
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