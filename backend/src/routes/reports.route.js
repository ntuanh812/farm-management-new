import { reportsController } from '../controllers/reports.controller.js';
import { protect } from '../middleware/auth.js';

export default async function reportsRoute(app) {
  // Chỉ những Role có thẩm quyền mới được xem báo cáo tổng quan
  app.get('/overview', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, reportsController.getOverview);
}