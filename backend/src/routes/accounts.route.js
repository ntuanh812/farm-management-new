import bcrypt from 'bcrypt'
import pool from '../config/db.js'
import { verifyToken, authorizeRoles } from '../middleware/auth.js'

export default async function accountsRoute(app) {
  const onlyAdmin = { preHandler: [verifyToken, authorizeRoles('ADMIN')] }

  // GET /api/accounts
  app.get('/', onlyAdmin, async (request, reply) => {
    const [rows] = await pool.query(
      `SELECT a.id, a.username, a.is_active, a.last_login, a.created_at,
              e.full_name, e.phone,
              r.code AS role_code, r.name AS role_name
       FROM accounts a
       JOIN employees e ON a.employee_id = e.id
       LEFT JOIN roles r ON e.role_id = r.id
       ORDER BY a.created_at DESC`
    )
    return reply.send({ success: true, data: rows })
  })

  // POST /api/accounts — tạo tài khoản mới
  app.post('/', onlyAdmin, async (request, reply) => {
    const { employee_id, username, password } = request.body
    if (!employee_id || !username || !password) {
      return reply.code(400).send({ success: false, message: 'Thiếu thông tin bắt buộc' })
    }

    // Kiểm tra username đã tồn tại chưa
    const [exist] = await pool.query('SELECT id FROM accounts WHERE username = ?', [username])
    if (exist.length > 0) {
      return reply.code(409).send({ success: false, message: 'Username đã tồn tại' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO accounts (employee_id, username, password) VALUES (?,?,?)',
      [employee_id, username, hashed]
    )
    return reply.code(201).send({ success: true, message: 'Tạo tài khoản thành công', data: { id: result.insertId } })
  })

  // PATCH /api/accounts/:id/reset-password
  app.patch('/:id/reset-password', onlyAdmin, async (request, reply) => {
    const { new_password } = request.body
    if (!new_password) return reply.code(400).send({ success: false, message: 'Thiếu mật khẩu mới' })
    const hashed = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE accounts SET password = ? WHERE id = ?', [hashed, request.params.id])
    return reply.send({ success: true, message: 'Đặt lại mật khẩu thành công' })
  })

  // PATCH /api/accounts/:id/toggle-active
  app.patch('/:id/toggle-active', onlyAdmin, async (request, reply) => {
    const [rows] = await pool.query('SELECT is_active FROM accounts WHERE id = ?', [request.params.id])
    if (!rows[0]) return reply.code(404).send({ success: false, message: 'Không tìm thấy tài khoản' })
    const newStatus = rows[0].is_active ? 0 : 1
    await pool.query('UPDATE accounts SET is_active = ? WHERE id = ?', [newStatus, request.params.id])
    return reply.send({ success: true, message: newStatus ? 'Đã kích hoạt tài khoản' : 'Đã khóa tài khoản' })
  })

  // DELETE /api/accounts/:id
  app.delete('/:id', onlyAdmin, async (request, reply) => {
    await pool.query('DELETE FROM accounts WHERE id = ?', [request.params.id])
    return reply.send({ success: true, message: 'Xóa tài khoản thành công' })
  })
}
