import pool from '../config/db.js';

export const saleBatchesController = {
  // Lấy danh sách các lô xuất bán
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          sb.id, sb.sold_at, sb.staff_name, sb.created_at,
          JSON_ARRAYAGG(
            IF(sbl.id IS NOT NULL, 
              JSON_OBJECT(
                'id', sbl.id,
                'ear_tag', sbl.ear_tag,
                'weight', sbl.weight,
                'price', sbl.price,
                'total_amount', sbl.total_amount,
                'reason', sbl.reason,
                'note', sbl.note
              ), 
              NULL
            )
          ) AS lines
        FROM sale_batches sb
        LEFT JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        GROUP BY sb.id
        ORDER BY sb.sold_at DESC, sb.created_at DESC
      `);

      const data = rows.map(row => ({
        ...row,
        lines: row.lines ? JSON.parse(row.lines).filter(l => l !== null) : []
      }));

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