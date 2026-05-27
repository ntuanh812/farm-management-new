// =========================================================
// backend/src/routes/staff.route.js
// =========================================================

import { staffController } from '../controllers/staff.controller.js';
import { protect } from '../middleware/auth.js';

import { pipeline } from 'stream/promises';

import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const UPLOAD_DIR = path.resolve(
  __dirname,
  '../../uploads'
);

// Tạo uploads nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, {
    recursive: true
  });
}

function uniqueFilename(originalName) {

  const ext = path.extname(originalName);

  const rand = Math.random()
    .toString(36)
    .slice(2, 8);

  return `${Date.now()}_${rand}${ext}`;
}

export default async function staffRoutes(app) {

  // =====================================================
  // Upload Avatar
  // =====================================================
  app.post(
    '/upload',
    {
      preHandler: protect('ADMIN')
    },

    async (request, reply) => {

      try {

        const data = await request.file();

        if (!data) {
          return reply.code(400).send({
            success: false,
            message: 'Không có file upload'
          });
        }

        if (
          !data.mimetype.startsWith(
            'image/'
          )
        ) {
          return reply.code(400).send({
            success: false,
            message:
              'Chỉ chấp nhận file ảnh'
          });
        }

        const filename = uniqueFilename(
          data.filename
        );

        const filepath = path.join(
          UPLOAD_DIR,
          filename
        );

        await pipeline(
          data.file,
          fs.createWriteStream(filepath)
        );

        return reply.send({
          success: true,
          data: `/uploads/${filename}`
        });

      } catch (error) {

        console.error(error);

        return reply.code(500).send({
          success: false,
          message:
            'Upload ảnh thất bại'
        });
      }
    }
  );

  // =====================================================
  // Xóa ảnh
  // =====================================================
  app.delete(
    '/upload/:filename',
    {
      preHandler: protect('ADMIN')
    },

    async (request, reply) => {

      try {

        const { filename } =
          request.params;

        const filepath = path.join(
          UPLOAD_DIR,
          filename
        );

        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }

        return reply.send({
          success: true
        });

      } catch (error) {

        console.error(error);

        return reply.code(500).send({
          success: false,
          message:
            'Xóa ảnh thất bại'
        });
      }
    }
  );

  // =====================================================
  // APIs
  // =====================================================

  app.get(
    '/',
    {
      preHandler:
        protect('ADMIN')
    },
    staffController.getAllStaff
  );

  app.get(
    '/no-account',
    {
      preHandler:
        protect('ADMIN')
    },
    staffController.getstaffsNoAccount
  );

  app.post(
    '/',
    {
      preHandler:
        protect('ADMIN')
    },
    staffController.createstaff
  );

  app.put(
    '/:id',
    {
      preHandler:
        protect('ADMIN')
    },
    staffController.updatestaff
  );

  app.post(
    '/accounts',
    {
      preHandler:
        protect('ADMIN')
    },
    staffController.createAccount
  );

  app.patch(
    '/accounts/:id/toggle',
    {
      preHandler:
        protect('ADMIN')
    },
    staffController.toggleAccountStatus
  );

  app.post(
    '/accounts/:id/reset-password',
    {
      preHandler:
        protect('ADMIN')
    },
    staffController.resetPassword
  );
}