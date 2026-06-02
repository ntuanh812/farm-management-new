import { medicinesController } from '../controllers/medicines.controller.js';
import { verifyToken, protect } from '../middleware/auth.js';

export default async function medicinesRoute(app) {
  app.get('/', { preHandler: [verifyToken] }, medicinesController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, medicinesController.create);
  app.put('/:id/stock', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, medicinesController.addStock);
}