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

    if (!sow_id || !farrow_date || alive_piglets === undefined) {
      return reply.code(400).send({ success: false, message: 'Thiếu thông tin bắt buộc (Nái mẹ, Ngày đẻ, Số con sống).' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Ghi nhận lịch sử đẻ
      await conn.query(
        'INSERT INTO pig_farrowings (sow_id, farrow_date, alive_piglets, dead_piglets, total_weight, staff_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sow_id, farrow_date, alive_piglets, dead_piglets || 0, total_weight || null, staff_name, note]
      );

      // 2. Cập nhật trạng thái phiếu phối giống thành "Đã đẻ"
      await conn.query(
        "UPDATE pig_breedings SET status = 'FARROWED' WHERE sow_id = ? AND status = 'SUCCESS' ORDER BY breeding_date DESC LIMIT 1",
        [sow_id]
      );

      // 3. Tự động tạo các cá thể lợn con mới
      if (alive_piglets > 0) {
        const [sowInfo] = await conn.query('SELECT barn_id FROM pigs WHERE id = ?', [sow_id]);
        if (sowInfo.length === 0) throw new Error('Không tìm thấy thông tin lợn nái.');
        
        const barn_id = sowInfo[0].barn_id;
        const totalPiglets = (alive_piglets || 0) + (dead_piglets || 0);
        const avg_weight = (total_weight && totalPiglets > 0) ? (total_weight / totalPiglets).toFixed(2) : null;

        const [lastPiglet] = await conn.query("SELECT pig_code FROM pigs WHERE category = 'PIGLET' ORDER BY id DESC LIMIT 1");
        let nextPigletNum = 1;
        if (lastPiglet.length > 0) {
          const lastNum = parseInt(lastPiglet[0].pig_code.split('-')[1] || 0, 10);
          if (!isNaN(lastNum)) nextPigletNum = lastNum + 1;
        }

        const newPigletsData = [];
        for (let i = 0; i < alive_piglets; i++) {
          const newPigCode = `PGL-${String(nextPigletNum + i).padStart(4, '0')}`;
          newPigletsData.push([newPigCode, barn_id, 'PIGLET', farrow_date, farrow_date, avg_weight, avg_weight]);
        }

        await conn.query(
          `INSERT INTO pigs (pig_code, barn_id, category, dob, entry_date, entry_weight, current_weight) VALUES ?`,
          [newPigletsData]
        );
      }

      await conn.commit();
      return reply.code(201).send({ success: true, message: `Ghi nhận thành công và đã tự động thêm ${alive_piglets} lợn con vào hệ thống.` });
    } catch (error) {
      await conn.rollback();
      console.error(error);
      return reply.code(500).send({ success: false, message: error.message || 'Lỗi hệ thống khi ghi nhận đẻ con.' });
    } finally {
      conn.release();
    }
  },
  delete: async (request, reply) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query('SELECT sow_id FROM pig_farrowings WHERE id = ?', [request.params.id]);
      if (rows.length > 0) {
        await conn.query("UPDATE pig_breedings SET status = 'SUCCESS' WHERE sow_id = ? AND status = 'FARROWED' ORDER BY breeding_date DESC LIMIT 1", [rows[0].sow_id]);
      }
      await conn.query('DELETE FROM pig_farrowings WHERE id = ?', [request.params.id]);
      await conn.commit();
      return reply.send({ success: true, message: 'Xóa thành công' });
    } catch (error) {
      await conn.rollback();
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa' });
    } finally {
      conn.release();
    }
  }
};