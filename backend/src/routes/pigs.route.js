// routes/pigsRoute.js

import prisma from "../config/prisma.js";
import { protect } from "../middleware/auth.js";

export default async function pigsRoute(app) {
  // =========================================================
  // GET ALL PIGS
  // =========================================================
  app.get(
    "/",
    { preHandler: protect("ADMIN", "FARM_WORKER", "VET_DOCTOR") },

    async (request, reply) => {
      try {
        const whereClause = {};

        if (request.user.role === "FARM_WORKER") {
          const staffId =
            request.user.staff_id ||
            request.user.employee_id ||
            request.user.id;
          whereClause.barns = {
            staff_barns: {
              some: { staff_id: staffId },
            },
          };
        }

        // Thay thế JOIN và SubQueries bằng Prisma `include`
        const pigs = await prisma.pigs.findMany({
          where: whereClause,
          include: {
            barns: { select: { name: true } },
            pig_reports: {
              where: { status: { in: ["cho_xu_ly", "dang_xu_ly"] } },
              take: 1,
            },
            pig_deaths: { orderBy: { death_date: "desc" }, take: 1 },
            sale_batch_lines: {
              include: { sale_batches: true },
              orderBy: { sale_batches: { sold_at: "desc" } },
              take: 1,
            },
          },
          orderBy: { created_at: "desc" },
        });

        // Tính toán fields ảo bằng JavaScript thay vì SQL Hàm
        const rows = pigs.map((p) => {
          const age = p.dob
            ? Math.floor((new Date() - new Date(p.dob)) / (1000 * 60 * 60 * 24))
            : null;
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
          message: "Không tải được danh sách lợn",
        });
      }
    },
  );

  // =========================================================
  // GET PIG HISTORY
  // =========================================================
  app.get(
    "/:id/history",
    { preHandler: protect("ADMIN", "FARM_WORKER") },

    async (request, reply) => {
      try {
        const { id } = request.params;
        const pigId = Number(id);

        const pig = await prisma.pigs.findUnique({
          where: { id: pigId },
          include: {
            pig_deaths: { orderBy: { death_date: "desc" }, take: 1 },
            sale_batch_lines: {
              include: { sale_batches: true },
              orderBy: { sale_batches: { sold_at: "desc" } },
              take: 1,
            },
          },
        });

        if (!pig) {
          return reply
            .status(404)
            .send({ success: false, message: "Không tìm thấy lợn" });
        }

        const deathDate = pig.pig_deaths[0]?.death_date;
        const soldDate = pig.sale_batch_lines[0]?.sale_batches?.sold_at;
        const cutoffDate = deathDate || soldDate;

        // 1. Lịch sử bệnh (reports)
        const reports = await prisma.pig_reports.findMany({
          where: { pig_id: pigId },
          orderBy: { created_at: "desc" },
        });

        // 2. Lịch sử tiêm phòng (vaccinations)
        const vaccinationWhere = {
          OR: [
            { pig_id: pigId },
            { AND: [{ barn_id: pig.barn_id }, { pig_id: null }] },
          ],
        };
        // Nếu lợn đã chết/bán, chỉ lấy lịch sử tiêm phòng của chuồng TRƯỚC ngày đó
        if (cutoffDate) {
          vaccinationWhere.OR[1].AND.push({
            vaccinated_at: { lte: new Date(cutoffDate) },
          });
        }
        const vaccinations = await prisma.vaccine_usages.findMany({
          where: vaccinationWhere,
          include: {
            vaccines: { select: { name: true } },
            staffs: { select: { full_name: true } },
          },
          orderBy: { vaccinated_at: "desc" },
        });

        // 3. Lịch sử dùng thuốc (medicines)
        const medicineWhere = {
          OR: [
            { pig_id: pigId },
            { AND: [{ barn_id: pig.barn_id }, { pig_id: null }] },
          ],
        };
        // Nếu lợn đã chết/bán, chỉ lấy lịch sử dùng thuốc của chuồng TRƯỚC ngày đó
        if (cutoffDate) {
          medicineWhere.OR[1].AND.push({
            used_at: { lte: new Date(cutoffDate) },
          });
        }
        const medicines = await prisma.medicine_usages.findMany({
          where: medicineWhere,
          include: {
            medicines: { select: { name: true } },
            staffs: { select: { full_name: true } },
          },
          orderBy: { used_at: "desc" },
        });

        // 4. Lịch sử chuyển chuồng (movements)
        const movementWhere = { pig_id: pigId };
        // Lợn không thể di chuyển sau khi đã chết/bán
        if (cutoffDate) {
          movementWhere.move_date = { lte: new Date(cutoffDate) };
        }
        const movements = await prisma.pig_movements.findMany({
          where: movementWhere,
          include: {
            barns_pig_movements_from_barn_idTobarns: { select: { name: true } },
            barns_pig_movements_to_barn_idTobarns: { select: { name: true } },
            staffs: { select: { full_name: true } },
          },
          orderBy: { move_date: "desc" },
        });

        const data = {
          reports: reports.map((r) => ({
            id: r.id,
            created_at: r.created_at,
            description: r.description,
            status: r.status,
            vet_note: r.vet_note,
          })),
          vaccinations: vaccinations.map((v) => ({
            id: v.id,
            vaccinated_at: v.vaccinated_at,
            vaccine_name: v.vaccines?.name,
            barn_id: v.barn_id,
            pig_id: v.pig_id,
            staff_name: v.staffs?.full_name,
            note: v.note,
          })),
          medicines: medicines.map((m) => ({
            id: m.id,
            used_at: m.used_at,
            medicine_name: m.medicines?.name,
            quantity: m.quantity,
            unit: m.unit,
            pig_id: m.pig_id,
            staff_name: m.staffs?.full_name,
            note: m.note,
          })),
          movements: movements.map((m) => ({
            id: m.id,
            move_date: m.move_date,
            from_barn_name: m.barns_pig_movements_from_barn_idTobarns?.name,
            to_barn_name: m.barns_pig_movements_to_barn_idTobarns?.name,
            staff_name: m.staffs?.full_name,
            created_at: m.created_at,
          })),
        };

        return reply.send({ success: true, data });
      } catch (err) {
        console.error("GET PIG HISTORY ERROR:", err);
        return reply.status(500).send({
          success: false,
          message: "Không tải được lịch sử cá thể lợn",
        });
      }
    },
  );

  // =========================================================
  // CREATE PIG
  // =========================================================
  app.post(
    "/",
    { preHandler: protect("ADMIN", "FARM_WORKER") },

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

        if (!barn_id || !category || !entry_date) {
          return reply.status(400).send({
            success: false,
            message: "Thiếu dữ liệu bắt buộc",
          });
        }

        if (
          Number(entry_weight || 0) < 0 ||
          Number(current_weight || 0) < 0 ||
          Number(purchase_price || 0) < 0
        ) {
          return reply.status(400).send({
            success: false,
            message: "Trọng lượng hoặc giá tiền không hợp lệ",
          });
        }

        // =====================================================
        // CHECK BARN
        // =====================================================

        const barn = await prisma.barns.findUnique({
          where: { id: Number(barn_id) },
          include: {
            _count: {
              select: { pigs: { where: { lifecycle_status: "ACTIVE" } } },
            },
          },
        });

        if (!barn) {
          return reply
            .status(404)
            .send({ success: false, message: "Không tìm thấy chuồng" });
        }

        if (barn.status === "MAINTENANCE") {
          return reply.status(400).send({
            success: false,
            message: "Chuồng đang bảo trì, không thể thêm lợn",
          });
        }

        if (barn._count.pigs >= barn.capacity) {
          return reply
            .status(400)
            .send({ success: false, message: "Chuồng đã đầy" });
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
          },
        });

        return reply.send({
          success: true,
          message: "Nhập lợn thành công",
        });
      } catch (err) {
        console.error(err);

        return reply.status(500).send({
          success: false,
          message: "Không thể nhập lợn",
        });
      }
    },
  );

  // =========================================================
  // UPDATE PIG
  // =========================================================
  app.put(
    "/:id",
    { preHandler: protect("ADMIN", "FARM_WORKER") },

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
          select: { lifecycle_status: true, barn_id: true },
        });
        const oldStatus = oldPig?.lifecycle_status;
        const oldBarnId = oldPig?.barn_id;

        // KHÓA CHỈNH SỬA NẾU LỢN ĐÃ CHẾT HOẶC ĐÃ BÁN
        if (oldStatus === "DEAD" || oldStatus === "SOLD") {
          return reply.status(400).send({
            success: false,
            message:
              "Hồ sơ đã bị khóa. Không thể chỉnh sửa thông tin của lợn đã chết hoặc đã xuất bán.",
          });
        }

        if (
          Number(entry_weight || 0) < 0 ||
          Number(current_weight || 0) < 0 ||
          Number(purchase_price || 0) < 0
        ) {
          return reply.status(400).send({
            success: false,
            message: "Trọng lượng hoặc giá tiền không hợp lệ",
          });
        }

        if (oldBarnId && Number(barn_id) !== oldBarnId) {
          const newBarn = await prisma.barns.findUnique({
            where: { id: Number(barn_id) },
            include: {
              _count: {
                select: { pigs: { where: { lifecycle_status: "ACTIVE" } } },
              },
            },
          });

          if (!newBarn) {
            return reply
              .status(404)
              .send({ success: false, message: "Không tìm thấy chuồng mới" });
          }
          if (newBarn.status === "MAINTENANCE") {
            return reply.status(400).send({
              success: false,
              message: "Chuồng mới đang bảo trì, không thể chuyển lợn đến",
            });
          }
          if (newBarn.capacity && newBarn._count.pigs >= newBarn.capacity) {
            return reply
              .status(400)
              .send({ success: false, message: "Chuồng mới đã đầy" });
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
            updated_at: new Date(),
          },
        });

        return reply.send({
          success: true,
          message: "Cập nhật lợn thành công",
        });
      } catch (err) {
        console.error(err);

        return reply.status(500).send({
          success: false,
          message: "Không thể cập nhật lợn",
        });
      }
    },
  );

  // =========================================================
  // DELETE PIG
  // =========================================================
  app.delete(
    "/:id",
    { preHandler: protect("ADMIN") },

    async (request, reply) => {
      try {
        const { id } = request.params;

        const pigInfo = await prisma.pigs.findUnique({
          where: { id: Number(id) },
          select: { lifecycle_status: true },
        });

        if (
          pigInfo &&
          (pigInfo.lifecycle_status === "SOLD" ||
            pigInfo.lifecycle_status === "DEAD")
        ) {
          return reply.status(400).send({
            success: false,
            message:
              "Không thể xóa lợn đã xuất bán hoặc đã chết để bảo vệ toàn vẹn dữ liệu thống kê.",
          });
        }

        await prisma.pigs.delete({
          where: { id: Number(id) },
        });

        return reply.send({
          success: true,
          message: "Xóa lợn thành công",
        });
      } catch (err) {
        console.error(err);

        return reply.status(500).send({
          success: false,
          message: "Không thể xóa lợn",
        });
      }
    },
  );
}
