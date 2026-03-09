export type StatusBadgeTone = 'success' | 'warning' | 'error' | 'neutral';

type BadgePalette = {
  backgroundColor: string;
  textColor: string;
};

const BADGE_PALETTE_BY_TONE: Record<StatusBadgeTone, BadgePalette> = {
  success: {
    backgroundColor: '#DCFCE7',
    textColor: '#166534',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
  },
  error: {
    backgroundColor: '#FEE2E2',
    textColor: '#991B1B',
  },
  neutral: {
    backgroundColor: '#E2E8F0',
    textColor: '#334155',
  },
};

const WASTE_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
  REQUESTED: 'warning',
  ASSIGNED: 'warning',
  MEASURED: 'warning',
  PAYMENT_PENDING: 'warning',
  PICKED_UP: 'success',
  COMPLETED: 'success',
  PAID: 'success',
  PAYMENT_FAILED: 'error',
  CANCELED: 'error',
};

const APPLICATION_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export function getStatusBadgePalette(tone: StatusBadgeTone): BadgePalette {
  return BADGE_PALETTE_BY_TONE[tone];
}

export function resolveWasteStatusBadgeTone(status: string): StatusBadgeTone {
  return WASTE_STATUS_TONE_MAP[status] ?? 'neutral';
}

export function resolveApplicationStatusBadgeTone(status: string): StatusBadgeTone {
  return APPLICATION_STATUS_TONE_MAP[status] ?? 'neutral';
}
