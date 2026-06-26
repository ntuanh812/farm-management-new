import prisma from '../config/prisma.js';
import { LIFECYCLE, BARN_STATUS } from '../config/constants.js';

export const barnsController = {
  // Lấy danh sách chuồng trại kèm số lượng lợn hiện tại
  getAll: async (request, reply) => {
    try {
      const whereClause = {};
      if (request.user.role === 'FARM_WORKER') {
        whereClause.staff_barns = {
          some: { staff_id: request.user.staff_id }
        };
      }

      const barns = await prisma.barns.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { pigs: { where: { lifecycle_status: LIFECYCLE.ACTIVE } } }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const data = barns.map(b => {
        const { _count, ...rest } = b;
        return {
          ...rest,
          current_quantity: _count?.pigs || 0
        };
      });
      
      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải danh sách chuồng trại' });
    }
  },
  
  // Thêm mới chuồng trại
  create: async (request, reply) => {
    const { code, name, capacity, barn_type, status, note } = request.body;
    try {
      // Kiểm tra trùng tên chuồng
      const existingName = await prisma.barns.findFirst({
        where: { name: name.trim() }
      });
      if (existingName) {
        return reply.code(400).send({ success: false, message: 'Tên chuồng đã tồn tại' });
      }

      await prisma.barns.create({
        data: {
          code,
          name: name.trim(),
          capacity: Number(capacity),
          barn_type,
          status: status || BARN_STATUS.ACTIVE,
          note: note || null
        }
      });
      return reply.code(201).send({ success: true, message: 'Thêm chuồng trại thành công' });
    } catch (error) {
      request.log.error(error);
      if (error.code === 'P2002') {
        return reply.code(400).send({ success: false, message: 'Mã chuồng đã tồn tại' });
      }
      return reply.code(500).send({ success: false, message: 'Lỗi khi thêm chuồng trại' });
    }
  },

  // Cập nhật chuồng trại
  update: async (request, reply) => {
    const { id } = request.params;
    const { code, name, capacity, barn_type, status, note } = request.body;
    try {
      // Kiểm tra trùng tên chuồng (loại trừ bản ghi đang sửa)
      const existingName = await prisma.barns.findFirst({
        where: {
          name: name.trim(),
          id: { not: Number(id) }
        }
      });
      if (existingName) {
        return reply.code(400).send({ success: false, message: 'Tên chuồng đã tồn tại' });
      }

      await prisma.barns.update({
        where: { id: Number(id) },
        data: {
          code,
          name: name.trim(),
          capacity: Number(capacity),
          barn_type,
          status,
          note: note || null
        }
      });
      return reply.send({ success: true, message: 'Cập nhật chuồng trại thành công' });
    } catch (error) {
      request.log.error(error);
      if (error.code === 'P2002') {
        return reply.code(400).send({ success: false, message: 'Mã chuồng đã tồn tại' });
      }
      return reply.code(500).send({ success: false, message: 'Lỗi khi cập nhật chuồng trại' });
    }
  },

  // Xóa chuồng trại
  delete: async (request, reply) => {
    const { id } = request.params;
    try {
      const activePigsCount = await prisma.pigs.count({
        where: { barn_id: Number(id), lifecycle_status: LIFECYCLE.ACTIVE }
      });
      
      if (activePigsCount > 0) {
        return reply.code(400).send({ success: false, message: 'Không thể xóa chuồng đang có lợn' });
      }

      await prisma.barns.delete({ where: { id: Number(id) } });
      return reply.send({ success: true, message: 'Xóa chuồng trại thành công' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi xóa chuồng trại' });
    }
  }
};