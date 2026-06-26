// ── verifyToken ───────────────────────────────────────────

export async function verifyToken(request, reply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    reply
      .status(401)
      .send({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

// ── authorizeRoles ────────────────────────────────────────

export function authorizeRoles(...roleCodes) {
  return async function (request, reply) {
    const { role } = request.user; // payload từ JWT chứa role_code
    if (!roleCodes.includes(role)) {
      reply
        .status(403)
        .send({
          success: false,
          message: "Bạn không có quyền thực hiện thao tác này",
        });
    }
  };
}

// ── protect ───────────────────────────────────────────────
export function protect(...roleCodes) {
  return [verifyToken, authorizeRoles(...roleCodes)];
}
