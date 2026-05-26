import pool from '../config/db.js';

export const deathsController = {
  getAll: async (request, reply) => {
    try {
      let sql = `
        SELECT d.*, p.pig_code, b.name AS barn_name 
        FROM pig_deaths d
        LEFT JOIN pigs p ON d.pig_id = p.id
        LEFT JOIN barns b ON p.barn_id = b.id
      `;
      const params = [];
      if (request.user.role === 'FARM_WORKER') {
        sql += ' WHERE p.barn_id IN (SELECT barn_id FROM employee_barns WHERE employee_id = ?)';
        params.push(request.user.employee_id);
      }
      sql += ' ORDER BY d.death_date DESC, d.created_at DESC';

      const [rows] = await pool.query(sql, params);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu lợn chết' });
    }
  },
  
  create: async (request, reply) => {
    const { pig_id, death_date, reason, disposal_method, note, recorded_by } = request.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      await conn.query(
        'INSERT INTO pig_deaths (pig_id, death_date, reason, disposal_method, note, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [pig_id, death_date, reason, disposal_method, note, recorded_by]
      );
      await conn.query('UPDATE pigs SET lifecycle_status = "DEAD" WHERE id = ?', [pig_id]);
      
      await conn.commit();
      return reply.code(201).send({ success: true, message: 'Ghi nhận lợn chết thành công' });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi hệ thống khi ghi nhận' });
    } finally {
      conn.release();
    }
  },

  delete: async (request, reply) => {
    try {
      await pool.query('DELETE FROM pig_deaths WHERE id = ?', [request.params.id]);
      return reply.send({ success: true, message: 'Xóa bản ghi thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi' });
    }
  }
};