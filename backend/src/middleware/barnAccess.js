import pool from '../config/db.js'

export async function checkBarnAccess(request, reply) {
  const { role, staff_id } = request.user;
  
  // ADMIN has access to all barns
  if (role === 'ADMIN') return;

  // Extract barn_id from various sources
  let barn_id = request.body?.barn_id || request.query?.barn_id || request.params?.barn_id || request.params?.id; // sometimes id in params is barn_id, need to be careful

  // If no barn_id is targeted in this request, allow it to pass (or handle it in controller)
  // But ideally, any specific barn operation should have a barn_id.
  if (!barn_id) return;

  // Tránh việc F12 can thiệp gửi mảng (array) qua body làm câu lệnh Query bị lỗi hoặc chạy sai
  if (Array.isArray(barn_id)) {
    barn_id = barn_id[0];
  }

  try {
    const [rows] = await pool.query(
      'SELECT 1 FROM staff_barns WHERE staff_id = ? AND barn_id = ?',
      [staff_id, barn_id]
    );

    if (rows.length === 0) {
      reply.status(403).send({ success: false, message: 'Bạn không có quyền truy cập vào chuồng này' });
    }
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ success: false, message: 'Lỗi kiểm tra quyền truy cập chuồng' });
  }
}
