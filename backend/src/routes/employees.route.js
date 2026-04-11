import pool from '../config/db.js'
import { verifyToken, authorizeRoles } from '../middleware/auth.js'

export default async function employeesRoute(app) {
  // Tất cả route đều cần login
  const onlyAdmin = { preHandler: [verifyToken, authorizeRoles('ADMIN')] }

  // GET /api/employees — lấy danh sách
  app.get('/', { preHandler: [verifyToken] }, async (request, reply) => {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY created_at DESC')
    return reply.send({ success: true, data: rows })
  })

  // GET /api/employees/:id
  app.get('/:id', { preHandler: [verifyToken] }, async (request, reply) => {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [request.params.id])
    if (!rows[0]) return reply.code(404).send({ success: false, message: 'Không tìm thấy nhân viên' })
    return reply.send({ success: true, data: rows[0] })
  })

  // POST /api/employees — thêm mới (chỉ ADMIN)
  app.post('/', onlyAdmin, async (request, reply) => {
    const { full_name, phone, email, address, gender, dob, role } = request.body
    if (!full_name || !role) {
      return reply.code(400).send({ success: false, message: 'Thiếu họ tên hoặc vai trò' })
    }
    const [result] = await pool.query(
      'INSERT INTO employees (full_name, phone, email, address, gender, dob, role) VALUES (?,?,?,?,?,?,?)',
      [full_name, phone, email, address, gender, dob, role]
    )
    return reply.code(201).send({ success: true, message: 'Thêm nhân viên thành công', data: { id: result.insertId } })
  })

  // PUT /api/employees/:id — cập nhật (chỉ ADMIN)
  app.put('/:id', onlyAdmin, async (request, reply) => {
    const { full_name, phone, email, address, gender, dob, role, status } = request.body
    await pool.query(
      'UPDATE employees SET full_name=?, phone=?, email=?, address=?, gender=?, dob=?, role=?, status=? WHERE id=?',
      [full_name, phone, email, address, gender, dob, role, status, request.params.id]
    )
    return reply.send({ success: true, message: 'Cập nhật thành công' })
  })

  // DELETE /api/employees/:id (chỉ ADMIN)
  app.delete('/:id', onlyAdmin, async (request, reply) => {
    await pool.query('DELETE FROM employees WHERE id = ?', [request.params.id])
    return reply.send({ success: true, message: 'Xóa nhân viên thành công' })
  })
}
