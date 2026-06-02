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
    const { barn_id, pig_id, medicine_id, quantity, unit, used_at, note } = request.body;
    const staff_id = request.user.staff_id;

    if (quantity === undefined || isNaN(quantity) || Number(quantity) <= 0) {
      return reply.code(400).send({ success: false, message: 'Số lượng sử dụng phải lớn hơn 0' });
    }
    
    // Extract value if it is passed as an array due to "tags" mode in Antd Select
    const medId = Array.isArray(medicine_id) ? medicine_id[0] : medicine_id;
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // 1. Kiểm tra tồn kho
      const [medicines] = await conn.query('SELECT name, unit, COALESCE(stock, 0) as stock FROM medicines WHERE id = ? FOR UPDATE', [medId]);
      if (medicines.length === 0) throw new Error('Không tìm thấy loại thuốc/vật tư');
      
      const currentStock = medicines[0].stock;
      if (currentStock < quantity) {
        await conn.rollback();
        return reply.code(400).send({ success: false, message: `Kho không đủ (Còn: ${currentStock} ${medicines[0].unit || ''}). Vui lòng nhập kho.` });
      }

      // 2. Trừ tồn kho
      await conn.query('UPDATE medicines SET stock = stock - ? WHERE id = ?', [quantity, medId]);

      // 3. Ghi nhận tiêu thụ
      if (pig_id !== undefined) {
        await conn.query(
          'INSERT INTO medicine_usages (barn_id, pig_id, medicine_id, quantity, unit, used_at, staff_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [barn_id, pig_id, medId, quantity, unit, used_at, staff_id, note]
        );
      } else {
        await conn.query(
          'INSERT INTO medicine_usages (barn_id, medicine_id, quantity, unit, used_at, staff_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [barn_id, medId, quantity, unit, used_at, staff_id, note]
        );
      }

      await conn.commit();
      return reply.code(201).send({ success: true, message: 'Ghi nhận sử dụng thuốc thành công' });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: error.message || 'Lỗi ghi nhận tiêu thụ thuốc' });
    } finally {
      conn.release();
    }
  },
  delete: async (request, reply) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Lấy thông tin phiếu sử dụng trước khi xóa
      const [usage] = await conn.query('SELECT medicine_id, quantity FROM medicine_usages WHERE id = ?', [request.params.id]);
      if (usage.length > 0) {
        // Cộng lại số lượng tồn kho (Hoàn kho)
        await conn.query('UPDATE medicines SET stock = COALESCE(stock, 0) + ? WHERE id = ?', [usage[0].quantity, usage[0].medicine_id]);
        await conn.query('DELETE FROM medicine_usages WHERE id = ?', [request.params.id]);
      }
      
      await conn.commit();
      return reply.send({ success: true, message: 'Xóa bản ghi và hoàn lại thuốc vào kho thành công' });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi' });
    } finally {
      conn.release();
    }
  }
};