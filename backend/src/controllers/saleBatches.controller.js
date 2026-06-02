import pool from '../config/db.js';

export const saleBatchesController = {
  // Lấy danh sách các lô xuất bán
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          sb.id, sb.sold_at, sb.staff_id, s.full_name AS staff_name, sb.created_at,
          sbl.id AS line_id,
          sbl.pig_id,
          sbl.weight,
          sbl.price,
          sbl.total_amount,
          sbl.reason,
          sbl.note
        FROM sale_batches sb
        LEFT JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        LEFT JOIN staffs s ON sb.staff_id = s.id
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
            pig_id: row.pig_id,
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
    const { sold_at, lines } = request.body;
    const staff_id = request.user.staff_id;
    
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return reply.code(400).send({ success: false, message: 'Danh sách lợn xuất bán trống' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Tạo lô bán (Batch)
      const [batchResult] = await conn.query(
        'INSERT INTO sale_batches (sold_at, staff_id) VALUES (?, ?)',
        [sold_at, staff_id || null]
      );
      const batchId = batchResult.insertId;

      // Lấy thông tin trọng lượng chuẩn xác từ DB (chống F12 sửa cân nặng / tổng tiền)
      const pigIds = lines.map(l => l.pig_id);
      const [pigs] = await conn.query('SELECT id, current_weight, entry_weight, lifecycle_status FROM pigs WHERE id IN (?)', [pigIds]);

      const lineValues = [];
      for (const l of lines) {
        const pig = pigs.find(p => p.id === l.pig_id);
        if (!pig) throw new Error(`Không tìm thấy cá thể lợn PIG${String(l.pig_id).padStart(3, "0")}`);
        if (pig.lifecycle_status === 'SOLD' || pig.lifecycle_status === 'DEAD') {
          throw new Error(`Cá thể PIG${String(l.pig_id).padStart(3, "0")} đã chết hoặc đã xuất bán`);
        }

        const actualWeight = Number(pig.current_weight || pig.entry_weight || 0);
        const price = Number(l.price || 0);
        if (price < 0) throw new Error('Đơn giá không hợp lệ (nhỏ hơn 0)');
        
        const totalAmount = actualWeight * price;
        lineValues.push([batchId, l.pig_id, actualWeight, price, totalAmount, l.reason || null, l.note || null]);
      }

      // 2. Lưu chi tiết từng con xuất bán
      await conn.query(
        'INSERT INTO sale_batch_lines (sale_batch_id, pig_id, weight, price, total_amount, reason, note) VALUES ?',
        [lineValues]
      );

      // 3. Cập nhật trạng thái những con lợn này thành SOLD
      await conn.query('UPDATE pigs SET lifecycle_status = "SOLD" WHERE id IN (?)', [pigIds]);

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