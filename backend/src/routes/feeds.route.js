import { feedsController } from '../controllers/feeds.controller.js';
import { verifyToken } from '../middleware/auth.js';

export default async function feedsRoute(app) {
  app.get('/', { preHandler: [verifyToken] }, feedsController.getAll);
}