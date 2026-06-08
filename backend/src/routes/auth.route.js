import bcrypt from 'bcrypt'
import prisma from '../config/prisma.js'
import { verifyToken } from '../middleware/auth.js'

export default async function authRoute(app) {
  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
      return reply.code(400).send({ success: false, message: 'Thiếu username hoặc password' })
    }

    const account = await prisma.accounts.findFirst({
      where: { username, is_active: true },
      include: {
        staffs: {
          include: { roles: true }
        }
      }
    })

    if (!account) {
      return reply.code(401).send({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa' })
    }

    // BẢO MẬT: Chỉ so sánh bằng bcrypt, không chấp nhận plain text
    const valid = await bcrypt.compare(password, account.password_hash)

    if (!valid) {
      return reply.code(401).send({ success: false, message: 'Sai mật khẩu' })
    }

    const roleCode = account.staffs?.roles?.code;
    const fullName = account.staffs?.full_name;

    const token = app.jwt.sign(
      { id: account.id, staff_id: account.staff_id, role: roleCode, full_name: fullName },
      { expiresIn: process.env.JWT_EXPIRES || '1d' }
    )

    // Cập nhật last_login
    await prisma.accounts.update({
      where: { id: account.id },
      data: { last_login: new Date() }
    })

    return reply.send({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: { id: account.id, username: account.username, role: roleCode, full_name: fullName }
      }
    })
  })

  // GET /api/auth/me — lấy thông tin user từ token
  app.get('/me', { preHandler: [verifyToken] }, async (request, reply) => {
    return reply.send({ success: true, data: request.user })
  })
}
