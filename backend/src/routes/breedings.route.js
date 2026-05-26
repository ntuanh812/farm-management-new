import { breedingsController } from '../controllers/breedings.controller.js';
import { protect } from '../middleware/auth.js';

export default async function breedingsRoute(app) {
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, breedingsController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'FARM_WORKER') }, breedingsController.create);
  app.patch('/:id/status', { preHandler: protect('ADMIN', 'FARM_WORKER') }, breedingsController.updateStatus);
  app.delete('/:id', { preHandler: protect('ADMIN') }, breedingsController.delete);
}