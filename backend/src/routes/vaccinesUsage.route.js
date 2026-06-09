import { vaccinesUsageController } from '../controllers/vaccinesUsage.controller.js';
import { protect } from '../middleware/auth.js';

export default async function vaccinesUsageRoute(app) {
  // Lấy danh sách: Mọi role đã đăng nhập đều xem được
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, vaccinesUsageController.getAll);

  // Thêm mới: Chỉ ADMIN và Bác sỹ thú y
  app.post('/', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, vaccinesUsageController.create);

  // Xóa: Chỉ ADMIN và Bác sỹ thú y
  app.delete('/:id', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, vaccinesUsageController.delete);
}