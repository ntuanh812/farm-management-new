import prisma from '../config/prisma.js';

export const vaccinesUsageController = {
  // Lấy danh sách lịch sử tiêm phòng
  getAll: async (request, reply) => {
    try {
      const whereClause = {};
      if (request.user.role === 'FARM_WORKER') {
        const allowedBarns = await prisma.staff_barns.findMany({
          where: { staff_id: request.user.staff_id },
          select: { barn_id: true }
        });
        const allowedBarnIds = allowedBarns.map(b => b.barn_id);

        const allowedPigs = await prisma.pigs.findMany({
          where: { barn_id: { in: allowedBarnIds } },
          select: { id: true }
        });
        const allowedPigIds = allowedPigs.map(p => p.id);

        whereClause.OR = [
          { barn_id: { in: allowedBarnIds } },
          { pig_id: { in: allowedPigIds } }
        ];
      }

      const usages = await prisma.vaccine_usages.findMany({
        where: whereClause,
        orderBy: { vaccinated_at: 'desc' }
      });

      const vacIds = [...new Set(usages.map(u => u.vaccine_id).filter(Boolean))];
      const barnIds = [...new Set(usages.map(u => u.barn_id).filter(Boolean))];
      const staffIds = [...new Set(usages.map(u => u.performed_by).filter(Boolean))];

      const vaccinesInfo = await prisma.vaccines.findMany({ where: { id: { in: vacIds } } });
      const barnsInfo = await prisma.barns.findMany({ where: { id: { in: barnIds } } });
      const staffsInfo = await prisma.staffs.findMany({ where: { id: { in: staffIds } } });

      const vacMap = Object.fromEntries(vaccinesInfo.map(v => [v.id, v.name]));
      const barnMap = Object.fromEntries(barnsInfo.map(b => [b.id, b.name]));
      const staffMap = Object.fromEntries(staffsInfo.map(s => [s.id, s.full_name]));

      const data = usages.map(v => ({
        ...v,
        vaccine_name: vacMap[v.vaccine_id] || null,
        barn_name: barnMap[v.barn_id] || null,
        performed_by_name: staffMap[v.performed_by] || null
      }));

      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi tải dữ liệu tiêm phòng' });
    }
  },

  // Thêm bản ghi tiêm phòng mới
  create: async (request, reply) => {
    const { pig_id, barn_id, vaccine_id, quantity, unit, vaccinated_at, note } = request.body;
    const performed_by = request.user.staff_id;

    if (quantity === undefined || isNaN(quantity) || Number(quantity) <= 0) {
      return reply.code(400).send({ success: false, message: 'Số lượng sử dụng phải lớn hơn 0' });
    }
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        const vaccines = await tx.vaccines.findUnique({ where: { id: Number(vaccine_id) } });
        if (!vaccines) throw new Error('Không tìm thấy loại vaccine');
        
        const currentStock = vaccines.stock || 0;
        if (currentStock < quantity) {
          throw new Error(`Kho không đủ (Còn: ${currentStock} ${vaccines.unit || ''}). Vui lòng nhập kho.`);
        }

        await tx.vaccines.update({
          where: { id: Number(vaccine_id) },
          data: { stock: { decrement: Number(quantity) } }
        });

        const usage = await tx.vaccine_usages.create({
          data: {
            pig_id: pig_id ? Number(pig_id) : null,
            barn_id: barn_id ? Number(barn_id) : null,
            vaccine_id: Number(vaccine_id),
            quantity: Number(quantity),
            unit,
            vaccinated_at: new Date(vaccinated_at),
            performed_by: Number(performed_by),
            note: note || ''
          }
        });
        return usage;
      });

      return reply.code(201).send({ 
        success: true, 
        message: 'Ghi nhận tiêm phòng thành công', 
        data: { id: result.id } 
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(error.message.includes('Kho không đủ') ? 400 : 500).send({ success: false, message: error.message || 'Lỗi khi lưu lịch tiêm phòng' });
    }
  },

  // Xóa bản ghi tiêm phòng
  delete: async (request, reply) => {
    const { id } = request.params;
    try {
      await prisma.$transaction(async (tx) => {
        const usage = await tx.vaccine_usages.findUnique({ where: { id: Number(id) } });
        if (usage) {
          await tx.vaccines.update({
            where: { id: usage.vaccine_id },
            data: { stock: { increment: usage.quantity } }
          });
          await tx.vaccine_usages.delete({ where: { id: Number(id) } });
        }
      });
      
      return reply.send({ success: true, message: 'Đã xóa bản ghi và hoàn lại kho' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bản ghi tiêm phòng' });
    }
  }
};