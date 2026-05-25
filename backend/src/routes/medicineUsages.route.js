import { medicineUsagesController } from '../controllers/medicineUsages.controller.js';
import { protect } from '../middleware/auth.js';

export default async function medicineUsagesRoute(app) {
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, medicineUsagesController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'VET_DOCTOR') }, medicineUsagesController.create);
  app.delete('/:id', { preHandler: protect('ADMIN') }, medicineUsagesController.delete);
}