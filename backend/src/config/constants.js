// ============================================================
// backend/src/config/constants.js
// Tập trung toàn bộ magic strings / enum values để tránh lỗi
// typo và dễ refactor sau này.
// ============================================================

// ── Vòng đời lợn (pigs.lifecycle_status) ─────────────────────
export const LIFECYCLE = {
  ACTIVE: "ACTIVE",
  DEAD: "DEAD",
  SOLD: "SOLD",
};

// ── Trạng thái chuồng trại (barns.status) ─────────────────────
export const BARN_STATUS = {
  ACTIVE: "ACTIVE",
  MAINTENANCE: "MAINTENANCE",
  FULL: "FULL",
};

// ── Loại chuồng (barns.barn_type) ─────────────────────────────
export const BARN_TYPE = {
  SOW: "SOW",
  BOAR: "BOAR",
  PIGLET: "PIGLET",
  FATTENING: "FATTENING",
  QUARANTINE: "QUARANTINE",
};

// ── Danh mục lợn (pigs.category) ──────────────────────────────
export const PIG_CATEGORY = {
  SOW: "SOW",
  BOAR: "BOAR",
  PIGLET: "PIGLET",
  FATTENING: "FATTENING",
};

// ── Giới tính (staffs.gender / pigs.gender) ───────────────────
export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
};

// ── Trạng thái báo cáo lợn bệnh (pig_reports.status) ──────────
export const REPORT_STATUS = {
  PENDING: "cho_xu_ly",
  IN_PROGRESS: "dang_xu_ly",
  DONE: "da_xu_ly",
};

// ── Trạng thái phối giống (pig_breedings.status) ──────────────
export const BREEDING_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  FARROWED: "FARROWED",
};

// ── Role hệ thống ─────────────────────────────────────────────
export const ROLE = {
  ADMIN: "ADMIN",
  FARM_WORKER: "FARM_WORKER",
  VET_DOCTOR: "VET_DOCTOR",
};
