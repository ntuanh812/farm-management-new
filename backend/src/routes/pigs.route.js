// routes/pigsRoute.js

import prisma from "../config/prisma.js";
import { protect } from "../middleware/auth.js";

export default async function pigsRoute(app) {

  // =========================================================
  // GET ALL PIGS
  // =========================================================
  app.get(
    "/",
    { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') },

    async (request, reply) => {

      try {

        const whereClause = {};

        if (request.user.role === 'FARM_WORKER') {
          const staffId = request.user.staff_id || request.user.employee_id || request.user.id;
          whereClause.barns = {
            staff_barns: {
              some: { staff_id: staffId }
            }
          };
        }

        // Thay thế JOIN và SubQueries bằng Prisma `include`
        const pigs = await prisma.pigs.findMany({
          where: whereClause,
          include: {
            barns: { select: { name: true } },
            pig_reports: { where: { status: { in: ['cho_xu_ly', 'dang_xu_ly'] } }, take: 1 },
            pig_deaths: { orderBy: { death_date: 'desc' }, take: 1 },
            sale_batch_lines: { include: { sale_batches: true }, orderBy: { sale_batches: { sold_at: 'desc' } }, take: 1 }
          },
          orderBy: { created_at: 'desc' }
        });

        // Tính toán fields ảo bằng JavaScript thay vì SQL Hàm
        const rows = pigs.map(p => {
          const age = p.dob ? Math.floor((new Date() - new Date(p.dob)) / (1000 * 60 * 60 * 24)) : null;
          return {
            ...p,
            barn_name: p.barns?.name,
            age,
            is_sick: p.pig_reports.length > 0 ? 1 : 0,
            death_date: p.pig_deaths[0]?.death_date || null,
            sold_at: p.sale_batch_lines[0]?.sale_batches?.sold_at || null,
          };
        });

        return reply.send({
          success: true,
          data: rows,
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không tải được danh sách lợn",
        });
      }
    }
  );

  // =========================================================
  // CREATE PIG
  // =========================================================
  app.post(
    "/",
    { preHandler: protect('ADMIN', 'FARM_WORKER') },

    async (request, reply) => {

      try {

        const {
          name,
          barn_id,
          category,
          gender,
          dob,
          entry_date,
          entry_weight,
          current_weight,
          purchase_price,
          note,
        } = request.body;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (
          !barn_id ||
          !category ||
          !entry_date
        ) {

          return reply.status(400).send({
            success: false,
            message:
              "Thiếu dữ liệu bắt buộc",
          });
        }

        if (Number(entry_weight || 0) < 0 || Number(current_weight || 0) < 0 || Number(purchase_price || 0) < 0) {
          return reply.status(400).send({ success: false, message: "Trọng lượng hoặc giá tiền không hợp lệ" });
        }

        // =====================================================
        // CHECK BARN
        // =====================================================

        const barn = await prisma.barns.findUnique({
          where: { id: Number(barn_id) },
          include: {
            _count: {
              select: { pigs: { where: { lifecycle_status: 'ACTIVE' } } }
            }
          }
        });

        if (!barn) {
          return reply.status(404).send({ success: false, message: "Không tìm thấy chuồng" });
        }

        if (barn.status === 'MAINTENANCE') {
          return reply.status(400).send({ success: false, message: "Chuồng đang bảo trì, không thể thêm lợn" });
        }

        if (barn._count.pigs >= barn.capacity) {
          return reply.status(400).send({ success: false, message: "Chuồng đã đầy" });
        }

        // =====================================================
        // INSERT
        // =====================================================

        await prisma.pigs.create({
          data: {
            name: name || null,
            barn_id: Number(barn_id),
            category,
            gender: gender || "male",
            dob: dob ? new Date(dob) : null,
            entry_date: new Date(entry_date),
            entry_weight: entry_weight ? Number(entry_weight) : null,
            current_weight: current_weight ? Number(current_weight) : null,
            purchase_price: purchase_price ? Number(purchase_price) : null,
            note: note || null,
          }
        });

        return reply.send({
          success: true,
          message:
            "Nhập lợn thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể nhập lợn",
        });
      }
    }
  );

  // =========================================================
  // UPDATE PIG
  // =========================================================
  app.put(
    "/:id",
    { preHandler: protect('ADMIN', 'FARM_WORKER') },

    async (request, reply) => {

      try {

        const { id } = request.params;

        const {
          name,
          barn_id,
          category,
          gender,
          dob,
          entry_date,
          entry_weight,
          current_weight,
          purchase_price,
          note,
        } = request.body;

        // 1. Lấy trạng thái cũ của lợn để so sánh
        const oldPig = await prisma.pigs.findUnique({
          where: { id: Number(id) },
          select: { lifecycle_status: true, barn_id: true }
        });
        const oldStatus = oldPig?.lifecycle_status;
        const oldBarnId = oldPig?.barn_id;

        // KHÓA CHỈNH SỬA NẾU LỢN ĐÃ CHẾT HOẶC ĐÃ BÁN
        if (oldStatus === 'DEAD' || oldStatus === 'SOLD') {
          return reply.status(400).send({
            success: false,
            message: "Hồ sơ đã bị khóa. Không thể chỉnh sửa thông tin của lợn đã chết hoặc đã xuất bán."
          });
        }

      if (Number(entry_weight || 0) < 0 || Number(current_weight || 0) < 0 || Number(purchase_price || 0) < 0) {
        return reply.status(400).send({ success: false, message: "Trọng lượng hoặc giá tiền không hợp lệ" });
      }

        if (oldBarnId && Number(barn_id) !== oldBarnId) {
          const newBarn = await prisma.barns.findUnique({
            where: { id: Number(barn_id) },
            include: {
              _count: { select: { pigs: { where: { lifecycle_status: 'ACTIVE' } } } }
            }
          });

          if (!newBarn) {
            return reply.status(404).send({ success: false, message: "Không tìm thấy chuồng mới" });
          }
          if (newBarn.status === 'MAINTENANCE') {
            return reply.status(400).send({ success: false, message: "Chuồng mới đang bảo trì, không thể chuyển lợn đến" });
          }
          if (newBarn.capacity && newBarn._count.pigs >= newBarn.capacity) {
            return reply.status(400).send({ success: false, message: "Chuồng mới đã đầy" });
          }
        }

        await prisma.pigs.update({
          where: { id: Number(id) },
          data: {
            name,
            barn_id: Number(barn_id),
            category,
            gender,
            dob: dob ? new Date(dob) : null,
            entry_date: entry_date ? new Date(entry_date) : undefined,
            entry_weight: entry_weight ? Number(entry_weight) : null,
            current_weight: current_weight ? Number(current_weight) : null,
            purchase_price: purchase_price ? Number(purchase_price) : null,
            note,
            updated_at: new Date()
          }
        });

        return reply.send({
          success: true,
          message:
            "Cập nhật lợn thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể cập nhật lợn",
        });
      }
    }
  );

  // =========================================================
  // DELETE PIG
  // =========================================================
  app.delete(
    "/:id",
    { preHandler: protect('ADMIN') },

    async (request, reply) => {

      try {

        const { id } = request.params;

        const pigInfo = await prisma.pigs.findUnique({
          where: { id: Number(id) },
          select: { lifecycle_status: true }
        });

        if (pigInfo && (pigInfo.lifecycle_status === 'SOLD' || pigInfo.lifecycle_status === 'DEAD')) {
          return reply.status(400).send({
            success: false,
            message:
              "Không thể xóa lợn đã xuất bán hoặc đã chết để bảo vệ toàn vẹn dữ liệu thống kê.",
          });
        }

        await prisma.pigs.delete({
          where: { id: Number(id) }
        });

        return reply.send({
          success: true,
          message:
            "Xóa lợn thành công",
        });

      } catch (err) {

        console.error(err);

        return reply.status(500).send({
          success: false,
          message:
            "Không thể xóa lợn",
        });
      }
    }
  );
}