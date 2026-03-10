import { ui } from '../theme/ui';

export type StatusBadgeTone = 'success' | 'warning' | 'error' | 'neutral';

type BadgePalette = {
  backgroundColor: string;
  textColor: string;
};

const BADGE_PALETTE_BY_TONE: Record<StatusBadgeTone, BadgePalette> = {
  success: {
    backgroundColor: ui.colors.successBadgeBackground,
    textColor: ui.colors.successTextStrong,
  },
  warning: {
    backgroundColor: ui.colors.warningSoftBackground,
    textColor: ui.colors.warningText,
  },
  error: {
    backgroundColor: ui.colors.errorTintBackground,
    textColor: ui.colors.errorDark,
  },
  neutral: {
    backgroundColor: ui.colors.neutralBorderSoft,
    textColor: ui.colors.text,
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

const PAYMENT_METHOD_STATUS_TONE_RULES: Array<{ keyword: string; tone: StatusBadgeTone }> = [
  { keyword: 'ACTIVE', tone: 'success' },
  { keyword: 'REGISTERED', tone: 'success' },
  { keyword: 'FAILED', tone: 'error' },
  { keyword: 'ERROR', tone: 'error' },
];

export function getStatusBadgePalette(tone: StatusBadgeTone): BadgePalette {
  return BADGE_PALETTE_BY_TONE[tone];
}

export function resolveWasteStatusBadgeTone(status: string): StatusBadgeTone {
  return WASTE_STATUS_TONE_MAP[status] ?? 'neutral';
}

export function resolveApplicationStatusBadgeTone(status: string): StatusBadgeTone {
  return APPLICATION_STATUS_TONE_MAP[status] ?? 'neutral';
}

export function resolvePaymentMethodStatusBadgeTone(status: string): StatusBadgeTone {
  const normalizedStatus = status.toUpperCase();
  const matchedRule = PAYMENT_METHOD_STATUS_TONE_RULES.find((rule) => normalizedStatus.includes(rule.keyword));
  if (matchedRule) {
    return matchedRule.tone;
  }
  return 'warning';
}


