import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GENDER, ROLE } from "../config/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// ── Shared Validation ────────────────────────────────────
// Trả về { error: string } nếu có lỗi, hoặc { cleanPhone: string|null } nếu OK
function validateStaffInput({ full_name, email, phone, gender }) {
  if (
    !full_name ||
    typeof full_name !== "string" ||
    full_name.trim().length === 0 ||
    full_name.length > 100
  ) {
    return { error: "Vui lòng nhập tên nhân viên hợp lệ (tối đa 100 ký tự)" };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Email không đúng định dạng" };
  }

  const cleanPhone = phone ? String(phone).replace(/[\s-.]/g, "") : null;
  if (cleanPhone && !/^(\+84|0)[0-9]{8,10}$/.test(cleanPhone)) {
    return { error: "Số điện thoại không hợp lệ" };
  }

  const validGenders = [GENDER.MALE, GENDER.FEMALE, GENDER.OTHER];
  if (gender && !validGenders.includes(gender)) {
    return { error: "Giới tính không hợp lệ" };
  }

  return { cleanPhone };
}

export const staffController = {
  // 1. Lấy danh sách nhân sự tổng hợp
  getAllStaff: async (request, reply) => {
    try {
      const staffsList = await prisma.staffs.findMany({
        include: {
          roles: true,
          accounts: true,
          staff_barns: {
            include: { barns: true },
          },
        },
        orderBy: { created_at: "desc" },
      });

      const data = staffsList.map((staff) => {
        const account = staff.accounts;
        return {
          id: staff.id,
          full_name: staff.full_name,
          phone: staff.phone,
          email: staff.email,
          gender: staff.gender,
          dob: staff.dob,
          address: staff.address,
          avatar: staff.avatar_url,
          role_id: staff.role_id,
          role_name: staff.roles?.name,
          role_code: staff.roles?.code,
          created_at: staff.created_at,
          account_id: account?.id,
          username: account?.username,
          is_active: account?.is_active,
          barns: staff.staff_barns.map((sb) => ({
            id: sb.barns?.id,
            name: sb.barns?.name,
          })),
        };
      });

      // Đưa ADMIN lên đầu danh sách
      data.sort((a, b) => {
        const aIsAdmin = a.role_code === ROLE.ADMIN ? 0 : 1;
        const bIsAdmin = b.role_code === ROLE.ADMIN ? 0 : 1;
        return aIsAdmin - bIsAdmin;
      });

      return reply.send({ success: true, data });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi tải danh sách nhân sự" });
    }
  },

  // 3. Thêm nhân viên & Phân công chuồng (Dùng Transaction)
  createStaff: async (request, reply) => {
    const {
      full_name,
      phone,
      email,
      gender,
      dob,
      address,
      role_id,
      barn_ids,
      avatar,
    } = request.body;

    // Validate dữ liệu chặt chẽ (chống sửa F12 hoặc gửi bằng Postman)
    const validation = validateStaffInput({ full_name, email, phone, gender });
    if (validation.error) {
      return reply.code(400).send({ success: false, message: validation.error });
    }
    const { cleanPhone } = validation;

    try {
      const staffId = await prisma.$transaction(async (tx) => {
        // Insert nhân viên
        const empResult = await tx.staffs.create({
          data: {
            full_name,
            phone: cleanPhone || null,
            email: email || null,
            gender: gender || "male",
            dob: dob ? new Date(dob) : null,
            address: address || null,
            avatar_url: avatar || null,
            role_id: role_id ? Number(role_id) : null,
          },
        });

        const newStaffId = empResult.id;

        // Nếu có phân công chuồng, Insert vào staff_barns
        if (Array.isArray(barn_ids) && barn_ids.length > 0) {
          const uniqueBarnIds = [...new Set(barn_ids)];
          await tx.staff_barns.createMany({
            data: uniqueBarnIds.map((barnId) => ({
              staff_id: newStaffId,
              barn_id: Number(barnId),
            })),
          });
        }
        return newStaffId;
      });

      return reply.code(201).send({
        success: true,
        message: "Thêm nhân viên thành công",
        data: { id: staffId },
      });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);

      if (error.code === "P2002") {
        if (error.meta?.target?.includes("phone")) {
          return reply
            .code(400)
            .send({ success: false, message: "Số điện thoại đã tồn tại" });
        }
        if (error.meta?.target?.includes("email")) {
          return reply
            .code(400)
            .send({ success: false, message: "Email đã tồn tại" });
        }
      }

      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi tạo nhân viên" });
    }
  },

  // 3.5 Cập nhật nhân viên & Phân công chuồng
  updateStaff: async (request, reply) => {
    const { id } = request.params;
    const {
      full_name,
      phone,
      email,
      gender,
      dob,
      address,
      role_id,
      barn_ids,
      avatar,
    } = request.body;

    // Dùng chung hàm validate — tránh lặp code
    const validation = validateStaffInput({ full_name, email, phone, gender });
    if (validation.error) {
      return reply.code(400).send({ success: false, message: validation.error });
    }
    const { cleanPhone } = validation;

    try {
      const oldAvatar = await prisma.$transaction(async (tx) => {
        // Lấy thông tin avatar cũ
        const oldStaff = await tx.staffs.findUnique({
          where: { id: Number(id) },
          select: { avatar_url: true },
        });
        const oldAvatarUrl = oldStaff?.avatar_url;

        // Cập nhật thông tin nhân viên
        await tx.staffs.update({
          where: { id: Number(id) },
          data: {
            full_name,
            phone: cleanPhone || null,
            email: email || null,
            gender: gender || "male",
            dob: dob ? new Date(dob) : null,
            address: address || null,
            avatar_url: avatar || null,
            role_id: role_id ? Number(role_id) : null,
          },
        });

        // Cập nhật phân công chuồng
        if (Array.isArray(barn_ids)) {
          await tx.staff_barns.deleteMany({ where: { staff_id: Number(id) } });
          if (barn_ids.length > 0) {
            const uniqueBarnIds = [...new Set(barn_ids)];
            await tx.staff_barns.createMany({
              data: uniqueBarnIds.map((barnId) => ({
                staff_id: Number(id),
                barn_id: Number(barnId),
              })),
            });
          }
        }
        return oldAvatarUrl;
      });

      // Xóa file ảnh cũ vật lý nếu có sự thay đổi ảnh (thay ảnh mới hoặc xóa ảnh về rỗng)
      if (oldAvatar && oldAvatar !== avatar) {
        const file = path.join(UPLOAD_DIR, path.basename(oldAvatar));
        fs.unlink(file, (err) => {
          if (err) console.error("Lỗi xóa file ảnh cũ:", err);
        });
      }

      return reply.send({
        success: true,
        message: "Cập nhật nhân viên thành công",
      });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      if (error.code === "P2002") {
        if (error.meta?.target?.includes("phone"))
          return reply
            .code(400)
            .send({ success: false, message: "Số điện thoại đã tồn tại" });
        if (error.meta?.target?.includes("email"))
          return reply
            .code(400)
            .send({ success: false, message: "Email đã tồn tại" });
      }
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi cập nhật nhân viên" });
    }
  },

  // 4. Tạo tài khoản đăng nhập
  createAccount: async (request, reply) => {
    const { staff_id, username, password } = request.body;

    if (!staff_id || !username || !password) {
      return reply
        .code(400)
        .send({ success: false, message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Tránh bị DoS khi cố tình gửi password siêu dài qua API
    if (password.length < 6 || password.length > 50) {
      return reply
        .code(400)
        .send({ success: false, message: "Mật khẩu phải từ 6 đến 50 ký tự" });
    }

    try {
      // 1. Kiểm tra staff đã có tài khoản chưa
      const existingAccount = await prisma.accounts.findFirst({
        where: { staff_id: Number(staff_id) },
      });
      if (existingAccount) {
        return reply
          .code(400)
          .send({ success: false, message: "Nhân viên này đã có tài khoản" });
      }

      // 2. Kiểm tra username trùng lặp
      const existingUsername = await prisma.accounts.findFirst({
        where: { username },
      });
      if (existingUsername) {
        return reply
          .code(400)
          .send({ success: false, message: "Tên đăng nhập đã tồn tại" });
      }

      // 3. Mã hóa mật khẩu
      const password_hash = await bcrypt.hash(password, 10);

      await prisma.accounts.create({
        data: {
          staff_id: Number(staff_id),
          username,
          password_hash,
          is_active: true,
        },
      });

      return reply
        .code(201)
        .send({ success: true, message: "Tạo tài khoản thành công" });
    } catch (error) {
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi tạo tài khoản" });
    }
  },

  // 5. Khóa / Mở khóa tài khoản
  toggleAccountStatus: async (request, reply) => {
    const { id } = request.params;
    const { is_active } = request.body;

    if (is_active === undefined) {
      return reply
        .code(400)
        .send({ success: false, message: "Thiếu trạng thái is_active" });
    }

    try {
      await prisma.accounts.update({
        where: { id: Number(id) },
        data: { is_active: Boolean(is_active) },
      });

      return reply.send({
        success: true,
        message: "Đã cập nhật trạng thái tài khoản",
      });
    } catch (error) {
      if (error.code === "P2025") {
        return reply
          .code(404)
          .send({ success: false, message: "Không tìm thấy tài khoản" });
      }
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi cập nhật tài khoản" });
    }
  },

  // 6. Reset mật khẩu về mặc định (123456)
  resetPassword: async (request, reply) => {
    const { id } = request.params;
    const defaultPassword = "123456";

    try {
      const password_hash = await bcrypt.hash(defaultPassword, 10);

      await prisma.accounts.update({
        where: { id: Number(id) },
        data: { password_hash },
      });

      return reply.send({
        success: true,
        message: `Đã reset mật khẩu về: ${defaultPassword}`,
      });
    } catch (error) {
      if (error.code === "P2025") {
        return reply
          .code(404)
          .send({ success: false, message: "Không tìm thấy tài khoản" });
      }
      if (request.log) request.log.error(error);
      else console.error(error);
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi reset mật khẩu" });
    }
  },
};
