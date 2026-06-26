import prisma from '../config/prisma.js';
import { ROLE, LIFECYCLE } from '../config/constants.js';

export const deathsController = {
  getAll: async (request, reply) => {
    try {
      const whereClause = {};
      if (request.user.role === ROLE.FARM_WORKER) {
        const allowedPigs = await prisma.pigs.findMany({
          where: { barns: { staff_barns: { some: { staff_id: request.user.staff_id } } } },
          select: { id: true }
        });
        whereClause.pig_id = { in: allowedPigs.map(p => p.id) };
      }

      const deaths = await prisma.pig_deaths.findMany({
        where: whereClause,
        orderBy: [ { death_date: 'desc' }, { created_at: 'desc' } ]
      });

      const pigIds = [...new Set(deaths.map(d => d.pig_id).filter(Boolean))];
      const staffIds = [...new Set(deaths.map(d => d.recorded_by).filter(Boolean))];

      const pigsInfo = await prisma.pigs.findMany({
        where: { id: { in: pigIds } },
        include: { barns: { select: { name: true } } }
      });
      const pigMap = Object.fromEntries(pigsInfo.map(p => [p.id, p]));

      const staffsInfo = await prisma.staffs.findMany({ where: { id: { in: staffIds } } });
      const staffMap = Object.fromEntries(staffsInfo.map(s => [s.id, s.full_name]));

      const data = deaths.map(d => ({
        ...d,
        barn_name: pigMap[d.pig_id]?.barns?.name || null,
        recorded_by_name: staffMap[d.recorded_by] || null
      }));

      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu lợn chết' });
    }
  },
  
  create: async (request, reply) => {
    const { pig_id, death_date, reason, disposal_method, note } = request.body;
    const recorded_by = request.user.staff_id;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.pig_deaths.create({
          data: {
            pig_id: Number(pig_id),
            death_date: new Date(death_date),
            reason,
            disposal_method,
            note: note || null,
            recorded_by: Number(recorded_by)
          }
        });
        
        await tx.pigs.update({
          where: { id: Number(pig_id) },
          data: { lifecycle_status: LIFECYCLE.DEAD, updated_at: new Date() }
        });
      });

      return reply.code(201).send({ success: true, message: 'Ghi nhận lợn chết thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi hệ thống khi ghi nhận' });
    }
  }
};