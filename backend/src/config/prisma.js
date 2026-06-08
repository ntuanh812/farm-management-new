import { PrismaClient } from '@prisma/client';

// Khởi tạo Prisma Client
// Gắn vào biến global trong môi trường dev để tránh lỗi cạn kiệt kết nối DB khi hot-reload (nodemon)
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;