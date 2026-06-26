import { deathsController } from '../controllers/deaths.controller.js';
import { protect } from '../middleware/auth.js';

export default async function deathsRoute(app) {
  app.get('/', { preHandler: protect('ADMIN', 'FARM_WORKER', 'VET_DOCTOR') }, deathsController.getAll);
  app.post('/', { preHandler: protect('ADMIN', 'FARM_WORKER') }, deathsController.create);
}