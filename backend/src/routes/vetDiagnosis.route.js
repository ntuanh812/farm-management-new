import pool from '../config/db.js'
import { verifyToken, authorizeRoles } from '../middleware/auth.js'

export default async function vetDiagnosisRoute(app) {
  const vetOrAdmin = { preHandler: [verifyToken, authorizeRoles('ADMIN', 'VET_DOCTOR')] }
  const allRoles   = { preHandler: [verifyToken] }

  // GET /api/vet-diagnosis — danh sách (có filter)
  app.get('/', allRoles, async (request, reply) => {
    const { barn_id, status, from_date, to_date, pig_id } = request.query
    let sql = `SELECT vd.*, e.full_name AS vet_name, b.name AS barn_name
               FROM vet_diagnosis vd
               LEFT JOIN staffs e ON vd.vet_doctor_id = e.id
               LEFT JOIN barns b ON vd.barn_id = b.id
               WHERE 1=1`
    const params = []

    if (barn_id)   { sql += ' AND vd.barn_id = ?';             params.push(barn_id) }
    if (status)    { sql += ' AND vd.status = ?';              params.push(status) }
    if (pig_id)    { sql += ' AND vd.pig_id LIKE ?';           params.push(`%${pig_id}%`) }
    if (from_date) { sql += ' AND vd.diagnosis_date >= ?';     params.push(from_date) }
    if (to_date)   { sql += ' AND vd.diagnosis_date <= ?';     params.push(to_date) }
    
    if (request.user.role === 'FARM_WORKER') {
      sql += ' AND vd.barn_id IN (SELECT barn_id FROM staff_barns WHERE staff_id = ?)';
      params.push(request.user.staff_id);
    }

    sql += ' ORDER BY vd.diagnosis_date DESC'
    const [rows] = await pool.query(sql, params)
    return reply.send({ success: true, data: rows })
  })

  // GET /api/vet-diagnosis/:id — chi tiết + thuốc đã dùng
  app.get('/:id', allRoles, async (request, reply) => {
    const [rows] = await pool.query(
      `SELECT vd.*, e.full_name AS vet_name, b.name AS barn_name
       FROM vet_diagnosis vd
       LEFT JOIN staffs e ON vd.vet_doctor_id = e.id
       LEFT JOIN barns b ON vd.barn_id = b.id
       WHERE vd.id = ?`,
      [request.params.id]
    )
    if (!rows[0]) return reply.code(404).send({ success: false, message: 'Không tìm thấy phiếu' })

    const [medicines] = await pool.query(
      `SELECT vdm.*, m.name AS medicine_name
       FROM vet_diagnosis_medicines vdm
       JOIN medicines m ON vdm.medicine_id = m.id
       WHERE vdm.diagnosis_id = ?`,
      [request.params.id]
    )

    return reply.send({ success: true, data: { ...rows[0], medicines } })
  })

  // POST /api/vet-diagnosis — tạo phiếu (VET + ADMIN)
  app.post('/', vetOrAdmin, async (request, reply) => {
    const {
      pig_id, barn_id, diagnosis_date, symptoms, suspected_disease,
      final_disease, temperature, weight, severity_level,
      treatment_plan, next_check_date, status, note, medicines = []
    } = request.body

    const vet_doctor_id = request.user.staff_id

    const [result] = await pool.query(
      `INSERT INTO vet_diagnosis
        (pig_id,barn_id,diagnosis_date,symptoms,suspected_disease,final_disease,
         temperature,weight,severity_level,treatment_plan,next_check_date,
         vet_doctor_id,status,note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [pig_id, barn_id, diagnosis_date, symptoms, suspected_disease, final_disease,
       temperature, weight, severity_level, treatment_plan, next_check_date,
       vet_doctor_id, status || 'dang_dieu_tri', note]
    )

    const diagId = result.insertId

    // Lưu danh sách thuốc đã dùng
    if (medicines.length > 0) {
      const vals = medicines.map(m => [diagId, m.medicine_id, m.dosage, m.unit, m.duration_days])
      await pool.query(
        'INSERT INTO vet_diagnosis_medicines (diagnosis_id, medicine_id, dosage, unit, duration_days) VALUES ?',
        [vals]
      )
    }

    return reply.code(201).send({ success: true, message: 'Tạo phiếu chuẩn đoán thành công', data: { id: diagId } })
  })

  // PUT /api/vet-diagnosis/:id — cập nhật
  app.put('/:id', vetOrAdmin, async (request, reply) => {
    const {
      symptoms, suspected_disease, final_disease, temperature, weight,
      severity_level, treatment_plan, next_check_date, status, note, medicines = []
    } = request.body

    await pool.query(
      `UPDATE vet_diagnosis SET symptoms=?,suspected_disease=?,final_disease=?,
       temperature=?,weight=?,severity_level=?,treatment_plan=?,
       next_check_date=?,status=?,note=? WHERE id=?`,
      [symptoms, suspected_disease, final_disease, temperature, weight,
       severity_level, treatment_plan, next_check_date, status, note, request.params.id]
    )

    // Xóa thuốc cũ → thêm lại
    await pool.query('DELETE FROM vet_diagnosis_medicines WHERE diagnosis_id = ?', [request.params.id])
    if (medicines.length > 0) {
      const vals = medicines.map(m => [request.params.id, m.medicine_id, m.dosage, m.unit, m.duration_days])
      await pool.query(
        'INSERT INTO vet_diagnosis_medicines (diagnosis_id, medicine_id, dosage, unit, duration_days) VALUES ?',
        [vals]
      )
    }

    return reply.send({ success: true, message: 'Cập nhật phiếu thành công' })
  })

  // DELETE /api/vet-diagnosis/:id (chỉ ADMIN)
  app.delete('/:id', { preHandler: [verifyToken, authorizeRoles('ADMIN')] }, async (request, reply) => {
    await pool.query('DELETE FROM vet_diagnosis_medicines WHERE diagnosis_id = ?', [request.params.id])
    await pool.query('DELETE FROM vet_diagnosis WHERE id = ?', [request.params.id])
    return reply.send({ success: true, message: 'Xóa phiếu thành công' })
  })
}
