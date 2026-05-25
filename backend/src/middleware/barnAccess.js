import pool from '../config/db.js'

export async function checkBarnAccess(request, reply) {
  const { role, employee_id } = request.user;
  
  // ADMIN has access to all barns
  if (role === 'ADMIN') return;

  // Extract barn_id from various sources
  const barn_id = request.body?.barn_id || request.query?.barn_id || request.params?.barn_id || request.params?.id; // sometimes id in params is barn_id, need to be careful

  // If no barn_id is targeted in this request, allow it to pass (or handle it in controller)
  // But ideally, any specific barn operation should have a barn_id.
  if (!barn_id) return;

  try {
    const [rows] = await pool.query(
      'SELECT 1 FROM employee_barns WHERE employee_id = ? AND barn_id = ?',
      [employee_id, barn_id]
    );

    if (rows.length === 0) {
      reply.status(403).send({ success: false, message: 'Bạn không có quyền truy cập vào chuồng này' });
    }
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ success: false, message: 'Lỗi kiểm tra quyền truy cập chuồng' });
  }
}
