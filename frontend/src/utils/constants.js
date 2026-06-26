export const CATEGORY_MAP = {
  'SOW': 'Lợn nái',
  'BOAR': 'Lợn đực',
  'PIGLET': 'Lợn con',
  'FATTENING': 'Lợn thịt',
};

export const STATUS_MAP = {
  'ACTIVE': { text: 'Khỏe mạnh', color: 'green' },
  'SICK': { text: 'Đang bệnh', color: 'orange' },
  'SOLD': { text: 'Đã xuất bán', color: 'blue' },
  'DEAD': { text: 'Đã chết', color: 'red' }
};

export const GENDER_MAP = {
  'male': 'Đực',
  'female': 'Cái'
};

export const ROLE_CONFIG = {
  ADMIN: { text: 'Quản trị viên', color: 'red' },
  FARM_WORKER: { text: 'Nhân viên', color: 'green' },
  VET_DOCTOR: { text: 'Bác sỹ thú y', color: 'orange' },
};

export const BREEDING_STATUS_MAP = {
  'PENDING': { text: 'Chờ kết quả (18-24 ngày)', color: 'orange' },
  'SUCCESS': { text: 'Đậu thai', color: 'green' },
  'FAILED': { text: 'Trượt (Phối lại)', color: 'red' },
  'FARROWED': { text: 'Đã đẻ', color: 'purple' },
};

export const BARN_TYPES = {
  'SOW': 'Chuồng lợn nái',
  'BOAR': 'Chuồng lợn đực',
  'PIGLET': 'Chuồng lợn con',
  'FATTENING': 'Chuồng lợn thịt',
  'QUARANTINE': 'Chuồng cách ly'
};

export const BARN_STATUS_MAP = {
  'ACTIVE': { text: 'Hoạt động', color: 'green' },
  'MAINTENANCE': { text: 'Bảo trì', color: 'orange' },
  'FULL': { text: 'Đã đầy', color: 'red' }
};

export const REPORT_STATUS_MAP = {
  'cho_xu_ly': { text: 'Chờ xử lý', color: 'orange' },
  'dang_xu_ly': { text: 'Đang xử lý', color: 'blue' },
  'da_xu_ly': { text: 'Đã xử lý', color: 'green' }
};