import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { ui } from '../theme/ui';
import { RoleApplication } from '../types/roleApplication';
import { OpsAdminGrantCandidate, SysAdminGrantCandidate } from '../types/opsAdmin';
import { ApiErrorResponse } from '../types/waste';

type ApplicationStatusFilter = 'PENDING' | 'ALL';

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

function getRoleApplicationSummary(application: RoleApplication): string {
  return `${application.userDisplayName} (${application.userEmail})`;
}

export function SysAdminHomeScreen() {
  const { me, signOut } = useAuth();

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
        `사용자 #${selectedGrantCandidate.userId} (${selectedGrantCandidate.userEmail}) 에게 OPS_ADMIN 권한을 부여했습니다.`,
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
        `사용자 #${selectedSysAdminGrantCandidate.userId} (${selectedSysAdminGrantCandidate.userEmail}) 에게 SYS_ADMIN 권한을 부여했습니다.`,
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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="always"
    >
      <Text style={styles.title}>SYS_ADMIN 홈</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>화면 상태 점검</Text>
        <Text style={styles.statusText}>
          OPS 신청 로딩: {isLoadingOpsAdminApplications ? '진행 중' : '대기'} / SYS 신청 로딩: {isLoadingSysAdminApplications ? '진행 중' : '대기'}
        </Text>
        <Text style={styles.statusText}>
          OPS 대상 로딩: {isLoadingGrantCandidates ? '진행 중' : '대기'} / SYS 대상 로딩: {isLoadingSysAdminGrantCandidates ? '진행 중' : '대기'}
        </Text>
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
          <Pressable style={styles.ghostButton} onPress={loadOpsAdminApplications}>
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>
        {isLoadingOpsAdminApplications && <Text style={styles.meta}>OPS_ADMIN 신청 목록 로딩 중..</Text>}
        {opsAdminApplicationListError && <Text style={styles.error}>{opsAdminApplicationListError}</Text>}
        {opsAdminApplications.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.listItem, selectedOpsAdminApplicationId === item.id && styles.listItemActive]}
            onPress={() => {
              setSelectedOpsAdminApplicationId(item.id);
              setOpsAdminApplicationActionError(null);
              setOpsAdminApplicationActionResult(null);
            }}
          >
            <Text style={styles.listTitle}>신청 #{item.id} ({item.status})</Text>
            <Text style={styles.listSub}>{getRoleApplicationSummary(item)}</Text>
            <Text style={styles.listSub}>신청일: {formatDate(item.createdAt)}</Text>
            <Text style={styles.listSub}>처리자: {item.processedByEmail ?? '-'}</Text>
            <Text style={styles.listSub}>처리시각: {formatDate(item.processedAt)}</Text>
          </Pressable>
        ))}
        {!isLoadingOpsAdminApplications && opsAdminApplications.length === 0 && (
          <Text style={styles.meta}>조회된 OPS_ADMIN 신청이 없습니다.</Text>
        )}
        {selectedOpsAdminApplication && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>신청자: {getRoleApplicationSummary(selectedOpsAdminApplication)}</Text>
            <Text style={styles.detailText}>사유: {selectedOpsAdminApplication.reason}</Text>
          </View>
        )}
        {opsAdminApplicationActionResult && <Text style={styles.success}>{opsAdminApplicationActionResult}</Text>}
        {opsAdminApplicationActionError && <Text style={styles.error}>{opsAdminApplicationActionError}</Text>}
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
          <Pressable style={styles.ghostButton} onPress={loadSysAdminApplications}>
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>
        {isLoadingSysAdminApplications && <Text style={styles.meta}>SYS_ADMIN 신청 목록 로딩 중..</Text>}
        {sysAdminApplicationListError && <Text style={styles.error}>{sysAdminApplicationListError}</Text>}
        {sysAdminApplications.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.listItem, selectedSysAdminApplicationId === item.id && styles.listItemActive]}
            onPress={() => {
              setSelectedSysAdminApplicationId(item.id);
              setSysAdminApplicationActionError(null);
              setSysAdminApplicationActionResult(null);
            }}
          >
            <Text style={styles.listTitle}>신청 #{item.id} ({item.status})</Text>
            <Text style={styles.listSub}>{getRoleApplicationSummary(item)}</Text>
            <Text style={styles.listSub}>신청일: {formatDate(item.createdAt)}</Text>
            <Text style={styles.listSub}>처리자: {item.processedByEmail ?? '-'}</Text>
            <Text style={styles.listSub}>처리시각: {formatDate(item.processedAt)}</Text>
          </Pressable>
        ))}
        {!isLoadingSysAdminApplications && sysAdminApplications.length === 0 && (
          <Text style={styles.meta}>조회된 SYS_ADMIN 신청이 없습니다.</Text>
        )}
        {selectedSysAdminApplication && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>신청자: {getRoleApplicationSummary(selectedSysAdminApplication)}</Text>
            <Text style={styles.detailText}>사유: {selectedSysAdminApplication.reason}</Text>
          </View>
        )}
        {sysAdminApplicationActionResult && <Text style={styles.success}>{sysAdminApplicationActionResult}</Text>}
        {sysAdminApplicationActionError && <Text style={styles.error}>{sysAdminApplicationActionError}</Text>}
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
        <Text style={styles.label}>검색어 (이메일/이름)</Text>
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

        {isLoadingSysAdminGrantCandidates && <Text style={styles.meta}>SYS_ADMIN 부여 대상 조회 중..</Text>}
        {sysAdminGrantCandidateError && <Text style={styles.error}>{sysAdminGrantCandidateError}</Text>}
        {sysAdminGrantCandidates.map((item) => (
          <Pressable
            key={item.userId}
            style={[styles.listItem, selectedSysAdminGrantCandidateId === item.userId && styles.listItemActive]}
            onPress={() => setSelectedSysAdminGrantCandidateId(item.userId)}
          >
            <Text style={styles.listTitle}>사용자 #{item.userId}</Text>
            <Text style={styles.listSub}>{item.userDisplayName}</Text>
            <Text style={styles.listSub}>{item.userEmail}</Text>
          </Pressable>
        ))}
        {!isLoadingSysAdminGrantCandidates && sysAdminGrantCandidates.length === 0 && (
          <Text style={styles.meta}>조회된 SYS_ADMIN 부여 대상이 없습니다.</Text>
        )}

        {selectedSysAdminGrantCandidate && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>선택 사용자 ID: {selectedSysAdminGrantCandidate.userId}</Text>
            <Text style={styles.detailText}>이름: {selectedSysAdminGrantCandidate.userDisplayName}</Text>
            <Text style={styles.detailText}>이메일: {selectedSysAdminGrantCandidate.userEmail}</Text>
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
        <Text style={styles.label}>검색어 (이메일/이름)</Text>
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

        {isLoadingGrantCandidates && <Text style={styles.meta}>권한 부여 대상 조회 중..</Text>}
        {grantCandidateError && <Text style={styles.error}>{grantCandidateError}</Text>}
        {opsAdminGrantCandidates.map((item) => (
          <Pressable
            key={item.userId}
            style={[styles.listItem, selectedGrantCandidateId === item.userId && styles.listItemActive]}
            onPress={() => setSelectedGrantCandidateId(item.userId)}
          >
            <Text style={styles.listTitle}>사용자 #{item.userId}</Text>
            <Text style={styles.listSub}>{item.userDisplayName}</Text>
            <Text style={styles.listSub}>{item.userEmail}</Text>
          </Pressable>
        ))}
        {!isLoadingGrantCandidates && opsAdminGrantCandidates.length === 0 && (
          <Text style={styles.meta}>조회된 부여 대상이 없습니다.</Text>
        )}

        {selectedGrantCandidate && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>선택 사용자 ID: {selectedGrantCandidate.userId}</Text>
            <Text style={styles.detailText}>이름: {selectedGrantCandidate.userDisplayName}</Text>
            <Text style={styles.detailText}>이메일: {selectedGrantCandidate.userEmail}</Text>
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

        {roleResultMessage && <Text style={styles.success}>{roleResultMessage}</Text>}
        {roleErrorMessage && <Text style={styles.error}>{roleErrorMessage}</Text>}

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

      <Pressable style={[styles.button, styles.logoutButton]} onPress={signOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: ui.colors.screen,
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  meta: {
    fontSize: 13,
    color: ui.colors.text,
  },
  statusCard: {
    backgroundColor: '#eef8f6',
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.card,
    padding: 12,
    gap: 4,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  statusText: {
    fontSize: 12,
    color: ui.colors.text,
  },
  card: {
    backgroundColor: ui.colors.card,
    borderRadius: ui.radius.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.colors.textStrong,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.colors.textStrong,
    backgroundColor: '#ffffff',
  },
  success: {
    fontSize: 13,
    color: ui.colors.success,
  },
  error: {
    fontSize: 13,
    color: ui.colors.error,
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
  flexInput: {
    flex: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: ui.radius.control,
    backgroundColor: ui.colors.primary,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#7f1d1d',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#9fc2b9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostButtonText: {
    color: ui.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef8f6',
  },
  secondaryButtonText: {
    color: ui.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  filterChipText: {
    color: ui.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: ui.colors.primary,
  },
  listItem: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  listItemActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  listTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
  },
  listSub: {
    color: ui.colors.text,
    fontSize: 12,
  },
  resultBox: {
    gap: 4,
  },
  detailText: {
    color: ui.colors.textStrong,
    fontSize: 13,
  },
  logoutButton: {
    marginBottom: 20,
  },
});
