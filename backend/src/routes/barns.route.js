import { barnsController } from "../controllers/barns.controller.js";
import { protect } from "../middleware/auth.js";

export default async function barnsRoute(app) {
  // Mọi role đều được xem danh sách chuồng (phục vụ dropdown Select)
  app.get("/", { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, barnsController.getAll);

  // Thêm mới: Chỉ ADMIN và NV Chăn nuôi
  app.post("/", { preHandler: protect('ADMIN', 'FARM_WORKER') }, barnsController.create);

  // Cập nhật: Chỉ ADMIN và NV Chăn nuôi
  app.put("/:id", { preHandler: protect('ADMIN', 'FARM_WORKER') }, barnsController.update);
  
  // Xóa: Chỉ ADMIN
  app.delete("/:id", { preHandler: protect('ADMIN') }, barnsController.delete);
}