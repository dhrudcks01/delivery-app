import { useMemo } from 'react';
import type { WasteRequestDetail } from '../../types/waste';
import { getStatusBadgePalette, resolveWasteStatusBadgeTone } from '../../utils/statusBadge';

type UseUserWasteRequestDetailDerivedInput = {
  detail: WasteRequestDetail | null;
  routeOrderNo: string | undefined;
};

export function useUserWasteRequestDetailDerived({
  detail,
  routeOrderNo,
}: UseUserWasteRequestDetailDerivedInput) {
  const canCancel = detail?.status === 'REQUESTED';
  const displayOrderNo = detail?.orderNo ?? routeOrderNo ?? '-';
  const paymentFailureNotice = detail?.status === 'PAYMENT_FAILED'
    ? '결제가 실패했습니다. 결제수단을 확인한 뒤 다시 시도해 주세요.'
    : null;

  const passedStatuses = useMemo(() => {
    if (!detail) {
      return [];
    }
    const ordered = detail.statusTimeline.map((item) => item.toStatus);
    if (detail.status) {
      ordered.push(detail.status);
    }
    return Array.from(new Set(ordered));
  }, [detail]);

  const disposalItems = useMemo(() => detail?.disposalItems ?? [], [detail]);
  const referencePhotos = useMemo(
    () => detail?.photos.filter((photo) => photo.type === 'REFERENCE') ?? [],
    [detail],
  );
  const driverPhotos = useMemo(
    () => detail?.photos.filter((photo) => photo.type !== 'REFERENCE') ?? [],
    [detail],
  );
  const statusBadgePalette = useMemo(
    () => getStatusBadgePalette(resolveWasteStatusBadgeTone(detail?.status ?? 'REQUESTED')),
    [detail?.status],
  );

  return {
    canCancel,
    displayOrderNo,
    paymentFailureNotice,
    passedStatuses,
    disposalItems,
    referencePhotos,
    driverPhotos,
    statusBadgePalette,
  };
}
