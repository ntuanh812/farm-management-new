import { farrowingsController } from '../controllers/farrowings.controller.js';
import { protect } from '../middleware/auth.js';

export default async function farrowingsRoute(app) {
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, farrowingsController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'FARM_WORKER') }, farrowingsController.create);
  app.put('/:id', { preHandler: protect('ADMIN', 'FARM_WORKER') }, farrowingsController.update);
  app.delete('/:id', { preHandler: protect('ADMIN') }, farrowingsController.delete);
}