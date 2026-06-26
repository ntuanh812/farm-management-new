import prisma from "../config/prisma.js";

export const farrowingsController = {
  getAll: async (request, reply) => {
    try {
      const whereClause = {};
      if (request.user.role === "FARM_WORKER") {
        const allowedPigs = await prisma.pigs.findMany({
          where: {
            barns: {
              staff_barns: { some: { staff_id: request.user.staff_id } },
            },
          },
          select: { id: true },
        });
        whereClause.sow_id = { in: allowedPigs.map((p) => p.id) };
      }

      const farrowings = await prisma.pig_farrowings.findMany({
        where: whereClause,
        orderBy: [{ farrow_date: "desc" }, { created_at: "desc" }],
      });

      const staffIds = [
        ...new Set(farrowings.map((f) => f.staff_id).filter(Boolean)),
      ];
      const staffsInfo = await prisma.staffs.findMany({
        where: { id: { in: staffIds } },
      });
      const staffMap = Object.fromEntries(
        staffsInfo.map((s) => [s.id, s.full_name]),
      );

      const data = farrowings.map((f) => ({
        ...f,
        sow_code: f.sow_id,
        staff_name: staffMap[f.staff_id] || null,
      }));

      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi tải dữ liệu đẻ con" });
    }
  },
  create: async (request, reply) => {
    const {
      sow_id,
      farrow_date,
      alive_piglets,
      dead_piglets,
      total_weight,
      note,
      piglet_barn_id,
    } = request.body;
    const staff_id = request.user.staff_id;

    if (alive_piglets < 0 || dead_piglets < 0 || total_weight < 0) {
      return reply
        .code(400)
        .send({
          success: false,
          message: "Số lượng hoặc cân nặng không được là số âm",
        });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const farrowingResult = await tx.pig_farrowings.create({
          data: {
            sow_id: Number(sow_id),
            farrow_date: new Date(farrow_date),
            alive_piglets: Number(alive_piglets),
            dead_piglets: Number(dead_piglets),
            total_weight: Number(total_weight),
            staff_id: Number(staff_id),
            note: note || null,
          },
        });

        const farrowingId = farrowingResult.id;

        if (alive_piglets > 0) {
          // Lấy thông tin lợn mẹ
          const sowData = await tx.pigs.findUnique({
            where: { id: Number(sow_id) },
            select: { barn_id: true },
          });
          if (sowData) {
            const barn_id = piglet_barn_id
              ? Number(piglet_barn_id)
              : sowData.barn_id;
            const total_piglets = Number(alive_piglets) + Number(dead_piglets);
            const avg_weight =
              total_weight > 0
                ? Number((total_weight / total_piglets).toFixed(2))
                : 0;

            const pigletData = [];
            for (let i = 0; i < alive_piglets; i++) {
              pigletData.push({
                name: `Lợn con ổ ${farrowingId} - ${i + 1}`,
                barn_id,
                category: "PIGLET",
                lifecycle_status: "ACTIVE",
                gender: "male",
                dob: new Date(farrow_date),
                entry_date: new Date(farrow_date),
                entry_weight: avg_weight,
                current_weight: avg_weight,
                farrowing_id: farrowingId,
                mother_id: Number(sow_id),
              });
            }

            await tx.pigs.createMany({ data: pigletData });
          }
        }
      });

      return reply
        .code(201)
        .send({ success: true, message: "Ghi nhận đẻ con thành công" });
    } catch (error) {
      request.log?.error?.(error) || console.error(error);
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi ghi nhận" });
    }
  },
  update: async (request, reply) => {
    const { farrow_date, dead_piglets, total_weight, note } = request.body;
    const farrowingId = request.params.id;

    if (dead_piglets < 0 || total_weight < 0) {
      return reply
        .code(400)
        .send({
          success: false,
          message: "Số lượng hoặc cân nặng không được là số âm",
        });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const oldFarrowing = await tx.pig_farrowings.findUnique({
          where: { id: Number(farrowingId) },
        });
        if (!oldFarrowing) {
          throw new Error("NOT_FOUND");
        }

        const alive_piglets = oldFarrowing.alive_piglets;

        await tx.pig_farrowings.update({
          where: { id: Number(farrowingId) },
          data: {
            farrow_date: new Date(farrow_date),
            dead_piglets: Number(dead_piglets),
            total_weight: Number(total_weight),
            note: note || null,
          },
        });

        // Nếu total_weight thay đổi, cập nhật lại trung bình cân nặng cho các lợn con
        if (total_weight !== undefined && alive_piglets > 0) {
          const total_piglets = alive_piglets + Number(dead_piglets);
          const avg_weight =
            total_weight > 0
              ? Number((total_weight / total_piglets).toFixed(2))
              : 0;
          await tx.pigs.updateMany({
            where: { farrowing_id: Number(farrowingId), category: "PIGLET" },
            data: { entry_weight: avg_weight, current_weight: avg_weight },
          });
        }
      });

      return reply.send({ success: true, message: "Cập nhật thành công" });
    } catch (error) {
      if (error.message === "NOT_FOUND")
        return reply
          .code(404)
          .send({ success: false, message: "Không tìm thấy bản ghi đẻ con" });
      request.log?.error?.(error) || console.error(error);
      return reply
        .code(500)
        .send({ success: false, message: "Lỗi khi cập nhật" });
    }
  },
  delete: async (request, reply) => {
    try {
      const farrowingId = request.params.id;

      await prisma.$transaction(async (tx) => {
        // Xóa tất cả lợn con thuộc lứa đẻ này trước
        await tx.pigs.deleteMany({
          where: { farrowing_id: Number(farrowingId) },
        });

        // Xóa bản ghi đẻ con
        await tx.pig_farrowings.delete({ where: { id: Number(farrowingId) } });
      });

      return reply.send({
        success: true,
        message: "Xóa bản ghi và lợn con thành công",
      });
    } catch (error) {
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: "Lỗi khi xóa" });
    }
  },
};
