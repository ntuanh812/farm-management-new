import prisma from '../config/prisma.js';

export const saleBatchesController = {
  // Lấy danh sách các lô xuất bán
  getAll: async (request, reply) => {
    try {
      const batches = await prisma.sale_batches.findMany({
        include: {
          sale_batch_lines: true,
          staffs: { select: { full_name: true } }
        },
        orderBy: [ { sold_at: 'desc' }, { created_at: 'desc' } ]
      });

      const data = batches.map(b => ({
        id: b.id,
        sold_at: b.sold_at,
        staff_name: b.staffs?.full_name || null,
        created_at: b.created_at,
        lines: b.sale_batch_lines
      }));

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

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Tạo lô bán (Batch)
        const batch = await tx.sale_batches.create({
          data: { sold_at: new Date(sold_at), staff_id: staff_id ? Number(staff_id) : null }
        });

        // Lấy thông tin trọng lượng chuẩn xác từ DB (chống F12 sửa cân nặng / tổng tiền)
        const pigIds = lines.map(l => Number(l.pig_id));
        const pigs = await tx.pigs.findMany({ where: { id: { in: pigIds } } });

        const lineValues = [];
        for (const l of lines) {
          const pig = pigs.find(p => p.id === Number(l.pig_id));
          if (!pig) throw new Error(`Không tìm thấy cá thể lợn PIG${String(l.pig_id).padStart(3, "0")}`);
          if (pig.lifecycle_status === 'SOLD' || pig.lifecycle_status === 'DEAD') {
            throw new Error(`Cá thể PIG${String(l.pig_id).padStart(3, "0")} đã chết hoặc đã xuất bán`);
          }

          const actualWeight = Number(pig.current_weight || pig.entry_weight || 0);
          const price = Number(l.price || 0);
          if (price < 0) throw new Error('Đơn giá không hợp lệ (nhỏ hơn 0)');
          
          const totalAmount = actualWeight * price;
          lineValues.push({
            sale_batch_id: batch.id,
            pig_id: pig.id,
            weight: actualWeight,
            price,
            total_amount: totalAmount,
            reason: l.reason || null,
            note: l.note || null
          });
        }

        // 2. Lưu chi tiết từng con xuất bán
        await tx.sale_batch_lines.createMany({ data: lineValues });

        // 3. Cập nhật trạng thái những con lợn này thành SOLD
        await tx.pigs.updateMany({ where: { id: { in: pigIds } }, data: { lifecycle_status: 'SOLD', updated_at: new Date() } });
      });

      return reply.code(201).send({ success: true, message: 'Ghi nhận xuất bán thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi hệ thống khi xử lý xuất bán' });
    }
  }
};