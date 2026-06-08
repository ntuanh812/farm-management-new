import prisma from '../config/prisma.js';

export const vaccinesController = {
  getAll: async (request, reply) => {
    try {
      const rows = await prisma.vaccines.findMany({ orderBy: { created_at: 'desc' } });
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải danh mục vaccine' });
    }
  },

  create: async (request, reply) => {
    const { name, unit, stock } = request.body;
    if (!name) {
      return reply.code(400).send({ success: false, message: 'Vui lòng cung cấp tên loại vaccine' });
    }
    
    try {
      const result = await prisma.vaccines.create({ data: { name, unit: unit || null, stock: stock ? Number(stock) : 0 } });
      return reply.code(201).send({ 
        success: true, 
        message: 'Thêm loại vaccine thành công',
        data: result
      });
    } catch (error) {
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi thêm loại vaccine mới' });
    }
  },

  addStock: async (request, reply) => {
    const { id } = request.params;
    const { quantity } = request.body;
    if (!quantity || quantity <= 0) return reply.code(400).send({ success: false, message: 'Số lượng nhập phải lớn hơn 0' });
    try {
      await prisma.vaccines.update({
        where: { id: Number(id) },
        data: { stock: { increment: Number(quantity) } }
      });
      return reply.send({ success: true, message: 'Nhập thêm vaccine thành công' });
    } catch (error) {
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi nhập thêm vaccine' });
    }
  }
};