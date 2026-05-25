import { vaccinationsController } from '../controllers/vaccinations.controller.js';
import { protect } from '../middleware/auth.js';

export default async function vaccinationsRoutes(app, options) {
  // Lấy danh sách: Mọi role đã đăng nhập đều xem được
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, vaccinationsController.getAll);

  // Thêm mới: Chỉ ADMIN và Bác sỹ thú y
  app.post('/', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, vaccinationsController.create);

  // Xóa: Chỉ ADMIN và Bác sỹ thú y
  app.delete('/:id', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, vaccinationsController.delete);
}