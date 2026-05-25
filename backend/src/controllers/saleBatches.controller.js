import pool from '../config/db.js';

export const saleBatchesController = {
  // Lấy danh sách các lô xuất bán
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          sb.id, sb.sold_at, sb.staff_name, sb.created_at,
          sbl.id AS line_id,
          sbl.ear_tag,
          sbl.weight,
          sbl.price,
          sbl.total_amount,
          sbl.reason,
          sbl.note
        FROM sale_batches sb
        LEFT JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        ORDER BY sb.sold_at DESC, sb.created_at DESC
      `);

      const batchMap = {};
      const data = [];

      rows.forEach(row => {
        if (!batchMap[row.id]) {
          batchMap[row.id] = {
            id: row.id,
            sold_at: row.sold_at,
            staff_name: row.staff_name,
            created_at: row.created_at,
            lines: []
          };
          data.push(batchMap[row.id]);
        }

        if (row.line_id) {
          batchMap[row.id].lines.push({
            id: row.line_id,
            ear_tag: row.ear_tag,
            weight: row.weight,
            price: row.price,
            total_amount: row.total_amount,
            reason: row.reason,
            note: row.note
          });
        }
      });

      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi tải lịch sử xuất bán' });
    }
  },

  // Ghi nhận lô xuất bán mới (Thêm Batch, Thêm Lines và Cập nhật trạng thái lợn)
  create: async (request, reply) => {
    const { sold_at, staff_name, lines } = request.body;
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Tạo lô bán (Batch)
      const [batchResult] = await conn.query(
        'INSERT INTO sale_batches (sold_at, staff_name) VALUES (?, ?)',
        [sold_at, staff_name || null]
      );
      const batchId = batchResult.insertId;

      if (lines && lines.length > 0) {
        // 2. Lưu chi tiết từng con xuất bán
        const lineValues = lines.map(l => [batchId, l.ear_tag, l.weight, l.price, l.total_amount, l.reason || null, l.note || null]);
        await conn.query(
          'INSERT INTO sale_batch_lines (sale_batch_id, ear_tag, weight, price, total_amount, reason, note) VALUES ?',
          [lineValues]
        );

        // 3. Cập nhật trạng thái những con lợn này thành SOLD
        const earTags = lines.map(l => l.ear_tag);
        await conn.query('UPDATE pigs SET lifecycle_status = "SOLD" WHERE pig_code IN (?)', [earTags]);
      }

      await conn.commit();
      return reply.code(201).send({ success: true, message: 'Ghi nhận xuất bán thành công' });
    } catch (error) {
      await conn.rollback();
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi hệ thống khi xử lý xuất bán' });
    } finally {
      conn.release();
    }
  }
};