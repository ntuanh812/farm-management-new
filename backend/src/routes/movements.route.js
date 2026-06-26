// routes/movements.route.js

import prisma from "../config/prisma.js";
import { verifyToken } from "../middleware/auth.js";
import { LIFECYCLE, BARN_STATUS } from "../config/constants.js";

export default async function movementsRoute(app) {

  // =========================================================
  // GET ALL MOVEMENTS
  // =========================================================
  app.get(
    "/",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const whereClause = {};

        if (request.user.role === 'FARM_WORKER') {
          whereClause.OR = [
            { barns_pig_movements_from_barn_idTobarns: { staff_barns: { some: { staff_id: request.user.staff_id } } } },
            { barns_pig_movements_to_barn_idTobarns: { staff_barns: { some: { staff_id: request.user.staff_id } } } }
          ];
        }

        const movements = await prisma.pig_movements.findMany({
          where: whereClause,
          include: {
            pigs: { select: { category: true, lifecycle_status: true } },
            barns_pig_movements_from_barn_idTobarns: { select: { name: true } },
            barns_pig_movements_to_barn_idTobarns: { select: { name: true } },
            staffs: { select: { full_name: true } }
          },
          orderBy: [ { move_date: 'desc' }, { id: 'desc' } ]
        });

        const rows = movements.map(m => ({
          id: m.id,
          pig_id: m.pig_id,
          category: m.pigs?.category,
          lifecycle_status: m.pigs?.lifecycle_status,
          from_barn_id: m.from_barn_id,
          to_barn_id: m.to_barn_id,
          from_barn_name: m.barns_pig_movements_from_barn_idTobarns?.name,
          to_barn_name: m.barns_pig_movements_to_barn_idTobarns?.name,
          move_date: m.move_date,
          staff_id: m.staff_id,
          staff_name: m.staffs?.full_name,
          note: m.note,
          created_at: m.created_at
        }));

        return reply.send({
          success: true,
          data: rows,
        });

      } catch (err) {

        console.error(
          "GET MOVEMENTS ERROR:",
          err
        );

        return reply.status(500).send({
          success: false,
          message:
            "Không tải được lịch sử chuyển chuồng",
        });
      }
    }
  );

  // =========================================================
  // CREATE MOVEMENT
  // =========================================================
  app.post(
    "/",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const {
          pig_ids,
          to_barn_id,
          move_date,
          note,
        } = request.body;

        const staffId = request.user.staff_id;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (
          !pig_ids ||
          !Array.isArray(pig_ids) ||
          pig_ids.length === 0
        ) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn lợn",
          });
        }

        if (!to_barn_id) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn chuồng",
          });
        }

        if (!move_date) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn ngày chuyển",
          });
        }

        if (!staffId) {

          return reply.status(400).send({
            success: false,
            message:
              "Chưa chọn nhân viên",
          });
        }

        // =====================================================
        // GET STAFF
        // =====================================================

        // Dùng Prisma Transaction xử lý logic an toàn
        const validPigs = await prisma.$transaction(async (tx) => {
          const staff = await tx.staffs.findUnique({ where: { id: staffId } });
          if (!staff) throw new Error("Không tìm thấy nhân viên");

          const barn = await tx.barns.findUnique({
            where: { id: Number(to_barn_id) },
            include: { _count: { select: { pigs: { where: { lifecycle_status: LIFECYCLE.ACTIVE } } } } }
          });
          if (!barn) throw new Error("Không tìm thấy chuồng");

          if (barn.status === BARN_STATUS.MAINTENANCE) {
            throw new Error("Chuồng đang bảo trì, không thể chuyển lợn đến");
          }

          const pigs = await tx.pigs.findMany({
            where: { id: { in: pig_ids.map(id => Number(id)) } }
          });
          if (!pigs.length) throw new Error("Không tìm thấy lợn");

          const valid = pigs.filter((pig) => pig.lifecycle_status === LIFECYCLE.ACTIVE && Number(pig.barn_id) !== Number(to_barn_id));
          if (!valid.length) throw new Error("Không có lợn hợp lệ để chuyển");

          const totalAfterMove = barn._count.pigs + valid.length;
          if (barn.capacity && totalAfterMove > barn.capacity) {
            throw new Error("Chuồng vượt quá sức chứa");
          }

          // Tạo movement và cập nhật lợn
          for (const pig of valid) {
            await tx.pig_movements.create({
              data: {
                pig_id: pig.id,
                from_barn_id: pig.barn_id,
                to_barn_id: Number(to_barn_id),
                move_date: new Date(move_date),
                staff_id: staffId,
                note: note || null,
              }
            });
            
            await tx.pigs.update({
              where: { id: pig.id },
              data: { barn_id: Number(to_barn_id), updated_at: new Date() }
            });
          }

          return valid;
        });

        return reply.send({
          success: true,

          moved_count:
            validPigs.length,

          message:
            "Chuyển chuồng thành công",
        });

      } catch (err) {

        console.error(
          "CREATE MOVEMENT ERROR:",
          err
        );

        return reply.status(500).send({
          success: false,
          message: err.message || "Không thể chuyển chuồng",
        });

      }
    }
  );

  // =========================================================
  // DELETE MOVEMENT
  // =========================================================
  app.delete(
    "/:id",
    { preHandler: [verifyToken] },

    async (request, reply) => {

      try {

        const { id } =
          request.params;

        try {
          await prisma.pig_movements.delete({
            where: { id: Number(id) }
          });
        } catch (e) {
           // Prisma ném lỗi nến bản ghi không tồn tại
           return reply.status(404).send({ success: false, message: "Không tìm thấy lịch sử" });
        }

        return reply.send({
          success: true,
          message:
            "Xóa lịch sử thành công",
        });

      } catch (err) {

        console.error(
          "DELETE MOVEMENT ERROR:",
          err
        );

        return reply.status(500).send({
          success: false,
          message:
            "Không thể xóa lịch sử",
        });
      }
    }
  );
}