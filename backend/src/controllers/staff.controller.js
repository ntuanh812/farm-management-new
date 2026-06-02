import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

export const staffController = {
  // 1. Lấy danh sách nhân sự tổng hợp
  getAllStaff: async (request, reply) => {
    try {
      // NOTE: staffs has role_id, not role.
      // e.role is used in previous query, I need to check schema.
      // staffs: role_id.
      const [rows] = await pool.query(`
        SELECT 
          e.id, e.full_name, e.phone, e.email, e.gender, e.dob, e.address, e.avatar_url AS avatar, e.role_id, e.created_at,
          r.name AS role_name, r.code as role_code,
          a.id AS account_id, a.username, a.is_active,
          b.id AS barn_id, b.name AS barn_name
        FROM staffs e
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN accounts a ON e.id = a.staff_id
        LEFT JOIN staff_barns eb ON e.id = eb.staff_id
        LEFT JOIN barns b ON eb.barn_id = b.id
        ORDER BY 
          CASE WHEN r.code = 'ADMIN' THEN 0 ELSE 1 END,
          e.created_at DESC
      `);

      const staffMap = new Map();
      rows.forEach(row => {
        if (!staffMap.has(row.id)) {
          staffMap.set(row.id, {
            id: row.id, full_name: row.full_name, phone: row.phone, email: row.email,
            gender: row.gender, dob: row.dob, address: row.address, avatar: row.avatar,
            role_id: row.role_id, role_name: row.role_name, role_code: row.role_code,
            created_at: row.created_at, account_id: row.account_id,
            username: row.username, is_active: row.is_active, barns: []
          });
        }
        if (row.barn_id) {
          const currentStaff = staffMap.get(row.id);
          const exists = currentStaff.barns.find(b => b.id === row.barn_id);
          if (!exists) {
            currentStaff.barns.push({ id: row.barn_id, name: row.barn_name });
          }
        }
      });

      const data = Array.from(staffMap.values());

      return reply.send({ success: true, data });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi tải danh sách nhân sự' });
    }
  },

  // 2. Lấy danh sách NV chưa có tài khoản
  getstaffsNoAccount: async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT e.id, e.full_name, e.role_id, r.name as role_name 
        FROM staffs e
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN accounts a ON e.id = a.staff_id
        WHERE a.id IS NULL
        ORDER BY e.full_name
      `);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải danh sách nhân viên' });
    }
  },

  // 3. Thêm nhân viên & Phân công chuồng (Dùng Transaction)
  createstaff: async (request, reply) => {
    const { full_name, phone, email, gender, dob, address, role_id, barn_ids, avatar } = request.body;
    
    // Basic validation
    if (!full_name) {
      return reply.code(400).send({ success: false, message: 'Vui lòng nhập tên nhân viên' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Insert nhân viên
      const [empResult] = await conn.query(
        `INSERT INTO staffs (full_name, phone, email, gender, dob, address, avatar_url, role_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [full_name, phone || null, email || null, gender || 'male', dob || null, address || null, avatar || null, role_id || null]
      );
      
      const staffId = empResult.insertId;

      // Nếu có phân công chuồng, Insert vào staff_barns
      if (Array.isArray(barn_ids) && barn_ids.length > 0) {
        // Lọc trùng barn_ids
        const uniqueBarnIds = [...new Set(barn_ids)];
        const barnValues = uniqueBarnIds.map(barnId => [staffId, barnId]);
        
        await conn.query(
          `INSERT INTO staff_barns (staff_id, barn_id) VALUES ?`,
          [barnValues]
        );
      }

      await conn.commit();
      return reply.code(201).send({ success: true, message: 'Thêm nhân viên thành công', data: { id: staffId } });
    } catch (error) {
      await conn.rollback();
      if (request.log) request.log.error(error);
      else console.error(error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('phone')) {
          return reply.code(400).send({ success: false, message: 'Số điện thoại đã tồn tại' });
        }
        if (error.message.includes('email')) {
          return reply.code(400).send({ success: false, message: 'Email đã tồn tại' });
        }
      }
      
      return reply.code(500).send({ success: false, message: 'Lỗi khi tạo nhân viên' });
    } finally {
      conn.release();
    }
  },

  // 3.5 Cập nhật nhân viên & Phân công chuồng
  updatestaff: async (request, reply) => {
    const { id } = request.params;
    const { full_name, phone, email, gender, dob, address, role_id, barn_ids, avatar } = request.body;

    if (!full_name) {
      return reply.code(400).send({ success: false, message: 'Vui lòng nhập tên nhân viên' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lấy thông tin avatar cũ
      const [oldStaff] = await conn.query('SELECT avatar_url AS avatar FROM staffs WHERE id = ?', [id]);
      const oldAvatar = oldStaff[0]?.avatar;

      // Cập nhật thông tin nhân viên
      await conn.query(
        `UPDATE staffs 
         SET full_name = ?, phone = ?, email = ?, gender = ?, dob = ?, address = ?, avatar_url = ?, role_id = ?
         WHERE id = ?`,
        [full_name, phone || null, email || null, gender || 'male', dob || null, address || null, avatar || null, role_id || null, id]
      );

      // Cập nhật phân công chuồng
      if (Array.isArray(barn_ids)) {
        await conn.query('DELETE FROM staff_barns WHERE staff_id = ?', [id]);
        if (barn_ids.length > 0) {
          const uniqueBarnIds = [...new Set(barn_ids)];
          const barnValues = uniqueBarnIds.map(barnId => [id, barnId]);
          await conn.query(
            'INSERT INTO staff_barns (staff_id, barn_id) VALUES ?',
            [barnValues]
          );
        }
      }

      await conn.commit();

      // Xóa file ảnh cũ vật lý nếu có sự thay đổi ảnh (thay ảnh mới hoặc xóa ảnh về rỗng)
      if (oldAvatar && oldAvatar !== avatar) {
        const file = path.join(UPLOAD_DIR, path.basename(oldAvatar));
        fs.unlink(file, (err) => {
          if (err) console.error("Lỗi xóa file ảnh cũ:", err);
        });
      }

      return reply.send({ success: true, message: 'Cập nhật nhân viên thành công' });
    } catch (error) {
      await conn.rollback();
      if (request.log) request.log.error(error);
      else console.error(error);
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('phone')) return reply.code(400).send({ success: false, message: 'Số điện thoại đã tồn tại' });
        if (error.message.includes('email')) return reply.code(400).send({ success: false, message: 'Email đã tồn tại' });
      }
      return reply.code(500).send({ success: false, message: 'Lỗi khi cập nhật nhân viên' });
    } finally {
      conn.release();
    }
  },

  // 4. Tạo tài khoản đăng nhập
  createAccount: async (request, reply) => {
    const { staff_id, username, password } = request.body;

    if (!staff_id || !username || !password) {
      return reply.code(400).send({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
      // 1. Kiểm tra staff đã có tài khoản chưa
      const [existingAccount] = await pool.query('SELECT id FROM accounts WHERE staff_id = ?', [staff_id]);
      if (existingAccount.length > 0) {
        return reply.code(400).send({ success: false, message: 'Nhân viên này đã có tài khoản' });
      }

      // 2. Kiểm tra username trùng lặp
      const [existingUsername] = await pool.query('SELECT id FROM accounts WHERE username = ?', [username]);
      if (existingUsername.length > 0) {
        return reply.code(400).send({ success: false, message: 'Tên đăng nhập đã tồn tại' });
      }

      // 3. Mã hóa mật khẩu
      const password_hash = await bcrypt.hash(password, 10);

      await pool.query(
        `INSERT INTO accounts (staff_id, username, password_hash, is_active) VALUES (?, ?, ?, 1)`,
        [staff_id, username, password_hash]
      );

      return reply.code(201).send({ success: true, message: 'Tạo tài khoản thành công' });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi tạo tài khoản' });
    }
  },

  // 5. Khóa / Mở khóa tài khoản
  toggleAccountStatus: async (request, reply) => {
    const { id } = request.params;
    const { is_active } = request.body;

    if (is_active === undefined) {
      return reply.code(400).send({ success: false, message: 'Thiếu trạng thái is_active' });
    }

    try {
      const [result] = await pool.query(
        'UPDATE accounts SET is_active = ? WHERE id = ?',
        [is_active ? 1 : 0, id]
      );

      // Thay vì affectedRows === 0, nên kiểm tra sự tồn tại nếu cần thiết
      if (result.affectedRows === 0) {
        // Kiểm tra xem ID có tồn tại hay không
        const [check] = await pool.query('SELECT id FROM accounts WHERE id = ?', [id]);
        if (check.length === 0) {
          return reply.code(404).send({ success: false, message: 'Không tìm thấy tài khoản' });
        }
      }

      return reply.send({ success: true, message: 'Đã cập nhật trạng thái tài khoản' });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi cập nhật tài khoản' });
    }
  },

  // 6. Reset mật khẩu về mặc định (123456)
  resetPassword: async (request, reply) => {
    const { id } = request.params;
    const defaultPassword = '123456'; 

    try {
      const password_hash = await bcrypt.hash(defaultPassword, 10);

      const [result] = await pool.query(
        'UPDATE accounts SET password_hash = ? WHERE id = ?',
        [password_hash, id]
      );

      if (result.affectedRows === 0) {
        const [check] = await pool.query('SELECT id FROM accounts WHERE id = ?', [id]);
        if (check.length === 0) {
          return reply.code(404).send({ success: false, message: 'Không tìm thấy tài khoản' });
        }
      }

      return reply.send({ success: true, message: `Đã reset mật khẩu về: ${defaultPassword}` });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi khi reset mật khẩu' });
    }
  }
};
