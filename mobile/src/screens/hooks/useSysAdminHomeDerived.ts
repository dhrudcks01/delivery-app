import { useMemo } from 'react';
import type { OpsAdminGrantCandidate, SysAdminGrantCandidate } from '../../types/opsAdmin';
import type { RoleApplication } from '../../types/roleApplication';

type UseSysAdminHomeDerivedInput = {
  userIdInput: string;
  opsAdminApplications: RoleApplication[];
  selectedOpsAdminApplicationId: number | null;
  sysAdminApplications: RoleApplication[];
  selectedSysAdminApplicationId: number | null;
  opsAdminGrantCandidates: OpsAdminGrantCandidate[];
  selectedGrantCandidateId: number | null;
  sysAdminGrantCandidates: SysAdminGrantCandidate[];
  selectedSysAdminGrantCandidateId: number | null;
};

export function useSysAdminHomeDerived({
  userIdInput,
  opsAdminApplications,
  selectedOpsAdminApplicationId,
  sysAdminApplications,
  selectedSysAdminApplicationId,
  opsAdminGrantCandidates,
  selectedGrantCandidateId,
  sysAdminGrantCandidates,
  selectedSysAdminGrantCandidateId,
}: UseSysAdminHomeDerivedInput) {
  const parsedUserId = useMemo(() => {
    const parsed = Number(userIdInput.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [userIdInput]);

  const selectedOpsAdminApplication = useMemo(
    () => opsAdminApplications.find((item) => item.id === selectedOpsAdminApplicationId) ?? null,
    [opsAdminApplications, selectedOpsAdminApplicationId],
  );

  const selectedSysAdminApplication = useMemo(
    () => sysAdminApplications.find((item) => item.id === selectedSysAdminApplicationId) ?? null,
    [sysAdminApplications, selectedSysAdminApplicationId],
  );

  const selectedGrantCandidate = useMemo(
    () => opsAdminGrantCandidates.find((item) => item.userId === selectedGrantCandidateId) ?? null,
    [opsAdminGrantCandidates, selectedGrantCandidateId],
  );

  const selectedSysAdminGrantCandidate = useMemo(
    () => sysAdminGrantCandidates.find((item) => item.userId === selectedSysAdminGrantCandidateId) ?? null,
    [sysAdminGrantCandidates, selectedSysAdminGrantCandidateId],
  );

  const pendingOpsCount = useMemo(
    () => opsAdminApplications.filter((item) => item.status === 'PENDING').length,
    [opsAdminApplications],
  );

  const pendingSysCount = useMemo(
    () => sysAdminApplications.filter((item) => item.status === 'PENDING').length,
    [sysAdminApplications],
  );

  return {
    parsedUserId,
    selectedOpsAdminApplication,
    selectedSysAdminApplication,
    selectedGrantCandidate,
    selectedSysAdminGrantCandidate,
    pendingOpsCount,
    pendingSysCount,
  };
}
