import { useMemo } from 'react';
import type { DriverApplication } from '../../types/driverApplication';
import type { OpsWasteRequest } from '../../types/opsAdmin';

type UseOpsAdminHomeDerivedInput = {
  applications: DriverApplication[];
  selectedApplicationId: number | null;
  opsWasteRequests: OpsWasteRequest[];
};

export function useOpsAdminHomeDerived({
  applications,
  selectedApplicationId,
  opsWasteRequests,
}: UseOpsAdminHomeDerivedInput) {
  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );

  const requestedCount = useMemo(
    () => opsWasteRequests.filter((item) => item.status === 'REQUESTED').length,
    [opsWasteRequests],
  );

  return {
    selectedApplication,
    requestedCount,
  };
}
