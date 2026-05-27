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
      `SELECT a.*, e.full_name, r.code AS role
       FROM accounts a
       JOIN staffs e ON a.staff_id = e.id
       LEFT JOIN roles r ON e.role_id = r.id
       WHERE a.username = ? AND a.is_active = 1`,
      [username]
    )

    const account = rows[0]
    if (!account) {
      return reply.code(401).send({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa' })
    }

    let valid = false
    // Tự động nâng cấp mã hóa: Nếu DB lưu chuỗi thường (từ file seed), kiểm tra và mã hóa lại ngay sau khi đăng nhập!
    if (!account.password_hash.startsWith('$2')) {
      if (password === account.password_hash) {
        valid = true
        const newHash = await bcrypt.hash(password, 10)
        await pool.query('UPDATE accounts SET password_hash = ? WHERE id = ?', [newHash, account.id])
      }
    } else {
      valid = await bcrypt.compare(password, account.password_hash)
    }

    if (!valid) {
      return reply.code(401).send({ success: false, message: 'Sai mật khẩu' })
    }

    const token = app.jwt.sign(
      { id: account.id, staff_id: account.staff_id, role: account.role, full_name: account.full_name },
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
