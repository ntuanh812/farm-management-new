import pool from '../config/db.js';

export const vaccinesUsageController = {
  // Lấy danh sách lịch sử tiêm phòng
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT 
          v.id, v.pig_id, v.barn_id, v.vaccine_id, v.quantity, v.unit, v.vaccinated_at, v.note,
          vc.name AS vaccine_name,
          b.name AS barn_name,
          e.full_name AS performed_by_name
        FROM vaccine_usages v
        LEFT JOIN vaccines vc ON v.vaccine_id = vc.id
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
    const { pig_id, barn_id, vaccine_id, quantity, unit, vaccinated_at, note } = request.body;
    const performed_by = request.user.staff_id;
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // 1. Kiểm tra tồn kho
      const [vaccines] = await conn.query('SELECT name, unit, COALESCE(stock, 0) as stock FROM vaccines WHERE id = ? FOR UPDATE', [vaccine_id]);
      if (vaccines.length === 0) throw new Error('Không tìm thấy loại vaccine');
      
      const currentStock = vaccines[0].stock;
      if (currentStock < quantity) {
        await conn.rollback();
        return reply.code(400).send({ success: false, message: `Kho không đủ (Còn: ${currentStock} ${vaccines[0].unit || ''}). Vui lòng nhập kho.` });
      }

      // 2. Trừ tồn kho
      await conn.query('UPDATE vaccines SET stock = stock - ? WHERE id = ?', [quantity, vaccine_id]);

      // 3. Ghi nhận tiêm phòng
      const [result] = await conn.query(
        `INSERT INTO vaccine_usages (pig_id, barn_id, vaccine_id, quantity, unit, vaccinated_at, performed_by, note) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pig_id || null, barn_id || null, vaccine_id, quantity, unit, vaccinated_at, performed_by, note || '']
      );
      
      await conn.commit();
      return reply.code(201).send({ 
        success: true, 
        message: 'Ghi nhận tiêm phòng thành công', 
        data: { id: result.insertId } 
      });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: error.message || 'Lỗi khi lưu lịch tiêm phòng' });
    } finally {
      conn.release();
    }
  },

  // Xóa bản ghi tiêm phòng
  delete: async (request, reply) => {
    const { id } = request.params;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const [usage] = await conn.query('SELECT vaccine_id, quantity FROM vaccine_usages WHERE id = ?', [id]);
      if (usage.length > 0) {
        await conn.query('UPDATE vaccines SET stock = COALESCE(stock, 0) + ? WHERE id = ?', [usage[0].quantity, usage[0].vaccine_id]);
        await conn.query('DELETE FROM vaccine_usages WHERE id = ?', [id]);
      }
      
      await conn.commit();
      return reply.send({ success: true, message: 'Đã xóa bản ghi và hoàn lại kho' });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi tiêm phòng' });
    } finally {
      conn.release();
    }
  }
};