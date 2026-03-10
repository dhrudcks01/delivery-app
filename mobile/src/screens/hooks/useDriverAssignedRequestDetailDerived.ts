import { useMemo } from 'react';
import type { DriverAssignedWasteRequest } from '../../types/waste';
import { getStatusBadgePalette, resolveWasteStatusBadgeTone } from '../../utils/statusBadge';
import { toWasteStatusLabel } from '../../utils/wasteStatusLabel';

type UseDriverAssignedRequestDetailDerivedInput = {
  requestId: number;
  selectedRequest: DriverAssignedWasteRequest | null;
};

export function useDriverAssignedRequestDetailDerived({
  requestId,
  selectedRequest,
}: UseDriverAssignedRequestDetailDerivedInput) {
  const canMeasureSelected = selectedRequest?.status === 'ASSIGNED';

  const statusBadgePalette = useMemo(
    () => getStatusBadgePalette(resolveWasteStatusBadgeTone(selectedRequest?.status ?? 'REQUESTED')),
    [selectedRequest?.status],
  );

  const selectedTitle = useMemo(() => {
    if (!selectedRequest) {
      return `요청 #${requestId}`;
    }
    return `요청 #${selectedRequest.requestId} (${toWasteStatusLabel(selectedRequest.status)})`;
  }, [requestId, selectedRequest]);

  return {
    canMeasureSelected,
    statusBadgePalette,
    selectedTitle,
  };
}
