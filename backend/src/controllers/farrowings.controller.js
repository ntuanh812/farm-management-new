import pool from '../config/db.js';

export const farrowingsController = {
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT pf.*, p.id AS sow_code, s.full_name AS staff_name
        FROM pig_farrowings pf
        LEFT JOIN pigs p ON pf.sow_id = p.id
        LEFT JOIN staffs s ON pf.staff_id = s.id
      `;
      const params = [];
      if (request.user.role === 'FARM_WORKER') {
        sql += ' WHERE p.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)';
        params.push(request.user.staff_id);
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
    const { sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, note, piglet_barn_id } = request.body;
    const staff_id = request.user.staff_id;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [farrowingResult] = await connection.query(
        'INSERT INTO pig_farrowings (sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_id, note]
      );

      const farrowingId = farrowingResult.insertId;

      if (alive_piglets > 0) {
        // Lấy thông tin lợn mẹ
        const [sowData] = await connection.query('SELECT barn_id FROM pigs WHERE id = ?', [sow_id]);
        if (sowData.length > 0) {
          const barn_id = piglet_barn_id || sowData[0].barn_id;
          const avg_weight = total_weight > 0 ? (total_weight / alive_piglets).toFixed(2) : 0;
          
          for (let i = 0; i < alive_piglets; i++) {
            await connection.query(
              `INSERT INTO pigs 
              (name, barn_id, category, lifecycle_status, gender, dob, entry_date, entry_weight, current_weight, farrowing_id, mother_id) 
              VALUES (?, ?, 'PIGLET', 'ACTIVE', 'male', ?, ?, ?, ?, ?, ?)`,
              [`Lợn con ổ ${farrowingId} - ${i+1}`, barn_id, farrow_date, farrow_date, avg_weight, avg_weight, farrowingId, sow_id]
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