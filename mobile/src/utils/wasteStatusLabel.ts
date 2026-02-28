const WASTE_STATUS_LABELS: Record<string, string> = {
  REQUESTED: '요청 접수',
  ASSIGNED: '기사 배정',
  MEASURED: '수거 완료',
  PAYMENT_PENDING: '결제 대기',
  PAID: '결제 완료',
  COMPLETED: '처리 완료',
  PAYMENT_FAILED: '결제 실패',
  CANCELED: '요청 취소',
  PICKED_UP: '수거 완료',
  REFUNDED: '환불 완료',
};

const warnedUnknownStatuses = new Set<string>();

function warnUnknownStatus(status: string): void {
  if (!__DEV__ || warnedUnknownStatuses.has(status)) {
    return;
  }
  warnedUnknownStatuses.add(status);
  console.warn(`[WasteStatus] 미정의 상태 코드: ${status}`);
}

export function toWasteStatusLabel(status: string): string {
  const normalized = status.trim();
  if (!normalized) {
    return '알 수 없음';
  }
  const label = WASTE_STATUS_LABELS[normalized];
  if (label) {
    return label;
  }
  warnUnknownStatus(normalized);
  return `알 수 없는 상태(${normalized})`;
}

export function toWasteStatusLabelOrStart(status: string | null | undefined): string {
  if (!status) {
    return '시작';
  }
  return toWasteStatusLabel(status);
}
