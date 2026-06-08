import prisma from '../config/prisma.js';

export const medicineUsagesController = {
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

      const medicineUsages = await prisma.medicine_usages.findMany({
        where: whereClause,
        include: {
          barns: { select: { name: true } },
          medicines: { select: { name: true } },
          staffs: { select: { full_name: true } }
        },
        orderBy: [ { used_at: 'desc' }, { created_at: 'desc' } ]
      });

      const data = medicineUsages.map(m => {
        const { barns, medicines, staffs, ...rest } = m;
        return {
          ...rest,
          barn_name: barns?.name || null,
          medicine_name: medicines?.name || null,
          staff_name: staffs?.full_name || null
        };
      });

      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu sử dụng thuốc' });
    }
  },
  create: async (request, reply) => {
    const { barn_id, pig_id, medicine_id, quantity, unit, used_at, note } = request.body;
    const staff_id = request.user.staff_id;

    if (quantity === undefined || isNaN(quantity) || Number(quantity) <= 0) {
      return reply.code(400).send({ success: false, message: 'Số lượng sử dụng phải lớn hơn 0' });
    }
    
    // Extract value if it is passed as an array due to "tags" mode in Antd Select
    const medId = Array.isArray(medicine_id) ? medicine_id[0] : medicine_id;
    
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Kiểm tra tồn kho
        const medicines = await tx.medicines.findUnique({ where: { id: Number(medId) } });
        if (!medicines) throw new Error('Không tìm thấy loại thuốc/vật tư');
        
        const currentStock = medicines.stock || 0;
        if (currentStock < quantity) {
          throw new Error(`Kho không đủ (Còn: ${currentStock} ${medicines.unit || ''}). Vui lòng nhập kho.`);
        }

        // 2. Trừ tồn kho
        await tx.medicines.update({
          where: { id: Number(medId) },
          data: { stock: { decrement: Number(quantity) } }
        });

        // 3. Ghi nhận tiêu thụ
        await tx.medicine_usages.create({
          data: {
            barn_id: barn_id ? Number(barn_id) : null,
            pig_id: pig_id ? Number(pig_id) : null,
            medicine_id: Number(medId),
            quantity: Number(quantity),
            unit,
            used_at: new Date(used_at),
            staff_id: Number(staff_id),
            note: note || ''
          }
        });
      });

      return reply.code(201).send({ success: true, message: 'Ghi nhận sử dụng thuốc thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(error.message.includes('Kho không đủ') ? 400 : 500).send({ success: false, message: error.message || 'Lỗi ghi nhận tiêu thụ thuốc' });
    }
  },
  delete: async (request, reply) => {
    try {
      await prisma.$transaction(async (tx) => {
        const usage = await tx.medicine_usages.findUnique({ where: { id: Number(request.params.id) } });
        if (usage) {
          await tx.medicines.update({
            where: { id: usage.medicine_id },
            data: { stock: { increment: usage.quantity } }
          });
          await tx.medicine_usages.delete({ where: { id: usage.id } });
        }
      });
      
      return reply.send({ success: true, message: 'Xóa bản ghi và hoàn lại thuốc vào kho thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi' });
    }
  }
};