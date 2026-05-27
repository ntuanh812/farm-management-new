import { staffController } from '../controllers/staff.controller.js';
import { protect } from '../middleware/auth.js';

export default async function staffRoutes(app, options) {
  // Danh sách
  app.get('/', { preHandler: protect('ADMIN') }, staffController.getAllStaff);
  app.get('/no-account', { preHandler: protect('ADMIN') }, staffController.getstaffsNoAccount);

  // Thêm mới
  app.post('/staffs', { preHandler: protect('ADMIN') }, staffController.createstaff);
  app.post('/accounts', { preHandler: protect('ADMIN') }, staffController.createAccount);
  app.put('/staffs/:id', { preHandler: protect('ADMIN') }, staffController.updatestaff);

  // Cập nhật tài khoản
  app.patch('/accounts/:id/toggle', { preHandler: protect('ADMIN') }, staffController.toggleAccountStatus);
  app.post('/accounts/:id/reset-password', { preHandler: protect('ADMIN') }, staffController.resetPassword);
}