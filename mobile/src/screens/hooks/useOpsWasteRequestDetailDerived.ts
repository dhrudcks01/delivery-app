import { useMemo } from 'react';
import type { OpsWasteRequestDetail } from '../../types/opsAdmin';
import { getStatusBadgePalette, resolveWasteStatusBadgeTone } from '../../utils/statusBadge';

type UseOpsWasteRequestDetailDerivedInput = {
  selectedWasteRequest: OpsWasteRequestDetail | null;
};

export function useOpsWasteRequestDetailDerived({
  selectedWasteRequest,
}: UseOpsWasteRequestDetailDerivedInput) {
  const referencePhotos = useMemo(
    () => selectedWasteRequest?.photos.filter((photo) => photo.type === 'REFERENCE') ?? [],
    [selectedWasteRequest],
  );

  const driverPhotos = useMemo(
    () => selectedWasteRequest?.photos.filter((photo) => photo.type !== 'REFERENCE') ?? [],
    [selectedWasteRequest],
  );

  const isReassignMode = useMemo(
    () => selectedWasteRequest?.status === 'ASSIGNED' && selectedWasteRequest.driverId !== null,
    [selectedWasteRequest?.driverId, selectedWasteRequest?.status],
  );

  const statusBadgePalette = useMemo(
    () => getStatusBadgePalette(resolveWasteStatusBadgeTone(selectedWasteRequest?.status ?? 'REQUESTED')),
    [selectedWasteRequest?.status],
  );

  return {
    referencePhotos,
    driverPhotos,
    isReassignMode,
    statusBadgePalette,
  };
}
