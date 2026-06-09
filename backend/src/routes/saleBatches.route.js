import { saleBatchesController } from '../controllers/saleBatches.controller.js';
import { protect } from '../middleware/auth.js';

export default async function saleBatchesRoute(app) {
  // Xem danh sách: Tất cả các vai trò
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, saleBatchesController.getAll);

  // Ghi nhận xuất bán (Thêm lợn thịt): Chỉ Admin và Nhân viên
  app.post('/', { preHandler: protect('ADMIN', 'FARM_WORKER') }, saleBatchesController.create);
}