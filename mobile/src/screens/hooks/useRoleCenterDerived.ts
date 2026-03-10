import { useMemo } from 'react';
import type { OpsAdminGrantCandidate } from '../../types/opsAdmin';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';

type UseRoleCenterDerivedInput = {
  activeRole: AppRole;
  opsAdminGrantCandidates: OpsAdminGrantCandidate[];
  selectedGrantCandidateId: number | null;
};

function getRoleBadgeText(role: AppRole): string {
  if (role === 'USER') {
    return 'USER';
  }
  if (role === 'DRIVER') {
    return 'DRIVER';
  }
  if (role === 'OPS_ADMIN') {
    return 'OPS_ADMIN';
  }
  return 'SYS_ADMIN';
}

export function useRoleCenterDerived({
  activeRole,
  opsAdminGrantCandidates,
  selectedGrantCandidateId,
}: UseRoleCenterDerivedInput) {
  const roleBadgeText = useMemo(() => getRoleBadgeText(activeRole), [activeRole]);
  const isUserRole = activeRole === 'USER';
  const isOpsAdminRole = activeRole === 'OPS_ADMIN';
  const isSysAdminRole = activeRole === 'SYS_ADMIN';
  const isDriverRole = activeRole === 'DRIVER';

  const selectedGrantCandidate = useMemo(
    () => opsAdminGrantCandidates.find((item) => item.userId === selectedGrantCandidateId) ?? null,
    [opsAdminGrantCandidates, selectedGrantCandidateId],
  );

  return {
    roleBadgeText,
    isUserRole,
    isOpsAdminRole,
    isSysAdminRole,
    isDriverRole,
    selectedGrantCandidate,
  };
}
