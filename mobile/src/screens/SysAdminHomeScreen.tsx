import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  approveOpsAdminApplicationForSysAdmin,
  approveSysAdminApplicationForSysAdmin,
  getOpsAdminApplicationsForSysAdmin,
  getSysAdminApplicationsForSysAdmin,
  rejectOpsAdminApplicationForSysAdmin,
  rejectSysAdminApplicationForSysAdmin,
} from '../api/roleApplicationApi';
import {
  getOpsAdminGrantCandidates,
  getSysAdminGrantCandidates,
  grantOpsAdminRole,
  grantSysAdminRole,
  revokeOpsAdminRole,
} from '../api/sysAdminRoleApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { useSysAdminHomeDerived } from './hooks/useSysAdminHomeDerived';
import { SysAdminHomeContentSection } from './sections/SysAdminHomeSections';
import { ui } from '../theme/ui';
import type { RoleApplication } from '../types/roleApplication';
import type { OpsAdminGrantCandidate, SysAdminGrantCandidate } from '../types/opsAdmin';
import { toApiErrorMessage } from '../utils/errorMessage';
import { getStatusBadgePalette, resolveApplicationStatusBadgeTone } from '../utils/statusBadge';

type ApplicationStatusFilter = 'PENDING' | 'ALL';

const colors = ui.colors;

function formatDate(dateTime: string | null): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

function resolveLoginId(loginId?: string | null, email?: string | null): string {
  return loginId ?? email ?? '-';
}

function getRoleApplicationSummary(application: RoleApplication): string {
  return `이름: ${application.userDisplayName} / 아이디: ${resolveLoginId(application.userLoginId, application.userEmail)}`;
}

function getApplicationStatusBadgeStyle(status: string) {
  const badgePalette = getStatusBadgePalette(resolveApplicationStatusBadgeTone(status));
  return {
    container: { backgroundColor: badgePalette.backgroundColor },
    text: { color: badgePalette.textColor },
  };
}

