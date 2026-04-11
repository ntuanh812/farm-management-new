// ── verifyToken ───────────────────────────────────────────
// Dùng như preHandler trong từng route cần bảo vệ
export async function verifyToken(request, reply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' })
  }
}

// ── authorizeRoles ────────────────────────────────────────
// Dùng: authorizeRoles('ADMIN', 'VET_DOCTOR')
// Trả về một preHandler function
export function authorizeRoles(...roles) {
  return async function (request, reply) {
    const { role } = request.user  // payload từ JWT
    if (!roles.includes(role)) {
      reply.status(403).send({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' })
    }
  }
}

// ── Gộp 2 middleware để dùng tiện hơn ────────────────────
// preHandler: [protect('ADMIN', 'VET_DOCTOR')]
export function protect(...roles) {
  return [verifyToken, authorizeRoles(...roles)]
}
