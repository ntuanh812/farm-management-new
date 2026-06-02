import pool from '../config/db.js';

export const feedsController = {
  getAll: async (request, reply) => {
    try {
      const [rows] = await pool.query('SELECT * FROM feeds ORDER BY created_at DESC');
      return reply.send({ success: true, data: rows });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải danh mục cám' });
    }
  },

  create: async (request, reply) => {
    const { name, stock } = request.body;
    if (!name) {
      return reply.code(400).send({ success: false, message: 'Vui lòng cung cấp tên loại cám' });
    }
    
    try {
      const [result] = await pool.query('INSERT INTO feeds (name, stock) VALUES (?, ?)', [name, stock || 0]);
      return reply.code(201).send({ 
        success: true, 
        message: 'Thêm loại cám thành công',
        data: { id: result.insertId, name, stock: stock || 0 }
      });
    } catch (error) {
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi thêm loại cám mới' });
    }
  },

  addStock: async (request, reply) => {
    const { id } = request.params;
    const { quantity } = request.body;
    if (!quantity || quantity <= 0) return reply.code(400).send({ success: false, message: 'Số lượng nhập phải lớn hơn 0' });
    try {
      await pool.query('UPDATE feeds SET stock = COALESCE(stock, 0) + ? WHERE id = ?', [quantity, id]);
      return reply.send({ success: true, message: 'Nhập thêm cám thành công' });
    } catch (error) {
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi nhập thêm cám' });
    }
  }
};