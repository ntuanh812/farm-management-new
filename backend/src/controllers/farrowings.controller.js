import pool from '../config/db.js';

export const farrowingsController = {
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT pf.*, p.pig_code AS sow_code
        FROM pig_farrowings pf
        LEFT JOIN pigs p ON pf.sow_id = p.id
      `;
      const params = [];
      if (request.user.role === 'FARM_WORKER') {
        sql += ' WHERE p.barn_id IN (SELECT barn_id FROM employee_barns WHERE employee_id = ?)';
        params.push(request.user.employee_id);
      }
      sql += ' ORDER BY pf.farrow_date DESC, pf.created_at DESC';

      const [rows] = await pool.query(sql, params);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu đẻ con' });
    }
  },
  create: async (request, reply) => {
    const { sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note } = request.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [farrowingResult] = await connection.query(
        'INSERT INTO pig_farrowings (sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note]
      );

      const farrowingId = farrowingResult.insertId;

      if (alive_piglets > 0) {
        // Lấy thông tin lợn mẹ để cập nhật lợn con vào cùng chuồng
        const [sowData] = await connection.query('SELECT barn_id, pig_code FROM pigs WHERE id = ?', [sow_id]);
        if (sowData.length > 0) {
          const barn_id = sowData[0].barn_id;
          const sow_code = sowData[0].pig_code;
          const avg_weight = total_weight > 0 ? (total_weight / alive_piglets).toFixed(2) : 0;
          
          for (let i = 0; i < alive_piglets; i++) {
            // Mã lợn con ngắn gọn, tránh lặp chữ PIG
            const cleanSowCode = sow_code.replace(/^PIG-/i, '');
            const pig_code = `PIG-${cleanSowCode}-F${farrowingId}-${i + 1}`;
            await connection.query(
              `INSERT INTO pigs 
              (pig_code, name, barn_id, category, lifecycle_status, gender, dob, entry_date, entry_weight, current_weight, farrowing_id, mother_id) 
              VALUES (?, ?, ?, 'PIGLET', 'ACTIVE', 'male', ?, ?, ?, ?, ?, ?)`,
              [pig_code, `Lợn con ổ ${farrowingId} - ${i+1}`, barn_id, farrow_date, farrow_date, avg_weight, avg_weight, farrowingId, sow_id]
            );
          }
        }
      }

      await connection.commit();
      return reply.code(201).send({ success: true, message: 'Ghi nhận đẻ con thành công' });
    } catch (error) {
      await connection.rollback();
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi ghi nhận' });
    } finally {
      connection.release();
    }
  },
  update: async (request, reply) => {
    const { farrow_date, dead_piglets, total_weight, note } = request.body;
    const farrowingId = request.params.id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [oldFarrowing] = await connection.query('SELECT alive_piglets FROM pig_farrowings WHERE id = ?', [farrowingId]);
      if (oldFarrowing.length === 0) {
        return reply.code(404).send({ success: false, message: 'Không tìm thấy bản ghi đẻ con' });
      }

      const alive_piglets = oldFarrowing[0].alive_piglets;

      await connection.query(
        'UPDATE pig_farrowings SET farrow_date = ?, dead_piglets = ?, total_weight = ?, note = ? WHERE id = ?',
        [farrow_date, dead_piglets, total_weight, note, farrowingId]
      );

      // Nếu total_weight thay đổi, cập nhật lại trung bình cân nặng cho các lợn con (chỉ ảnh hưởng lợn con thuộc lứa này)
      if (total_weight !== undefined && alive_piglets > 0) {
        const avg_weight = total_weight > 0 ? (total_weight / alive_piglets).toFixed(2) : 0;
        await connection.query(
          'UPDATE pigs SET entry_weight = ?, current_weight = ? WHERE farrowing_id = ? AND category = "PIGLET"',
          [avg_weight, avg_weight, farrowingId]
        );
      }

      await connection.commit();
      return reply.send({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
      await connection.rollback();
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi cập nhật' });
    } finally {
      connection.release();
    }
  },
  delete: async (request, reply) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const farrowingId = request.params.id;

      // Xóa tất cả lợn con thuộc lứa đẻ này trước
      await connection.query('DELETE FROM pigs WHERE farrowing_id = ?', [farrowingId]);
      
      // Xóa bản ghi đẻ con
      await connection.query('DELETE FROM pig_farrowings WHERE id = ?', [farrowingId]);

      await connection.commit();
      return reply.send({ success: true, message: 'Xóa bản ghi và lợn con thành công' });
    } catch (error) { 
      await connection.rollback();
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa' }); 
    } finally {
      connection.release();
    }
  }
};