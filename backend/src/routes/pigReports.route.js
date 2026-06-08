import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../config/db.js'
import { verifyToken, authorizeRoles } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')

// Tạo tên file duy nhất: timestamp_random.ext
function uniqueFilename(originalName) {
  const ext  = path.extname(originalName)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}_${rand}${ext}`
}

export default async function pigReportsRoute(app) {
  // ── Upload ảnh ─────────────────────────────────────────
  // POST /api/pig-reports/upload
  // Nhận 1 hoặc nhiều file ảnh, trả về array URL
  app.post('/upload', { preHandler: [verifyToken] }, async (request, reply) => {
    const parts  = request.files()   // async iterator
    const urls   = []

    for await (const part of parts) {
      // Chỉ chấp nhận ảnh
      if (!part.mimetype.startsWith('image/')) {
        return reply.code(400).send({ success: false, message: 'Chỉ chấp nhận file ảnh' })
      }

      const filename = uniqueFilename(part.filename)
      const filepath = path.join(UPLOAD_DIR, filename)

      // Lưu file vào disk
      await pipeline(part.file, fs.createWriteStream(filepath))

      urls.push(`/uploads/${filename}`)
    }

    return reply.send({ success: true, data: urls })
  })

  // ── Lấy danh sách báo cáo ──────────────────────────────
  // GET /api/pig-reports
  app.get('/', { preHandler: [verifyToken] }, async (request, reply) => {
    const { status, barn_id } = request.query
    let sql = `
      SELECT pr.*,
             e.full_name   AS reporter_name,
             b.name        AS barn_name,
             v.full_name   AS vet_name
      FROM pig_reports pr
      JOIN staffs e ON pr.reporter_id   = e.id
      JOIN barns     b ON pr.barn_id       = b.id
      LEFT JOIN staffs v ON pr.vet_doctor_id = v.id
      WHERE 1=1`
    const params = []

    if (status)  { sql += ' AND pr.status = ?';  params.push(status) }
    if (barn_id) { sql += ' AND pr.barn_id = ?'; params.push(barn_id) }

    // Nhân viên thấy báo cáo của các chuồng được phân công quản lý
    if (request.user.role === 'FARM_WORKER') {
      sql += ' AND pr.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)'
      params.push(request.user.staff_id)
    }

    sql += ' ORDER BY pr.created_at DESC'
    const [rows] = await pool.query(sql, params)

    // Parse JSON images
    const data = rows.map(r => ({
      ...r,
      images: r.images ? JSON.parse(r.images) : [],
    }))

    return reply.send({ success: true, data })
  })

  // ── Tạo báo cáo mới (FARM_WORKER + ADMIN) ─────────────
  // POST /api/pig-reports
  app.post('/', {
    preHandler: [verifyToken, authorizeRoles('ADMIN', 'FARM_WORKER')],
  }, async (request, reply) => {
    const { pig_id, barn_id, description, images = [] } = request.body
    if (!pig_id || !barn_id || !description) {
      return reply.code(400).send({ success: false, message: 'Thiếu thông tin bắt buộc' })
    }

    const reporter_id = request.user.staff_id
    const [result] = await pool.query(
      `INSERT INTO pig_reports (pig_id, barn_id, reporter_id, description, images)
       VALUES (?, ?, ?, ?, ?)`,
      [pig_id, barn_id, reporter_id, description, JSON.stringify(images)]
    )

    return reply.code(201).send({
      success: true,
      message: 'Gửi báo cáo thành công',
      data: { id: result.insertId },
    })
  })

  // ── Bác sĩ phản hồi báo cáo ────────────────────────────
  // PATCH /api/pig-reports/:id/respond
  app.patch('/:id/respond', {
    preHandler: [verifyToken, authorizeRoles('ADMIN', 'VET_DOCTOR')],
  }, async (request, reply) => {
    const { status, vet_note } = request.body
    const vet_doctor_id = request.user.staff_id

    await pool.query(
      `UPDATE pig_reports
       SET status = ?, vet_note = ?, vet_doctor_id = ?
       WHERE id = ?`,
      [status, vet_note, vet_doctor_id, request.params.id]
    )

    return reply.send({ success: true, message: 'Đã cập nhật trạng thái báo cáo' })
  })

  // ── Xóa báo cáo (ADMIN) ───────────────────────────────
  // DELETE /api/pig-reports/:id
  app.delete('/:id', {
    preHandler: [verifyToken, authorizeRoles('ADMIN')],
  }, async (request, reply) => {
    // Xóa ảnh trên disk trước
    const [rows] = await pool.query('SELECT images FROM pig_reports WHERE id = ?', [request.params.id])
    if (rows[0]?.images) {
      const imgs = JSON.parse(rows[0].images)
      imgs.forEach(url => {
        const file = path.join(UPLOAD_DIR, path.basename(url))
        fs.unlink(file, () => {}) // Bỏ qua lỗi nếu file không tồn tại
      })
    }

    await pool.query('DELETE FROM pig_reports WHERE id = ?', [request.params.id])
    return reply.send({ success: true, message: 'Đã xóa báo cáo' })
  })

  // ── Lấy tin nhắn của báo cáo ─────────────────────────
  // GET /api/pig-reports/:id/messages
  app.get('/:id/messages', { preHandler: [verifyToken] }, async (request, reply) => {
    const reportId = request.params.id

    if (request.user.role === 'FARM_WORKER') {
      const [reports] = await pool.query('SELECT barn_id FROM pig_reports WHERE id = ?', [reportId])
      if (reports.length === 0) return reply.code(404).send({ success: false, message: 'Báo cáo không tồn tại' })
      const [perms] = await pool.query(
        'SELECT 1 FROM staff_barns WHERE staff_id = ? AND barn_id = ?',
        [request.user.staff_id, reports[0].barn_id]
      )
      if (perms.length === 0) return reply.code(403).send({ success: false, message: 'Bạn không quản lý chuồng này' })
    }

    const [rows] = await pool.query(`
      SELECT m.*, s.full_name AS sender_name, s.avatar_url, r.name AS sender_role
      FROM pig_report_messages m
      JOIN staffs s ON m.sender_id = s.id
      LEFT JOIN roles r ON s.role_id = r.id
      WHERE m.pig_report_id = ?
      ORDER BY m.created_at ASC
    `, [reportId])

    const data = rows.map(r => ({
      ...r,
      images: r.images ? (typeof r.images === 'string' ? JSON.parse(r.images) : r.images) : []
    }))

    return reply.send({ success: true, data })
  })

  // ── Gửi tin nhắn mới ───────────────────────────────────
  // POST /api/pig-reports/:id/messages
  app.post('/:id/messages', { preHandler: [verifyToken] }, async (request, reply) => {
    const reportId = request.params.id
    const { message, images = [], status } = request.body

    if (!message) return reply.code(400).send({ success: false, message: 'Nội dung trống' })

    if (request.user.role === 'FARM_WORKER') {
      const [reports] = await pool.query('SELECT barn_id FROM pig_reports WHERE id = ?', [reportId])
      if (reports.length === 0) return reply.code(404).send({ success: false, message: 'Báo cáo không tồn tại' })
      const [perms] = await pool.query(
        'SELECT 1 FROM staff_barns WHERE staff_id = ? AND barn_id = ?',
        [request.user.staff_id, reports[0].barn_id]
      )
      if (perms.length === 0) return reply.code(403).send({ success: false, message: 'Bạn không quản lý chuồng này' })
    }

    await pool.query(
      'INSERT INTO pig_report_messages (pig_report_id, sender_id, message, images) VALUES (?, ?, ?, ?)',
      [reportId, request.user.staff_id, message, JSON.stringify(images)]
    )

    if (status && ['ADMIN', 'VET_DOCTOR'].includes(request.user.role)) {
      await pool.query(
        'UPDATE pig_reports SET status = ?, vet_doctor_id = ? WHERE id = ?',
        [status, request.user.staff_id, reportId]
      )
    }

    return reply.code(201).send({ success: true, message: 'Đã gửi tin nhắn' })
  })
}
