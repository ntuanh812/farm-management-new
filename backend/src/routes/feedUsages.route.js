import { feedUsagesController } from '../controllers/feedUsages.controller.js';
import { protect } from '../middleware/auth.js';

export default async function feedUsagesRoute(app) {
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, feedUsagesController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'FARM_WORKER') }, feedUsagesController.create);
  app.delete('/:id', { preHandler: protect('ADMIN') }, feedUsagesController.delete);
}