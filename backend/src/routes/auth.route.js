import bcrypt from 'bcrypt'
import pool from '../config/db.js'
import { verifyToken } from '../middleware/auth.js'

export default async function authRoute(app) {
  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
      return reply.code(400).send({ success: false, message: 'Thiếu username hoặc password' })
    }

    const [rows] = await pool.query(
      `SELECT a.*, e.full_name, e.role
       FROM accounts a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.username = ? AND a.is_active = 1`,
      [username]
    )

    const account = rows[0]
    if (!account) {
      return reply.code(401).send({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa' })
    }

    const valid = await bcrypt.compare(password, account.password_hash)
    if (!valid) {
      return reply.code(401).send({ success: false, message: 'Sai mật khẩu' })
    }

    const token = app.jwt.sign(
      { id: account.id, employee_id: account.employee_id, role: account.role, full_name: account.full_name },
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    )

    // Cập nhật last_login
    await pool.query('UPDATE accounts SET last_login = NOW() WHERE id = ?', [account.id])

    return reply.send({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: { id: account.id, username: account.username, role: account.role, full_name: account.full_name }
      }
    })
  })

  // GET /api/auth/me — lấy thông tin user từ token
  app.get('/me', { preHandler: [verifyToken] }, async (request, reply) => {
    return reply.send({ success: true, data: request.user })
  })
}
