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
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // 1. Kiểm tra tồn kho
      const [feeds] = await conn.query('SELECT name, COALESCE(stock, 0) as stock FROM feeds WHERE id = ? FOR UPDATE', [feed_id]);
      if (feeds.length === 0) throw new Error('Không tìm thấy loại cám');
      
      const currentStock = feeds[0].stock;
      if (currentStock < quantity_kg) {
        await conn.rollback();
        return reply.code(400).send({ success: false, message: `Kho không đủ cám (Còn: ${currentStock} kg). Vui lòng nhập kho.` });
      }

      // 2. Trừ tồn kho
      await conn.query('UPDATE feeds SET stock = stock - ? WHERE id = ?', [quantity_kg, feed_id]);

      // 3. Ghi nhận tiêu thụ
      await conn.query(
        'INSERT INTO feed_usages (barn_id, feed_id, quantity_kg, used_at, staff_id, note) VALUES (?, ?, ?, ?, ?, ?)',
        [barn_id, feed_id, quantity_kg, used_at, staff_id, note]
      );

      await conn.commit();
      return reply.code(201).send({ success: true, message: 'Ghi nhận thành công' });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: error.message || 'Lỗi ghi nhận tiêu thụ cám' });
    } finally {
      conn.release();
    }
  },
  delete: async (request, reply) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Lấy thông tin phiếu sử dụng trước khi xóa
      const [usage] = await conn.query('SELECT feed_id, quantity_kg FROM feed_usages WHERE id = ?', [request.params.id]);
      if (usage.length > 0) {
        // Cộng lại số lượng tồn kho (Hoàn kho)
        await conn.query('UPDATE feeds SET stock = COALESCE(stock, 0) + ? WHERE id = ?', [usage[0].quantity_kg, usage[0].feed_id]);
        await conn.query('DELETE FROM feed_usages WHERE id = ?', [request.params.id]);
      }
      
      await conn.commit();
      return reply.send({ success: true, message: 'Đã xóa bản ghi và hoàn lại cám vào kho' });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi' });
    } finally {
      conn.release();
    }
  }
};