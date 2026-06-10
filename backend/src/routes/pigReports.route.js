import { pipeline } from "stream/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../config/prisma.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// Tạo tên file duy nhất: timestamp_random.ext
function uniqueFilename(originalName) {
  const ext = path.extname(originalName);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}_${rand}${ext}`;
}

export default async function pigReportsRoute(app) {
  // Nhận 1 hoặc nhiều file ảnh, trả về array URL
  app.post("/upload", { preHandler: [verifyToken] }, async (request, reply) => {
    const parts = request.files(); // async iterator
    const urls = [];

    for await (const part of parts) {
      // Chỉ chấp nhận ảnh
      if (!part.mimetype.startsWith("image/")) {
        return reply
          .code(400)
          .send({ success: false, message: "Chỉ chấp nhận file ảnh" });
      }

      const filename = uniqueFilename(part.filename);
      const filepath = path.join(UPLOAD_DIR, filename);

      // Lưu file vào disk
      await pipeline(part.file, fs.createWriteStream(filepath));

      urls.push(`/uploads/${filename}`);
    }

    return reply.send({ success: true, data: urls });
  });

  // ── Lấy danh sách báo cáo ──────────────────────────────
  // GET /api/pig-reports
  app.get("/", { preHandler: [verifyToken] }, async (request, reply) => {
    const { status, barn_id } = request.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (barn_id) whereClause.barn_id = Number(barn_id);

    if (request.user.role === "FARM_WORKER") {
      const allowedBarns = await prisma.staff_barns.findMany({
        where: { staff_id: request.user.staff_id },
        select: { barn_id: true },
      });
      whereClause.barn_id = { in: allowedBarns.map((b) => b.barn_id) };
    }

    const reports = await prisma.pig_reports.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
    });

    const staffIds = [
      ...new Set(
        reports
          .flatMap((r) => [r.reporter_id, r.vet_doctor_id])
          .filter(Boolean),
      ),
    ];
    const barnIds = [...new Set(reports.map((r) => r.barn_id).filter(Boolean))];

    const staffsInfo = await prisma.staffs.findMany({
      where: { id: { in: staffIds } },
    });
    const barnsInfo = await prisma.barns.findMany({
      where: { id: { in: barnIds } },
    });

    const staffMap = Object.fromEntries(
      staffsInfo.map((s) => [s.id, s.full_name]),
    );
    const barnMap = Object.fromEntries(barnsInfo.map((b) => [b.id, b.name]));

    const data = reports.map((r) => ({
      ...r,
      reporter_name: staffMap[r.reporter_id] || null,
      vet_name: staffMap[r.vet_doctor_id] || null,
      barn_name: barnMap[r.barn_id] || null,
      images: r.images ? JSON.parse(r.images) : [],
    }));

    return reply.send({ success: true, data });
  });

  // ── Tạo báo cáo mới (FARM_WORKER + ADMIN) ─────────────
  // POST /api/pig-reports
  app.post(
    "/",
    {
      preHandler: [verifyToken, authorizeRoles("ADMIN", "FARM_WORKER")],
    },
    async (request, reply) => {
      const { pig_id, barn_id, description, images = [] } = request.body;
      if (!pig_id || !barn_id || !description) {
        return reply
          .code(400)
          .send({ success: false, message: "Thiếu thông tin bắt buộc" });
      }

      const reporter_id = request.user.staff_id;

      const result = await prisma.pig_reports.create({
        data: {
          pig_id: Number(pig_id),
          barn_id: Number(barn_id),
          reporter_id,
          description,
          images: JSON.stringify(images),
        },
      });

      return reply.code(201).send({
        success: true,
        message: "Gửi báo cáo thành công",
        data: { id: result.id },
      });
    },
  );

  // ── Bác sĩ phản hồi báo cáo ────────────────────────────
  // PATCH /api/pig-reports/:id/respond
  app.patch(
    "/:id/respond",
    {
      preHandler: [verifyToken, authorizeRoles("ADMIN", "VET_DOCTOR")],
    },
    async (request, reply) => {
      const { status, vet_note } = request.body;
      const vet_doctor_id = request.user.staff_id;
      const id = Number(request.params.id);

      const report = await prisma.pig_reports.findUnique({ where: { id } });
      if (!report)
        return reply
          .code(404)
          .send({ success: false, message: "Không tìm thấy báo cáo" });
      if (report.status === "da_xu_ly")
        return reply
          .code(400)
          .send({
            success: false,
            message: "Báo cáo đã đóng, không thể thay đổi",
          });

      await prisma.pig_reports.update({
        where: { id },
        data: {
          status,
          vet_note,
          vet_doctor_id,
        },
      });

      return reply.send({
        success: true,
        message: "Đã cập nhật trạng thái báo cáo",
      });
    },
  );

  // ── Xóa báo cáo (ADMIN) ───────────────────────────────
  // DELETE /api/pig-reports/:id
  app.delete(
    "/:id",
    {
      preHandler: [verifyToken, authorizeRoles("ADMIN")],
    },
    async (request, reply) => {
      // Xóa ảnh trên disk trước
      const report = await prisma.pig_reports.findUnique({
        where: { id: Number(request.params.id) },
        select: { images: true },
      });
      if (report?.images) {
        const imgs =
          typeof report.images === "string"
            ? JSON.parse(report.images)
            : report.images;
        imgs.forEach((url) => {
          const file = path.join(UPLOAD_DIR, path.basename(url));
          fs.unlink(file, () => {}); // Bỏ qua lỗi nếu file không tồn tại
        });
      }

      await prisma.pig_reports.delete({
        where: { id: Number(request.params.id) },
      });
      return reply.send({ success: true, message: "Đã xóa báo cáo" });
    },
  );

  // ── Lấy tin nhắn của báo cáo ─────────────────────────
  // GET /api/pig-reports/:id/messages
  app.get(
    "/:id/messages",
    { preHandler: [verifyToken] },
    async (request, reply) => {
      const reportId = request.params.id;

      if (request.user.role === "FARM_WORKER") {
        const report = await prisma.pig_reports.findUnique({
          where: { id: Number(reportId) },
          select: { barn_id: true },
        });
        if (!report)
          return reply
            .code(404)
            .send({ success: false, message: "Báo cáo không tồn tại" });
        const perm = await prisma.staff_barns.findUnique({
          where: {
            staff_id_barn_id: {
              staff_id: request.user.staff_id,
              barn_id: report.barn_id,
            },
          },
        });
        if (!perm)
          return reply
            .code(403)
            .send({ success: false, message: "Bạn không quản lý chuồng này" });
      }

      const messages = await prisma.pig_report_messages.findMany({
        where: { pig_report_id: Number(reportId) },
        orderBy: { created_at: "asc" },
      });

      const staffIds = [
        ...new Set(messages.map((m) => m.sender_id).filter(Boolean)),
      ];
      const staffsInfo = await prisma.staffs.findMany({
        where: { id: { in: staffIds } },
        include: { roles: { select: { name: true } } },
      });

      const staffMap = Object.fromEntries(
        staffsInfo.map((s) => [
          s.id,
          {
            full_name: s.full_name,
            avatar_url: s.avatar_url,
            role_name: s.roles?.name,
          },
        ]),
      );

      const data = messages.map((m) => {
        const s = staffMap[m.sender_id] || {};
        return {
          ...m,
          sender_name: s.full_name || null,
          avatar_url: s.avatar_url || null,
          sender_role: s.role_name || null,
          images: m.images
            ? typeof m.images === "string"
              ? JSON.parse(m.images)
              : m.images
            : [],
        };
      });

      return reply.send({ success: true, data });
    },
  );

  // ── Gửi tin nhắn mới ───────────────────────────────────
  // POST /api/pig-reports/:id/messages
  app.post(
    "/:id/messages",
    { preHandler: [verifyToken] },
    async (request, reply) => {
      const reportId = request.params.id;
      const { message, images = [], status } = request.body;

      if (!message)
        return reply
          .code(400)
          .send({ success: false, message: "Nội dung trống" });

      const report = await prisma.pig_reports.findUnique({
        where: { id: Number(reportId) },
        select: { barn_id: true, status: true },
      });
      if (!report)
        return reply
          .code(404)
          .send({ success: false, message: "Báo cáo không tồn tại" });
      if (report.status === "da_xu_ly")
        return reply
          .code(400)
          .send({
            success: false,
            message: "Báo cáo đã đóng, không thể gửi thêm tin nhắn",
          });

      if (request.user.role === "FARM_WORKER") {
        const perm = await prisma.staff_barns.findUnique({
          where: {
            staff_id_barn_id: {
              staff_id: request.user.staff_id,
              barn_id: report.barn_id,
            },
          },
        });
        if (!perm)
          return reply
            .code(403)
            .send({ success: false, message: "Bạn không quản lý chuồng này" });
      }

      await prisma.pig_report_messages.create({
        data: {
          pig_report_id: Number(reportId),
          sender_id: request.user.staff_id,
          message,
          images: JSON.stringify(images),
        },
      });

      if (status && ["ADMIN", "VET_DOCTOR"].includes(request.user.role)) {
        await prisma.pig_reports.update({
          where: { id: Number(reportId) },
          data: { status, vet_doctor_id: request.user.staff_id },
        });
      }

      return reply
        .code(201)
        .send({ success: true, message: "Đã gửi tin nhắn" });
    },
  );
}
