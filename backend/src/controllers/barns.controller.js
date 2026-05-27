import pool from '../config/db.js';

export const barnsController = {
  // Lấy danh sách chuồng trại kèm số lượng lợn hiện tại
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT 
          b.id, 
          b.code, 
          b.name, 
          b.capacity, 
          b.barn_type, 
          b.status, 
          b.note,
          (SELECT COUNT(*) FROM pigs p WHERE p.barn_id = b.id AND p.lifecycle_status = 'ACTIVE') AS current_quantity
        FROM barns b
      `;
      const params = [];
      
      if (request.user.role === 'FARM_WORKER') {
        sql += ' JOIN staff_barns eb ON b.id = eb.barn_id WHERE eb.staff_id = ?';
        params.push(request.user.staff_id);
      }
      
      sql += ' ORDER BY b.created_at DESC';
      
      const [rows] = await pool.query(sql, params);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải danh sách chuồng trại' });
    }
  },
  
  // Thêm mới chuồng trại
  create: async (request, reply) => {
    const { code, name, capacity, barn_type, status, note } = request.body;
    try {
      await pool.query(
        'INSERT INTO barns (code, name, capacity, barn_type, status, note) VALUES (?, ?, ?, ?, ?, ?)',
        [code, name, capacity, barn_type, status || 'ACTIVE', note]
      );
      return reply.code(201).send({ success: true, message: 'Thêm chuồng trại thành công' });
    } catch (error) {
      request.log.error(error);
      if (error.code === 'ER_DUP_ENTRY') {
        return reply.code(400).send({ success: false, message: 'Mã chuồng đã tồn tại' });
      }
      return reply.code(500).send({ success: false, message: 'Lỗi khi thêm chuồng trại' });
    }
  },

  // Cập nhật chuồng trại
  update: async (request, reply) => {
    const { id } = request.params;
    const { code, name, capacity, barn_type, status, note } = request.body;
    try {
      await pool.query(
        'UPDATE barns SET code = ?, name = ?, capacity = ?, barn_type = ?, status = ?, note = ? WHERE id = ?',
        [code, name, capacity, barn_type, status, note, id]
      );
      return reply.send({ success: true, message: 'Cập nhật chuồng trại thành công' });
    } catch (error) {
      request.log.error(error);
      if (error.code === 'ER_DUP_ENTRY') {
        return reply.code(400).send({ success: false, message: 'Mã chuồng đã tồn tại' });
      }
      return reply.code(500).send({ success: false, message: 'Lỗi khi cập nhật chuồng trại' });
    }
  },

  // Xóa chuồng trại
  delete: async (request, reply) => {
    const { id } = request.params;
    try {
      const [pigs] = await pool.query('SELECT COUNT(*) as count FROM pigs WHERE barn_id = ? AND lifecycle_status = "ACTIVE"', [id]);
      if (pigs[0].count > 0) {
        return reply.code(400).send({ success: false, message: 'Không thể xóa chuồng đang có lợn' });
      }

      await pool.query('DELETE FROM barns WHERE id = ?', [id]);
      return reply.send({ success: true, message: 'Xóa chuồng trại thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa chuồng trại' });
    }
  }
};