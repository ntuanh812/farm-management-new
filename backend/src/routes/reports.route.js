import { protect } from '../middleware/auth.js';
import { reportsController } from '../controllers/reports.controller.js';

export default async function reportsRoute(app) {
  // GET /api/reports/farm-overview
  app.get('/farm-overview', { preHandler: protect('ADMIN') }, reportsController.getOverview);
}