export function SysAdminHomeScreen() {
  const { me } = useAuth();

  const [opsAdminGrantQuery, setOpsAdminGrantQuery] = useState('');
  const [opsAdminGrantCandidates, setOpsAdminGrantCandidates] = useState<OpsAdminGrantCandidate[]>([]);
  const [selectedGrantCandidateId, setSelectedGrantCandidateId] = useState<number | null>(null);
  const [isLoadingGrantCandidates, setIsLoadingGrantCandidates] = useState(false);
  const [grantCandidateError, setGrantCandidateError] = useState<string | null>(null);
  const [sysAdminGrantQuery, setSysAdminGrantQuery] = useState('');
  const [sysAdminGrantCandidates, setSysAdminGrantCandidates] = useState<SysAdminGrantCandidate[]>([]);
  const [selectedSysAdminGrantCandidateId, setSelectedSysAdminGrantCandidateId] = useState<number | null>(null);
  const [isLoadingSysAdminGrantCandidates, setIsLoadingSysAdminGrantCandidates] = useState(false);
  const [sysAdminGrantCandidateError, setSysAdminGrantCandidateError] = useState<string | null>(null);
  const [isGrantingSysAdminRole, setIsGrantingSysAdminRole] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [roleResultMessage, setRoleResultMessage] = useState<string | null>(null);
  const [roleErrorMessage, setRoleErrorMessage] = useState<string | null>(null);

  const [applicationStatusFilter, setApplicationStatusFilter] = useState<ApplicationStatusFilter>('PENDING');

  const [opsAdminApplications, setOpsAdminApplications] = useState<RoleApplication[]>([]);
  const [isLoadingOpsAdminApplications, setIsLoadingOpsAdminApplications] = useState(false);
  const [opsAdminApplicationListError, setOpsAdminApplicationListError] = useState<string | null>(null);
  const [selectedOpsAdminApplicationId, setSelectedOpsAdminApplicationId] = useState<number | null>(null);
  const [isProcessingOpsAdminApplication, setIsProcessingOpsAdminApplication] = useState(false);
  const [opsAdminApplicationActionError, setOpsAdminApplicationActionError] = useState<string | null>(null);
  const [opsAdminApplicationActionResult, setOpsAdminApplicationActionResult] = useState<string | null>(null);

  const [sysAdminApplications, setSysAdminApplications] = useState<RoleApplication[]>([]);
  const [isLoadingSysAdminApplications, setIsLoadingSysAdminApplications] = useState(false);
  const [sysAdminApplicationListError, setSysAdminApplicationListError] = useState<string | null>(null);
  const [selectedSysAdminApplicationId, setSelectedSysAdminApplicationId] = useState<number | null>(null);
  const [isProcessingSysAdminApplication, setIsProcessingSysAdminApplication] = useState(false);
  const [sysAdminApplicationActionError, setSysAdminApplicationActionError] = useState<string | null>(null);
  const [sysAdminApplicationActionResult, setSysAdminApplicationActionResult] = useState<string | null>(null);

  const {
    parsedUserId,
    selectedOpsAdminApplication,
    selectedSysAdminApplication,
    selectedGrantCandidate,
    selectedSysAdminGrantCandidate,
    pendingOpsCount,
    pendingSysCount,
  } = useSysAdminHomeDerived({
    userIdInput,
    opsAdminApplications,
    selectedOpsAdminApplicationId,
    sysAdminApplications,
    selectedSysAdminApplicationId,
    opsAdminGrantCandidates,
    selectedGrantCandidateId,
    sysAdminGrantCandidates,
    selectedSysAdminGrantCandidateId,
  });

  const statusParam = applicationStatusFilter === 'ALL' ? undefined : 'PENDING';

  const loadOpsAdminApplications = async () => {
    setIsLoadingOpsAdminApplications(true);
    setOpsAdminApplicationListError(null);

    try {
      const response = await getOpsAdminApplicationsForSysAdmin({
        status: statusParam,
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      });
      setOpsAdminApplications(response.content);
      setSelectedOpsAdminApplicationId((current) => {
        if (current && response.content.some((item) => item.id === current)) {
          return current;
        }
        return response.content[0]?.id ?? null;
      });
    } catch (error) {
      setOpsAdminApplicationListError(toApiErrorMessage(error));
      setOpsAdminApplications([]);
      setSelectedOpsAdminApplicationId(null);
    } finally {
      setIsLoadingOpsAdminApplications(false);
    }
  };

  const loadSysAdminApplications = async () => {
    setIsLoadingSysAdminApplications(true);
    setSysAdminApplicationListError(null);

    try {
      const response = await getSysAdminApplicationsForSysAdmin({
        status: statusParam,
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      });
      setSysAdminApplications(response.content);
      setSelectedSysAdminApplicationId((current) => {
        if (current && response.content.some((item) => item.id === current)) {
          return current;
        }
        return response.content[0]?.id ?? null;
      });
    } catch (error) {
      setSysAdminApplicationListError(toApiErrorMessage(error));
      setSysAdminApplications([]);
      setSelectedSysAdminApplicationId(null);
    } finally {
      setIsLoadingSysAdminApplications(false);
    }
  };

  const refreshAllApplications = async () => {
    await Promise.all([loadOpsAdminApplications(), loadSysAdminApplications()]);
  };

  const loadOpsAdminGrantCandidates = async () => {
    setIsLoadingGrantCandidates(true);
    setGrantCandidateError(null);

    try {
      const response = await getOpsAdminGrantCandidates({
        query: opsAdminGrantQuery.trim() || undefined,
        page: 0,
        size: 20,
      });
      setOpsAdminGrantCandidates(response.content);
      setSelectedGrantCandidateId((current) => {
        if (current && response.content.some((item) => item.userId === current)) {
          return current;
        }
        return response.content[0]?.userId ?? null;
      });
    } catch (error) {
      setGrantCandidateError(toApiErrorMessage(error));
      setOpsAdminGrantCandidates([]);
      setSelectedGrantCandidateId(null);
    } finally {
      setIsLoadingGrantCandidates(false);
    }
  };

  const loadSysAdminGrantCandidates = async () => {
    setIsLoadingSysAdminGrantCandidates(true);
    setSysAdminGrantCandidateError(null);

    try {
      const response = await getSysAdminGrantCandidates({
        query: sysAdminGrantQuery.trim() || undefined,
        page: 0,
        size: 20,
      });
      setSysAdminGrantCandidates(response.content);
      setSelectedSysAdminGrantCandidateId((current) => {
        if (current && response.content.some((item) => item.userId === current)) {
          return current;
        }
        return response.content[0]?.userId ?? null;
      });
    } catch (error) {
      setSysAdminGrantCandidateError(toApiErrorMessage(error));
      setSysAdminGrantCandidates([]);
      setSelectedSysAdminGrantCandidateId(null);
    } finally {
      setIsLoadingSysAdminGrantCandidates(false);
    }
  };

  const handleGrant = async () => {
    if (!selectedGrantCandidate) {
      setRoleErrorMessage('권한 부여할 DRIVER 대상을 목록에서 선택해 주세요.');
      return;
    }

    setIsGranting(true);
    setRoleResultMessage(null);
    setRoleErrorMessage(null);

    try {
      await grantOpsAdminRole(selectedGrantCandidate.userId);
      setRoleResultMessage(
        `${selectedGrantCandidate.name} (${selectedGrantCandidate.loginId}) 계정에 OPS_ADMIN 권한을 부여했습니다.`,
      );
      await loadOpsAdminGrantCandidates();
    } catch (error) {
      setRoleErrorMessage(toApiErrorMessage(error));
    } finally {
      setIsGranting(false);
    }
  };

  const handleGrantSysAdminRole = async () => {
    if (!selectedSysAdminGrantCandidate) {
      setRoleErrorMessage('SYS_ADMIN 권한 부여 대상을 목록에서 선택해 주세요.');
      return;
    }

    setIsGrantingSysAdminRole(true);
    setRoleResultMessage(null);
    setRoleErrorMessage(null);

    try {
      await grantSysAdminRole(selectedSysAdminGrantCandidate.userId);
      setRoleResultMessage(
        `${selectedSysAdminGrantCandidate.name} (${selectedSysAdminGrantCandidate.loginId}) 계정에 SYS_ADMIN 권한을 부여했습니다.`,
      );
      await loadSysAdminGrantCandidates();
    } catch (error) {
      setRoleErrorMessage(toApiErrorMessage(error));
    } finally {
      setIsGrantingSysAdminRole(false);
    }
  };

  const handleRevoke = async () => {
    if (!parsedUserId) {
      setRoleErrorMessage('권한 회수할 사용자 ID를 숫자로 입력해 주세요.');
      return;
    }

    setIsRevoking(true);
    setRoleResultMessage(null);
    setRoleErrorMessage(null);

    try {
      await revokeOpsAdminRole(parsedUserId);
      setRoleResultMessage(`사용자 #${parsedUserId} 의 OPS_ADMIN 권한을 회수했습니다.`);
    } catch (error) {
      setRoleErrorMessage(toApiErrorMessage(error));
    } finally {
      setIsRevoking(false);
    }
  };

  const handleApproveOpsAdminApplication = async () => {
    if (!selectedOpsAdminApplicationId) {
      setOpsAdminApplicationActionError('승인할 신청을 선택해 주세요.');
      return;
    }

    setIsProcessingOpsAdminApplication(true);
    setOpsAdminApplicationActionError(null);
    setOpsAdminApplicationActionResult(null);

    try {
      const response = await approveOpsAdminApplicationForSysAdmin(selectedOpsAdminApplicationId);
      setOpsAdminApplicationActionResult(`OPS_ADMIN 신청 #${response.id} 승인 완료`);
      await loadOpsAdminApplications();
    } catch (error) {
      setOpsAdminApplicationActionError(toApiErrorMessage(error));
    } finally {
      setIsProcessingOpsAdminApplication(false);
    }
  };

  const handleRejectOpsAdminApplication = async () => {
    if (!selectedOpsAdminApplicationId) {
      setOpsAdminApplicationActionError('반려할 신청을 선택해 주세요.');
      return;
    }

    setIsProcessingOpsAdminApplication(true);
    setOpsAdminApplicationActionError(null);
    setOpsAdminApplicationActionResult(null);

    try {
      const response = await rejectOpsAdminApplicationForSysAdmin(selectedOpsAdminApplicationId);
      setOpsAdminApplicationActionResult(`OPS_ADMIN 신청 #${response.id} 반려 완료`);
      await loadOpsAdminApplications();
    } catch (error) {
      setOpsAdminApplicationActionError(toApiErrorMessage(error));
    } finally {
      setIsProcessingOpsAdminApplication(false);
    }
  };

  const handleApproveSysAdminApplication = async () => {
    if (!selectedSysAdminApplicationId) {
      setSysAdminApplicationActionError('승인할 신청을 선택해 주세요.');
      return;
    }

    setIsProcessingSysAdminApplication(true);
    setSysAdminApplicationActionError(null);
    setSysAdminApplicationActionResult(null);

    try {
      const response = await approveSysAdminApplicationForSysAdmin(selectedSysAdminApplicationId);
      setSysAdminApplicationActionResult(`SYS_ADMIN 신청 #${response.id} 승인 완료`);
      await loadSysAdminApplications();
    } catch (error) {
      setSysAdminApplicationActionError(toApiErrorMessage(error));
    } finally {
      setIsProcessingSysAdminApplication(false);
    }
  };

  const handleRejectSysAdminApplication = async () => {
    if (!selectedSysAdminApplicationId) {
      setSysAdminApplicationActionError('반려할 신청을 선택해 주세요.');
      return;
    }

    setIsProcessingSysAdminApplication(true);
    setSysAdminApplicationActionError(null);
    setSysAdminApplicationActionResult(null);

    try {
      const response = await rejectSysAdminApplicationForSysAdmin(selectedSysAdminApplicationId);
      setSysAdminApplicationActionResult(`SYS_ADMIN 신청 #${response.id} 반려 완료`);
      await loadSysAdminApplications();
    } catch (error) {
      setSysAdminApplicationActionError(toApiErrorMessage(error));
    } finally {
      setIsProcessingSysAdminApplication(false);
    }
  };

  useEffect(() => {
    void refreshAllApplications();
  }, [applicationStatusFilter]);

  useEffect(() => {
    void loadOpsAdminGrantCandidates();
    void loadSysAdminGrantCandidates();
  }, []);

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" includeTopInset>
      <SysAdminHomeContentSection
        styles={styles}
        primaryColor={colors.primary}
        loginId={me?.loginId ?? me?.email ?? "-"}
        rolesLabel={me?.roles.join(", ") ?? "-"}
        applicationStatusFilter={applicationStatusFilter}
        onChangeApplicationStatusFilter={setApplicationStatusFilter}
        opsAdminApplications={opsAdminApplications}
        sysAdminApplications={sysAdminApplications}
        pendingOpsCount={pendingOpsCount}
        pendingSysCount={pendingSysCount}
        isLoadingOpsAdminApplications={isLoadingOpsAdminApplications}
        opsAdminApplicationListError={opsAdminApplicationListError}
        selectedOpsAdminApplicationId={selectedOpsAdminApplicationId}
        selectedOpsAdminApplication={selectedOpsAdminApplication}
        isProcessingOpsAdminApplication={isProcessingOpsAdminApplication}
        opsAdminApplicationActionError={opsAdminApplicationActionError}
        opsAdminApplicationActionResult={opsAdminApplicationActionResult}
        isLoadingSysAdminApplications={isLoadingSysAdminApplications}
        sysAdminApplicationListError={sysAdminApplicationListError}
        selectedSysAdminApplicationId={selectedSysAdminApplicationId}
        selectedSysAdminApplication={selectedSysAdminApplication}
        isProcessingSysAdminApplication={isProcessingSysAdminApplication}
        sysAdminApplicationActionError={sysAdminApplicationActionError}
        sysAdminApplicationActionResult={sysAdminApplicationActionResult}
        sysAdminGrantQuery={sysAdminGrantQuery}
        onChangeSysAdminGrantQuery={setSysAdminGrantQuery}
        isLoadingSysAdminGrantCandidates={isLoadingSysAdminGrantCandidates}
        sysAdminGrantCandidateError={sysAdminGrantCandidateError}
        sysAdminGrantCandidates={sysAdminGrantCandidates}
        selectedSysAdminGrantCandidateId={selectedSysAdminGrantCandidateId}
        selectedSysAdminGrantCandidate={selectedSysAdminGrantCandidate}
        isGrantingSysAdminRole={isGrantingSysAdminRole}
        opsAdminGrantQuery={opsAdminGrantQuery}
        onChangeOpsAdminGrantQuery={setOpsAdminGrantQuery}
        isLoadingGrantCandidates={isLoadingGrantCandidates}
        grantCandidateError={grantCandidateError}
        opsAdminGrantCandidates={opsAdminGrantCandidates}
        selectedGrantCandidateId={selectedGrantCandidateId}
        selectedGrantCandidate={selectedGrantCandidate}
        userIdInput={userIdInput}
        onChangeUserIdInput={setUserIdInput}
        roleResultMessage={roleResultMessage}
        roleErrorMessage={roleErrorMessage}
        isGranting={isGranting}
        isRevoking={isRevoking}
        onRefreshOpsAdminApplications={() => void loadOpsAdminApplications()}
        onRefreshSysAdminApplications={() => void loadSysAdminApplications()}
        onApproveOpsAdminApplication={() => void handleApproveOpsAdminApplication()}
        onRejectOpsAdminApplication={() => void handleRejectOpsAdminApplication()}
        onApproveSysAdminApplication={() => void handleApproveSysAdminApplication()}
        onRejectSysAdminApplication={() => void handleRejectSysAdminApplication()}
        onSearchSysAdminGrantCandidates={() => void loadSysAdminGrantCandidates()}
        onSelectSysAdminGrantCandidate={setSelectedSysAdminGrantCandidateId}
        onGrantSysAdminRole={() => void handleGrantSysAdminRole()}
        onSearchOpsAdminGrantCandidates={() => void loadOpsAdminGrantCandidates()}
        onSelectOpsAdminGrantCandidate={setSelectedGrantCandidateId}
        onGrantOpsAdminRole={() => void handleGrant()}
        onRevokeOpsAdminRole={() => void handleRevoke()}
        onSelectOpsAdminApplication={(id) => {
          setSelectedOpsAdminApplicationId(id);
          setOpsAdminApplicationActionError(null);
          setOpsAdminApplicationActionResult(null);
        }}
        onSelectSysAdminApplication={(id) => {
          setSelectedSysAdminApplicationId(id);
          setSysAdminApplicationActionError(null);
          setSysAdminApplicationActionResult(null);
        }}
        getRoleApplicationSummary={getRoleApplicationSummary}
        getApplicationStatusBadgeStyle={getApplicationStatusBadgeStyle}
        formatDate={formatDate}
        resolveLoginId={resolveLoginId}
      />
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  screenContainer: {
    gap: 16,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textStrong,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    color: colors.caption,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.caption,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    color: colors.textStrong,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.textStrong,
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  success: {
    fontSize: 13,
    color: colors.success,
    lineHeight: 18,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  listWrap: {
    gap: 8,
  },
  flexInput: {
    flex: 1,
  },
  loadingCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
  },
  successCard: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  emptyIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.caption,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textStrong,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#b91c1c',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  ghostButton: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: colors.textStrong,
    fontWeight: '700',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  filterChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#1d4ed8',
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  listItemActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  listTitle: {
    color: colors.textStrong,
    fontWeight: '700',
    fontSize: 14,
  },
  listSub: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: '#ffffff',
  },
  detailText: {
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 18,
  },
});


