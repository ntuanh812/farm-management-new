import { medicinesController } from '../controllers/medicines.controller.js';
import { verifyToken } from '../middleware/auth.js';

export default async function medicinesRoute(app) {
  app.get('/', { preHandler: [verifyToken] }, medicinesController.getAll);
}