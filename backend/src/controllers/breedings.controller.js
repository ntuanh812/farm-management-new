import prisma from '../config/prisma.js';

export const breedingsController = {
  getAll: async (request, reply) => {
    try {
      const whereClause = {};
      if (request.user.role === 'FARM_WORKER') {
        const allowedPigs = await prisma.pigs.findMany({
          where: { barns: { staff_barns: { some: { staff_id: request.user.staff_id } } } },
          select: { id: true }
        });
        const allowedPigIds = allowedPigs.map(p => p.id);
        whereClause.OR = [
          { sow_id: { in: allowedPigIds } },
          { boar_id: { in: allowedPigIds } }
        ];
      }

      const breedings = await prisma.pig_breedings.findMany({
        where: whereClause,
        orderBy: [ { breeding_date: 'desc' }, { created_at: 'desc' } ]
      });

      const staffIds = [...new Set(breedings.map(b => b.staff_id).filter(Boolean))];
      const staffsInfo = await prisma.staffs.findMany({ where: { id: { in: staffIds } } });
      const staffMap = Object.fromEntries(staffsInfo.map(s => [s.id, s.full_name]));

      const data = breedings.map(b => ({
        ...b,
        sow_code: b.sow_id,
        boar_code: b.boar_id,
        staff_name: staffMap[b.staff_id] || null
      }));

      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu phối giống' });
    }
  },
  create: async (request, reply) => {
    const { sow_id, boar_id, breeding_date, expected_farrow_date, status, note } = request.body;
    const staff_id = request.user.staff_id;
    try {
      await prisma.pig_breedings.create({
        data: {
          sow_id: Number(sow_id),
          boar_id: Number(boar_id),
          breeding_date: new Date(breeding_date),
          expected_farrow_date: expected_farrow_date ? new Date(expected_farrow_date) : null,
          status,
          staff_id: Number(staff_id),
          note: note || null
        }
      });
      return reply.code(201).send({ success: true, message: 'Ghi nhận phối giống thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi ghi nhận' });
    }
  },
  updateStatus: async (request, reply) => {
    try {
      await prisma.pig_breedings.update({
        where: { id: Number(request.params.id) },
        data: { status: request.body.status }
      });
      return reply.send({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi cập nhật' });
    }
  },
  delete: async (request, reply) => {
    try {
      await prisma.pig_breedings.delete({
        where: { id: Number(request.params.id) }
      });
      return reply.send({ success: true, message: 'Xóa thành công' });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa' });
    }
  }
};