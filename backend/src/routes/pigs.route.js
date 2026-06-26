// routes/pigs.route.js
// Route file thuần — chỉ khai báo endpoint và middleware.
// Toàn bộ business logic nằm trong controllers/pigs.controller.js

import { protect } from "../middleware/auth.js";
import { pigsController } from "../controllers/pigs.controller.js";

export default async function pigsRoute(app) {
  // GET /api/pigs — Lấy danh sách lợn
  app.get(
    "/",
    { preHandler: protect("ADMIN", "FARM_WORKER", "VET_DOCTOR") },
    pigsController.getAllPigs,
  );

  // GET /api/pigs/:id/history — Lịch sử cá thể lợn
  app.get(
    "/:id/history",
    { preHandler: protect("ADMIN", "FARM_WORKER") },
    pigsController.getPigHistory,
  );

  // POST /api/pigs — Thêm lợn mới
  app.post(
    "/",
    { preHandler: protect("ADMIN", "FARM_WORKER") },
    pigsController.createPig,
  );

  // PUT /api/pigs/:id — Cập nhật thông tin lợn
  app.put(
    "/:id",
    { preHandler: protect("ADMIN", "FARM_WORKER") },
    pigsController.updatePig,
  );

  // DELETE /api/pigs/:id — Xóa lợn (chỉ ADMIN)
  app.delete(
    "/:id",
    { preHandler: protect("ADMIN") },
    pigsController.deletePig,
  );
}
