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
import { grantOpsAdminRole, revokeOpsAdminRole } from '../api/sysAdminRoleApi';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';
import { RoleApplication } from '../types/roleApplication';
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

  const handleGrant = async () => {
    if (!parsedUserId) {
      setRoleErrorMessage('권한 부여할 사용자 ID를 숫자로 입력해 주세요.');
      return;
    }

    setIsGranting(true);
    setRoleResultMessage(null);
    setRoleErrorMessage(null);

    try {
      await grantOpsAdminRole(parsedUserId);
      setRoleResultMessage(`사용자 #${parsedUserId} 에게 OPS_ADMIN 권한을 부여했습니다.`);
    } catch (error) {
      setRoleErrorMessage(toErrorMessage(error));
    } finally {
      setIsGranting(false);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>SYS_ADMIN 홈</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

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
        <Text style={styles.cardTitle}>OPS_ADMIN 권한 직접 부여/회수</Text>
        <Text style={styles.label}>대상 사용자 ID</Text>
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
            <Text style={styles.buttonText}>{isGranting ? '부여 중...' : '권한 부여'}</Text>
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
    flex: 1,
    backgroundColor: ui.colors.screen,
    padding: 16,
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
