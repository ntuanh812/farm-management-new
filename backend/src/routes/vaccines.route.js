import { vaccinesController } from '../controllers/vaccines.controller.js';
import { verifyToken, protect } from '../middleware/auth.js';

export default async function vaccinesRoute(app) {
  app.get('/', { preHandler: [verifyToken] }, vaccinesController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, vaccinesController.create);
  app.put('/:id/stock', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, vaccinesController.addStock);
}