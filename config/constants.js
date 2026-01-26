// config/constants.js
export const EQUIPMENT_WEIGHT_LIMITS = {
  'V': 45000,   // Van
  'R': 44000,   // Reefer
  'FD': 48000,  // Flatbed
  'SD': 45000,  // Step Deck
  'RGN': 45000, // Removable Gooseneck
  'LB': 48000,  // Lowboy
  'PO': 44000,  // Power Only
  'HE': 50000   // Heavy Equipment
};

export const MIN_WEIGHT = 1000;
export const MAX_WEIGHT = 50000;
export const MAX_LENGTH = 53;
export const MIN_LENGTH = 1;

export const DAT_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  POSTED: 'posted',
  COVERED: 'covered',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

export const USER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const ROLES = {
  ADMIN: 'Admin',
  USER: 'User'
};

// Validation constants
export const VALIDATION = {
  ZIP_REGEX: /^\d{5}(-\d{4})?$/,
  STATE_REGEX: /^[A-Z]{2}$/,
  PHONE_REGEX: /^\+?1?\d{10}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 8
};
