import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { Card } from '../components/Card';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { SectionHeader } from '../components/SectionHeader';
import { ui } from '../theme/ui';
import { RoleApplication } from '../types/roleApplication';
import { OpsAdminGrantCandidate, SysAdminGrantCandidate } from '../types/opsAdmin';
import { ApiErrorResponse } from '../types/waste';

type ApplicationStatusFilter = 'PENDING' | 'ALL';

const colors = ui.colors;

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '요청 처리 중 오류가 발생했습니다.';
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

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
  if (status === 'APPROVED') {
    return { container: styles.statusBadgeSuccess, text: styles.statusBadgeSuccessText };
  }
  if (status === 'REJECTED') {
    return { container: styles.statusBadgeError, text: styles.statusBadgeErrorText };
  }
  if (status === 'PENDING') {
    return { container: styles.statusBadgeWarning, text: styles.statusBadgeWarningText };
  }
  return { container: styles.statusBadgeNeutral, text: styles.statusBadgeNeutralText };
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
      setOpsAdminApplicationListError(toErrorMessage(error));
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
      setSysAdminApplicationListError(toErrorMessage(error));
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
      setGrantCandidateError(toErrorMessage(error));
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
      setSysAdminGrantCandidateError(toErrorMessage(error));
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
      setRoleErrorMessage(toErrorMessage(error));
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
      setRoleErrorMessage(toErrorMessage(error));
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
      setRoleErrorMessage(toErrorMessage(error));
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
      setOpsAdminApplicationActionError(toErrorMessage(error));
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
      setOpsAdminApplicationActionError(toErrorMessage(error));
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
      setSysAdminApplicationActionError(toErrorMessage(error));
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
      setSysAdminApplicationActionError(toErrorMessage(error));
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

  const pendingOpsCount = useMemo(
    () => opsAdminApplications.filter((item) => item.status === 'PENDING').length,
    [opsAdminApplications],
  );
  const pendingSysCount = useMemo(
    () => sysAdminApplications.filter((item) => item.status === 'PENDING').length,
    [sysAdminApplications],
  );

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" includeTopInset>
      <View style={styles.screenContainer}>
        <Card style={styles.headerCard}>
          <SectionHeader
            badge="SYS_ADMIN"
            title="운영 권한 관리"
            description="신청 승인/반려와 역할 부여를 한 화면에서 처리합니다."
            titleStyle={styles.title}
            descriptionStyle={styles.description}
          />
          <Text style={styles.meta}>로그인 아이디: {me?.loginId ?? me?.email ?? '-'}</Text>
          <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>
        </Card>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>OPS 신청</Text>
            <Text style={styles.summaryValue}>{opsAdminApplications.length}건</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>SYS 신청</Text>
            <Text style={styles.summaryValue}>{sysAdminApplications.length}건</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>PENDING</Text>
            <Text style={styles.summaryValue}>{pendingOpsCount + pendingSysCount}건</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>상태 필터</Text>
          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterChip, applicationStatusFilter === 'PENDING' && styles.filterChipActive]}
              onPress={() => setApplicationStatusFilter('PENDING')}
            >
              <Text style={[styles.filterChipText, applicationStatusFilter === 'PENDING' && styles.filterChipTextActive]}>
                PENDING
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, applicationStatusFilter === 'ALL' && styles.filterChipActive]}
              onPress={() => setApplicationStatusFilter('ALL')}
            >
              <Text style={[styles.filterChipText, applicationStatusFilter === 'ALL' && styles.filterChipTextActive]}>
                전체
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>OPS_ADMIN 권한 신청 승인</Text>
            <Pressable style={[styles.ghostButton, isLoadingOpsAdminApplications && styles.buttonDisabled]} onPress={loadOpsAdminApplications} disabled={isLoadingOpsAdminApplications}>
              <Text style={styles.ghostButtonText}>새로고침</Text>
            </Pressable>
          </View>
          {isLoadingOpsAdminApplications && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>OPS_ADMIN 신청 목록 로딩 중...</Text>
            </View>
          )}
          {opsAdminApplicationListError && (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{opsAdminApplicationListError}</Text>
            </View>
          )}
          {!isLoadingOpsAdminApplications && !opsAdminApplicationListError && opsAdminApplications.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>조회된 OPS_ADMIN 신청이 없습니다.</Text>
              <Text style={styles.emptyDescription}>새 신청이 접수되면 여기에 표시됩니다.</Text>
            </View>
          )}
          {!isLoadingOpsAdminApplications && !opsAdminApplicationListError && opsAdminApplications.length > 0 && (
            <View style={styles.listWrap}>
              {opsAdminApplications.map((item) => {
                const badgeStyle = getApplicationStatusBadgeStyle(item.status);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.listItem, selectedOpsAdminApplicationId === item.id && styles.listItemActive]}
                    onPress={() => {
                      setSelectedOpsAdminApplicationId(item.id);
                      setOpsAdminApplicationActionError(null);
                      setOpsAdminApplicationActionResult(null);
                    }}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.listTitle}>신청 #{item.id}</Text>
                      <View style={[styles.statusBadge, badgeStyle.container]}>
                        <Text style={[styles.statusBadgeText, badgeStyle.text]}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.listSub}>{getRoleApplicationSummary(item)}</Text>
                    <Text style={styles.listSub}>신청일: {formatDate(item.createdAt)}</Text>
                    <Text style={styles.listSub}>처리자 아이디: {resolveLoginId(item.processedByLoginId, item.processedByEmail)}</Text>
                    <Text style={styles.listSub}>처리시각: {formatDate(item.processedAt)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {selectedOpsAdminApplication && (
            <View style={styles.resultBox}>
              <Text style={styles.detailText}>신청자: {getRoleApplicationSummary(selectedOpsAdminApplication)}</Text>
              <Text style={styles.detailText}>사유: {selectedOpsAdminApplication.reason}</Text>
            </View>
          )}
          {opsAdminApplicationActionResult && (
            <View style={styles.successCard}>
              <Text style={styles.success}>{opsAdminApplicationActionResult}</Text>
            </View>
          )}
          {opsAdminApplicationActionError && (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{opsAdminApplicationActionError}</Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, isProcessingOpsAdminApplication && styles.buttonDisabled]}
              onPress={handleApproveOpsAdminApplication}
              disabled={isProcessingOpsAdminApplication || !selectedOpsAdminApplicationId}
            >
              <Text style={styles.buttonText}>승인</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.rejectButton, isProcessingOpsAdminApplication && styles.buttonDisabled]}
              onPress={handleRejectOpsAdminApplication}
              disabled={isProcessingOpsAdminApplication || !selectedOpsAdminApplicationId}
            >
              <Text style={styles.buttonText}>반려</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>SYS_ADMIN 권한 신청 승인</Text>
            <Pressable style={[styles.ghostButton, isLoadingSysAdminApplications && styles.buttonDisabled]} onPress={loadSysAdminApplications} disabled={isLoadingSysAdminApplications}>
              <Text style={styles.ghostButtonText}>새로고침</Text>
            </Pressable>
          </View>
          {isLoadingSysAdminApplications && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>SYS_ADMIN 신청 목록 로딩 중...</Text>
            </View>
          )}
          {sysAdminApplicationListError && (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{sysAdminApplicationListError}</Text>
            </View>
          )}
          {!isLoadingSysAdminApplications && !sysAdminApplicationListError && sysAdminApplications.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>조회된 SYS_ADMIN 신청이 없습니다.</Text>
              <Text style={styles.emptyDescription}>새 신청이 접수되면 여기에 표시됩니다.</Text>
            </View>
          )}
          {!isLoadingSysAdminApplications && !sysAdminApplicationListError && sysAdminApplications.length > 0 && (
            <View style={styles.listWrap}>
              {sysAdminApplications.map((item) => {
                const badgeStyle = getApplicationStatusBadgeStyle(item.status);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.listItem, selectedSysAdminApplicationId === item.id && styles.listItemActive]}
                    onPress={() => {
                      setSelectedSysAdminApplicationId(item.id);
                      setSysAdminApplicationActionError(null);
                      setSysAdminApplicationActionResult(null);
                    }}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.listTitle}>신청 #{item.id}</Text>
                      <View style={[styles.statusBadge, badgeStyle.container]}>
                        <Text style={[styles.statusBadgeText, badgeStyle.text]}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.listSub}>{getRoleApplicationSummary(item)}</Text>
                    <Text style={styles.listSub}>신청일: {formatDate(item.createdAt)}</Text>
                    <Text style={styles.listSub}>처리자 아이디: {resolveLoginId(item.processedByLoginId, item.processedByEmail)}</Text>
                    <Text style={styles.listSub}>처리시각: {formatDate(item.processedAt)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {selectedSysAdminApplication && (
            <View style={styles.resultBox}>
              <Text style={styles.detailText}>신청자: {getRoleApplicationSummary(selectedSysAdminApplication)}</Text>
              <Text style={styles.detailText}>사유: {selectedSysAdminApplication.reason}</Text>
            </View>
          )}
          {sysAdminApplicationActionResult && (
            <View style={styles.successCard}>
              <Text style={styles.success}>{sysAdminApplicationActionResult}</Text>
            </View>
          )}
          {sysAdminApplicationActionError && (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{sysAdminApplicationActionError}</Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, isProcessingSysAdminApplication && styles.buttonDisabled]}
              onPress={handleApproveSysAdminApplication}
              disabled={isProcessingSysAdminApplication || !selectedSysAdminApplicationId}
            >
              <Text style={styles.buttonText}>승인</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.rejectButton, isProcessingSysAdminApplication && styles.buttonDisabled]}
              onPress={handleRejectSysAdminApplication}
              disabled={isProcessingSysAdminApplication || !selectedSysAdminApplicationId}
            >
              <Text style={styles.buttonText}>반려</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>SYS_ADMIN 권한 부여 대상 검색 (비 SYS_ADMIN)</Text>
          <Text style={styles.meta}>SYS_ADMIN 미보유 계정만 검색됩니다. 자기 자신의 권한은 변경할 수 없습니다.</Text>
          <Text style={styles.label}>검색어 (아이디/이름)</Text>
          <View style={styles.buttonRow}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={sysAdminGrantQuery}
              onChangeText={setSysAdminGrantQuery}
              placeholder="예: admin"
              placeholderTextColor="#94a3b8"
            />
            <Pressable style={styles.secondaryButton} onPress={loadSysAdminGrantCandidates}>
              <Text style={styles.secondaryButtonText}>검색</Text>
            </Pressable>
          </View>

          {isLoadingSysAdminGrantCandidates && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>SYS_ADMIN 부여 대상 조회 중...</Text>
            </View>
          )}
          {sysAdminGrantCandidateError && (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{sysAdminGrantCandidateError}</Text>
            </View>
          )}
          {sysAdminGrantCandidates.map((item) => (
            <Pressable
              key={item.userId}
              style={[styles.listItem, selectedSysAdminGrantCandidateId === item.userId && styles.listItemActive]}
              onPress={() => setSelectedSysAdminGrantCandidateId(item.userId)}
            >
              <Text style={styles.listTitle}>이름: {item.name}</Text>
              <Text style={styles.listSub}>아이디: {item.loginId}</Text>
              <Text style={styles.listSub}>사용자 번호: {item.userId}</Text>
            </Pressable>
          ))}
          {!isLoadingSysAdminGrantCandidates && sysAdminGrantCandidates.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>조회된 SYS_ADMIN 부여 대상이 없습니다.</Text>
              <Text style={styles.emptyDescription}>검색어를 변경해 다시 시도해 주세요.</Text>
            </View>
          )}

          {selectedSysAdminGrantCandidate && (
            <View style={styles.resultBox}>
              <Text style={styles.detailText}>선택 이름: {selectedSysAdminGrantCandidate.name}</Text>
              <Text style={styles.detailText}>선택 아이디: {selectedSysAdminGrantCandidate.loginId}</Text>
              <Text style={styles.detailText}>사용자 번호: {selectedSysAdminGrantCandidate.userId}</Text>
            </View>
          )}

          <Pressable
            style={[styles.button, isGrantingSysAdminRole && styles.buttonDisabled]}
            onPress={handleGrantSysAdminRole}
            disabled={isGrantingSysAdminRole || !selectedSysAdminGrantCandidateId}
          >
            <Text style={styles.buttonText}>
              {isGrantingSysAdminRole ? 'SYS_ADMIN 부여 중...' : '선택 대상 SYS_ADMIN 권한 부여'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>OPS_ADMIN 권한 부여 대상 검색 (DRIVER)</Text>
          <Text style={styles.meta}>DRIVER 권한 보유 + OPS_ADMIN 미보유 계정만 검색됩니다.</Text>
          <Text style={styles.label}>검색어 (아이디/이름)</Text>
          <View style={styles.buttonRow}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={opsAdminGrantQuery}
              onChangeText={setOpsAdminGrantQuery}
              placeholder="예: driver"
              placeholderTextColor="#94a3b8"
            />
            <Pressable style={styles.secondaryButton} onPress={loadOpsAdminGrantCandidates}>
              <Text style={styles.secondaryButtonText}>검색</Text>
            </Pressable>
          </View>

          {isLoadingGrantCandidates && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>권한 부여 대상 조회 중...</Text>
            </View>
          )}
          {grantCandidateError && (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{grantCandidateError}</Text>
            </View>
          )}
          {opsAdminGrantCandidates.map((item) => (
            <Pressable
              key={item.userId}
              style={[styles.listItem, selectedGrantCandidateId === item.userId && styles.listItemActive]}
              onPress={() => setSelectedGrantCandidateId(item.userId)}
            >
              <Text style={styles.listTitle}>이름: {item.name}</Text>
              <Text style={styles.listSub}>아이디: {item.loginId}</Text>
              <Text style={styles.listSub}>사용자 번호: {item.userId}</Text>
            </Pressable>
          ))}
          {!isLoadingGrantCandidates && opsAdminGrantCandidates.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>조회된 부여 대상이 없습니다.</Text>
              <Text style={styles.emptyDescription}>검색어를 변경해 다시 시도해 주세요.</Text>
            </View>
          )}

          {selectedGrantCandidate && (
            <View style={styles.resultBox}>
              <Text style={styles.detailText}>선택 이름: {selectedGrantCandidate.name}</Text>
              <Text style={styles.detailText}>선택 아이디: {selectedGrantCandidate.loginId}</Text>
              <Text style={styles.detailText}>사용자 번호: {selectedGrantCandidate.userId}</Text>
            </View>
          )}

          <Text style={styles.label}>권한 회수용 사용자 ID</Text>
          <TextInput
            style={styles.input}
            value={userIdInput}
            onChangeText={setUserIdInput}
            placeholder="예: 12"
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
          />

          {roleResultMessage && (
            <View style={styles.successCard}>
              <Text style={styles.success}>{roleResultMessage}</Text>
            </View>
          )}
          {roleErrorMessage && (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{roleErrorMessage}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, isGranting && styles.buttonDisabled]}
              onPress={handleGrant}
              disabled={isGranting || isRevoking}
            >
              <Text style={styles.buttonText}>{isGranting ? '부여 중...' : '선택 대상 권한 부여'}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.rejectButton, isRevoking && styles.buttonDisabled]}
              onPress={handleRevoke}
              disabled={isGranting || isRevoking}
            >
              <Text style={styles.buttonText}>{isRevoking ? '회수 중...' : '권한 회수'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeSuccess: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  statusBadgeSuccessText: {
    color: colors.success,
  },
  statusBadgeWarning: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  statusBadgeWarningText: {
    color: '#b45309',
  },
  statusBadgeError: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  statusBadgeErrorText: {
    color: colors.error,
  },
  statusBadgeNeutral: {
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  statusBadgeNeutralText: {
    color: colors.caption,
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
