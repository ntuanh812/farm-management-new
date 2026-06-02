import { feedsController } from '../controllers/feeds.controller.js';
import { verifyToken, protect } from '../middleware/auth.js';

export default async function feedsRoute(app) {
  app.get('/', { preHandler: [verifyToken] }, feedsController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'FARM_WORKER') }, feedsController.create);
  app.put('/:id/stock', { preHandler: protect('ADMIN', 'FARM_WORKER') }, feedsController.addStock);
}