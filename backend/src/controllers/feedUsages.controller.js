import prisma from '../config/prisma.js';

export const feedUsagesController = {
  getAll: async (request, reply) => {
    try {
      const whereClause = {};
      if (request.user.role === 'FARM_WORKER') {
        whereClause.barns = {
          staff_barns: {
            some: { staff_id: request.user.staff_id }
          }
        };
      }

      const feedUsages = await prisma.feed_usages.findMany({
        where: whereClause,
        include: {
          barns: { select: { name: true } },
          feeds: { select: { name: true } },
          staffs: { select: { full_name: true } }
        },
        orderBy: [ { used_at: 'desc' }, { created_at: 'desc' } ]
      });

      const data = feedUsages.map(f => {
        const { barns, feeds, staffs, ...rest } = f;
        return {
          ...rest,
          barn_name: barns?.name || null,
          feed_name: feeds?.name || null,
          staff_name: staffs?.full_name || null
        };
      });

      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu cám' });
    }
  },
  create: async (request, reply) => {
    const { barn_id, feed_id, quantity_kg, used_at, note } = request.body;
    const staff_id = request.user.staff_id;

    if (quantity_kg === undefined || isNaN(quantity_kg) || Number(quantity_kg) <= 0) {
      return reply.code(400).send({ success: false, message: 'Số lượng tiêu thụ phải lớn hơn 0' });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Kiểm tra tồn kho
        const feeds = await tx.feeds.findUnique({ where: { id: Number(feed_id) } });
        if (!feeds) throw new Error('Không tìm thấy loại cám');
        
        const currentStock = feeds.stock || 0;
        if (currentStock < quantity_kg) {
          throw new Error(`Kho không đủ cám (Còn: ${currentStock} kg). Vui lòng nhập kho.`);
        }

        // 2. Trừ tồn kho
        await tx.feeds.update({
          where: { id: Number(feed_id) },
          data: { stock: { decrement: Number(quantity_kg) } }
        });

        // 3. Ghi nhận tiêu thụ
        await tx.feed_usages.create({
          data: {
            barn_id: barn_id ? Number(barn_id) : null,
            feed_id: Number(feed_id),
            quantity_kg: Number(quantity_kg),
            used_at: new Date(used_at),
            staff_id: Number(staff_id),
            note: note || ''
          }
        });
      });

      return reply.code(201).send({ success: true, message: 'Ghi nhận thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(error.message.includes('Kho không đủ') ? 400 : 500).send({ success: false, message: error.message || 'Lỗi ghi nhận tiêu thụ cám' });
    }
  },
  delete: async (request, reply) => {
    try {
      await prisma.$transaction(async (tx) => {
        const usage = await tx.feed_usages.findUnique({ where: { id: Number(request.params.id) } });
        if (usage) {
          await tx.feeds.update({
            where: { id: usage.feed_id },
            data: { stock: { increment: usage.quantity_kg } }
          });
          await tx.feed_usages.delete({ where: { id: usage.id } });
        }
      });
      
      return reply.send({ success: true, message: 'Đã xóa bản ghi và hoàn lại cám vào kho' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi' });
    }
  }
};