import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  approveDriverApplication,
  getDriverApplicationsForOps,
  rejectDriverApplication,
} from '../api/opsAdminDriverApplicationApi';
import {
  getFailedPaymentsForOps,
  getOpsWasteRequests,
  retryFailedPaymentForOps,
} from '../api/opsAdminWasteApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { DriverApplication } from '../types/driverApplication';
import { FailedPayment, OpsWasteRequest } from '../types/opsAdmin';
import { ApiErrorResponse } from '../types/waste';
import { toWasteStatusLabel } from '../utils/wasteStatusLabel';

const colors = ui.colors;

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      return '권한이 없습니다. OPS_ADMIN 권한을 확인해 주세요.';
    }
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

function getApplicationStatusBadgeStyle(status: string) {
  if (status === 'APPROVED') {
    return { container: styles.badgeSuccess, text: styles.badgeSuccessText };
  }
  if (status === 'REJECTED') {
    return { container: styles.badgeError, text: styles.badgeErrorText };
  }
  return { container: styles.badgeWarning, text: styles.badgeWarningText };
}

function getWasteStatusBadgeStyle(status: string) {
  if (status === 'COMPLETED' || status === 'PAID' || status === 'PICKED_UP') {
    return { container: styles.badgeSuccess, text: styles.badgeSuccessText };
  }
  if (status === 'PAYMENT_FAILED' || status === 'CANCELED') {
    return { container: styles.badgeError, text: styles.badgeErrorText };
  }
  if (status === 'REQUESTED' || status === 'ASSIGNED' || status === 'PAYMENT_PENDING') {
    return { container: styles.badgeWarning, text: styles.badgeWarningText };
  }
  return { container: styles.badgeNeutral, text: styles.badgeNeutralText };
}

export function OpsAdminHomeScreen() {
  const { me } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [applicationListError, setApplicationListError] = useState<string | null>(null);
  const [applicationActionError, setApplicationActionError] = useState<string | null>(null);
  const [applicationResultMessage, setApplicationResultMessage] = useState<string | null>(null);
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<DriverApplication | null>(null);
  const [latestApplicationResult, setLatestApplicationResult] = useState<DriverApplication | null>(null);

  const [wasteStatusFilter, setWasteStatusFilter] = useState('REQUESTED');
  const [isLoadingWasteList, setIsLoadingWasteList] = useState(false);
  const [wasteListError, setWasteListError] = useState<string | null>(null);
  const [opsWasteRequests, setOpsWasteRequests] = useState<OpsWasteRequest[]>([]);

  const [isLoadingFailedPayments, setIsLoadingFailedPayments] = useState(false);
  const [failedPaymentError, setFailedPaymentError] = useState<string | null>(null);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [isRetryingPayment, setIsRetryingPayment] = useState<number | null>(null);
  const [retryResultMessage, setRetryResultMessage] = useState<string | null>(null);

  const loadWasteRequests = useCallback(async () => {
    setIsLoadingWasteList(true);
    setWasteListError(null);
    try {
      const response = await getOpsWasteRequests({
        status: wasteStatusFilter.trim() || 'REQUESTED',
        page: 0,
        size: 20,
      });
      setOpsWasteRequests(response.content);
    } catch (error) {
      setWasteListError(toErrorMessage(error));
    } finally {
      setIsLoadingWasteList(false);
    }
  }, [wasteStatusFilter]);

  const loadFailedPayments = useCallback(async () => {
    setIsLoadingFailedPayments(true);
    setFailedPaymentError(null);
    try {
      const response = await getFailedPaymentsForOps(0, 20);
      setFailedPayments(response.content);
    } catch (error) {
      setFailedPaymentError(toErrorMessage(error));
    } finally {
      setIsLoadingFailedPayments(false);
    }
  }, []);

  const loadPendingApplications = useCallback(async () => {
    setIsLoadingApplications(true);
    setApplicationListError(null);

    try {
      const response = await getDriverApplicationsForOps({
        status: 'PENDING',
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      });
      setApplications(response.content);
      setSelectedApplicationId((currentId) => {
        if (currentId === null) {
          return response.content[0]?.id ?? null;
        }
        return response.content.some((item) => item.id === currentId)
          ? currentId
          : (response.content[0]?.id ?? null);
      });
    } catch (error) {
      setApplicationListError(toErrorMessage(error));
      setApplications([]);
      setSelectedApplicationId(null);
    } finally {
      setIsLoadingApplications(false);
    }
  }, []);

  const handleApproveApplication = async () => {
    if (!selectedApplicationId) {
      setApplicationActionError('승인할 요청을 목록에서 선택해 주세요.');
      return;
    }

    setIsSubmittingApprove(true);
    setApplicationActionError(null);
    setApplicationResultMessage(null);
    try {
      const response = await approveDriverApplication(selectedApplicationId);
      setLatestApplicationResult(response);
      setApplicationResultMessage(`요청 #${response.id} 승인 완료 (${response.userEmail})`);
      await loadPendingApplications();
    } catch (error) {
      setApplicationActionError(toErrorMessage(error));
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!selectedApplicationId) {
      setApplicationActionError('반려할 요청을 목록에서 선택해 주세요.');
      return;
    }

    setIsSubmittingReject(true);
    setApplicationActionError(null);
    setApplicationResultMessage(null);
    try {
      const response = await rejectDriverApplication(selectedApplicationId);
      setLatestApplicationResult(response);
      setApplicationResultMessage(`요청 #${response.id} 반려 완료 (${response.userEmail})`);
      await loadPendingApplications();
    } catch (error) {
      setApplicationActionError(toErrorMessage(error));
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleRetryFailedPayment = async (wasteRequestId: number) => {
    setIsRetryingPayment(wasteRequestId);
    setFailedPaymentError(null);
    setRetryResultMessage(null);

    try {
      const response = await retryFailedPaymentForOps(wasteRequestId);
      setRetryResultMessage(`요청 #${response.id} 결제 재시도 완료 (${toWasteStatusLabel(response.status)})`);
      await loadFailedPayments();
      await loadWasteRequests();
    } catch (error) {
      setFailedPaymentError(toErrorMessage(error));
    } finally {
      setIsRetryingPayment(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadPendingApplications();
      void loadWasteRequests();
      void loadFailedPayments();
    }, [loadFailedPayments, loadPendingApplications, loadWasteRequests]),
  );

  useEffect(() => {
    if (!selectedApplicationId) {
      setSelectedApplication(null);
      return;
    }
    const found = applications.find((item) => item.id === selectedApplicationId) ?? null;
    setSelectedApplication(found);
  }, [applications, selectedApplicationId]);

  const requestedCount = useMemo(
    () => opsWasteRequests.filter((item) => item.status === 'REQUESTED').length,
    [opsWasteRequests],
  );

  return (
    <KeyboardAwareScrollScreen
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      includeTopInset
    >
      <View style={styles.screenContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.badge}>OPS_ADMIN</Text>
          <Text style={styles.title}>운영 관리</Text>
          <Text style={styles.description}>기사 신청 승인, 수거 요청 조회, 결제 실패 재시도를 관리합니다.</Text>
          <Text style={styles.caption}>로그인 아이디: {me?.loginId ?? me?.email ?? '-'}</Text>
          <Text style={styles.caption}>역할: {me?.roles.join(', ') ?? '-'}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>기사 신청 대기</Text>
            <Text style={styles.summaryValue}>{applications.length}건</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>REQUESTED 요청</Text>
            <Text style={styles.summaryValue}>{requestedCount}건</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>결제 실패</Text>
            <Text style={styles.summaryValueError}>{failedPayments.length}건</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>기사 신청 승인/반려</Text>
            <Pressable
              style={[styles.secondaryButtonCompact, isLoadingApplications && styles.buttonDisabled]}
              onPress={() => void loadPendingApplications()}
              disabled={isLoadingApplications}
            >
              <Text style={styles.secondaryButtonCompactText}>{isLoadingApplications ? '불러오는 중...' : '새로고침'}</Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>OPS_ADMIN 또는 SYS_ADMIN 권한으로 기사 신청을 처리할 수 있습니다.</Text>

          {isLoadingApplications && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>기사 신청 목록을 불러오는 중입니다...</Text>
              </View>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
            </View>
          )}

          {!isLoadingApplications && applicationListError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{applicationListError}</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadPendingApplications()}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </Pressable>
            </View>
          )}

          {!isLoadingApplications && !applicationListError && applications.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>현재 대기(PENDING) 기사 신청이 없습니다</Text>
              <Text style={styles.emptyDescription}>새 신청이 접수되면 이 영역에 표시됩니다.</Text>
            </View>
          )}

          {!isLoadingApplications && !applicationListError && applications.length > 0 && (
            <View style={styles.listWrap}>
              {applications.map((item) => {
                const badgeStyle = getApplicationStatusBadgeStyle(item.status);
                const isSelected = selectedApplicationId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.listItem, isSelected && styles.listItemActive]}
                    onPress={() => {
                      setSelectedApplicationId(item.id);
                      setSelectedApplication(item);
                      setApplicationActionError(null);
                      setApplicationResultMessage(null);
                    }}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.listTitle}>요청 #{item.id}</Text>
                      <View style={[styles.statusBadge, badgeStyle.container]}>
                        <Text style={[styles.statusBadgeText, badgeStyle.text]}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.listSub}>신청자: {item.userDisplayName} ({item.userEmail})</Text>
                    <Text style={styles.listSub}>신청시각: {formatDate(item.createdAt)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {selectedApplication && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>선택 요청 ID: {selectedApplication.id}</Text>
              <Text style={styles.infoText}>상태: {selectedApplication.status}</Text>
              <Text style={styles.infoText}>
                신청자: {selectedApplication.userDisplayName} ({selectedApplication.userEmail})
              </Text>
              <Text style={styles.infoText}>신청시각: {formatDate(selectedApplication.createdAt)}</Text>
              <Text style={styles.infoText}>
                신청내용: {selectedApplication.payload ? JSON.stringify(selectedApplication.payload) : '-'}
              </Text>
            </View>
          )}

          {applicationResultMessage && (
            <View style={styles.successCard}>
              <Text style={styles.successText}>{applicationResultMessage}</Text>
            </View>
          )}
          {applicationActionError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{applicationActionError}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.primaryButton, (isSubmittingApprove || isSubmittingReject || !selectedApplicationId) && styles.buttonDisabled]}
              onPress={() => void handleApproveApplication()}
              disabled={isSubmittingApprove || isSubmittingReject || !selectedApplicationId}
            >
              <Text style={styles.primaryButtonText}>{isSubmittingApprove ? '승인 중...' : '승인'}</Text>
            </Pressable>
            <Pressable
              style={[styles.dangerButton, (isSubmittingApprove || isSubmittingReject || !selectedApplicationId) && styles.buttonDisabled]}
              onPress={() => void handleRejectApplication()}
              disabled={isSubmittingApprove || isSubmittingReject || !selectedApplicationId}
            >
              <Text style={styles.dangerButtonText}>{isSubmittingReject ? '반려 중...' : '반려'}</Text>
            </Pressable>
          </View>

          {latestApplicationResult && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>최근 처리 요청 ID: {latestApplicationResult.id}</Text>
              <Text style={styles.infoText}>상태: {latestApplicationResult.status}</Text>
              <Text style={styles.infoText}>신청자: {latestApplicationResult.userEmail}</Text>
              <Text style={styles.infoText}>처리시각: {formatDate(latestApplicationResult.processedAt)}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>수거 요청 목록</Text>
            <Pressable
              style={[styles.secondaryButtonCompact, isLoadingWasteList && styles.buttonDisabled]}
              onPress={() => void loadWasteRequests()}
              disabled={isLoadingWasteList}
            >
              <Text style={styles.secondaryButtonCompactText}>{isLoadingWasteList ? '불러오는 중...' : '새로고침'}</Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>항목을 탭하면 수거요청 상세/배정 화면으로 이동합니다.</Text>

          <Text style={styles.fieldLabel}>상태 필터</Text>
          <TextInput
            style={styles.input}
            value={wasteStatusFilter}
            onChangeText={setWasteStatusFilter}
            placeholder="상태 필터 (기본: REQUESTED)"
            placeholderTextColor="#94a3b8"
          />
          <View style={styles.chipWrap}>
            <Pressable style={styles.quickChip} onPress={() => setWasteStatusFilter('REQUESTED')}>
              <Text style={styles.quickChipText}>REQUESTED</Text>
            </Pressable>
            <Pressable style={styles.quickChip} onPress={() => setWasteStatusFilter('ASSIGNED')}>
              <Text style={styles.quickChipText}>ASSIGNED</Text>
            </Pressable>
            <Pressable style={styles.quickChip} onPress={() => setWasteStatusFilter('PAYMENT_FAILED')}>
              <Text style={styles.quickChipText}>PAYMENT_FAILED</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.primaryButton, isLoadingWasteList && styles.buttonDisabled]}
            onPress={() => void loadWasteRequests()}
            disabled={isLoadingWasteList}
          >
            <Text style={styles.primaryButtonText}>필터 적용</Text>
          </Pressable>

          {isLoadingWasteList && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>요청 목록을 불러오는 중입니다...</Text>
              </View>
            </View>
          )}

          {!isLoadingWasteList && wasteListError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{wasteListError}</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadWasteRequests()}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </Pressable>
            </View>
          )}

          {!isLoadingWasteList && !wasteListError && opsWasteRequests.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>조회된 요청이 없습니다</Text>
              <Text style={styles.emptyDescription}>필터를 변경하거나 새로고침 후 다시 확인해 주세요.</Text>
            </View>
          )}

          {!isLoadingWasteList && !wasteListError && opsWasteRequests.length > 0 && (
            <View style={styles.listWrap}>
              {opsWasteRequests.map((item) => {
                const badgeStyle = getWasteStatusBadgeStyle(item.status);
                return (
                  <Pressable
                    key={item.id}
                    style={styles.listItem}
                    onPress={() => navigation.navigate('OpsWasteRequestDetail', { requestId: item.id })}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.listTitle}>#{item.id}</Text>
                      <View style={[styles.statusBadge, badgeStyle.container]}>
                        <Text style={[styles.statusBadgeText, badgeStyle.text]}>{toWasteStatusLabel(item.status)}</Text>
                      </View>
                    </View>
                    <Text style={styles.listSub}>{item.address}</Text>
                    <Text style={styles.listSub}>{formatDate(item.createdAt)}</Text>
                    <View style={styles.detailActionBadge}>
                      <Text style={styles.detailActionText}>상세/배정 관리</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>결제 실패 처리</Text>
            <Pressable
              style={[styles.secondaryButtonCompact, isLoadingFailedPayments && styles.buttonDisabled]}
              onPress={() => void loadFailedPayments()}
              disabled={isLoadingFailedPayments}
            >
              <Text style={styles.secondaryButtonCompactText}>{isLoadingFailedPayments ? '불러오는 중...' : '새로고침'}</Text>
            </Pressable>
          </View>

          {retryResultMessage && (
            <View style={styles.successCard}>
              <Text style={styles.successText}>{retryResultMessage}</Text>
            </View>
          )}

          {isLoadingFailedPayments && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>실패 결제 목록을 불러오는 중입니다...</Text>
              </View>
            </View>
          )}

          {!isLoadingFailedPayments && failedPaymentError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{failedPaymentError}</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadFailedPayments()}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </Pressable>
            </View>
          )}

          {!isLoadingFailedPayments && !failedPaymentError && failedPayments.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>결제 실패 건이 없습니다</Text>
              <Text style={styles.emptyDescription}>실패 결제가 발생하면 이 영역에서 재시도할 수 있습니다.</Text>
            </View>
          )}

          {!isLoadingFailedPayments && !failedPaymentError && failedPayments.length > 0 && (
            <View style={styles.listWrap}>
              {failedPayments.map((item) => (
                <View key={item.paymentId} style={styles.listItem}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.listTitle}>결제 #{item.paymentId}</Text>
                    <View style={[styles.statusBadge, styles.badgeError]}>
                      <Text style={[styles.statusBadgeText, styles.badgeErrorText]}>실패</Text>
                    </View>
                  </View>
                  <Text style={styles.listSub}>요청 ID: {item.wasteRequestId}</Text>
                  <Text style={styles.listSub}>실패코드: {item.failureCode ?? '-'}</Text>
                  <Text style={styles.listSub}>실패사유: {item.failureMessage ?? '-'}</Text>
                  <Text style={styles.listSub}>갱신시각: {formatDate(item.updatedAt)}</Text>
                  <Pressable
                    style={[styles.primaryButton, isRetryingPayment === item.wasteRequestId && styles.buttonDisabled]}
                    onPress={() => void handleRetryFailedPayment(item.wasteRequestId)}
                    disabled={isRetryingPayment !== null}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isRetryingPayment === item.wasteRequestId ? '재시도 중...' : '결제 재시도'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: colors.background,
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
  caption: {
    fontSize: 12,
    color: colors.caption,
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
  summaryValueError: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonCompact: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonCompactText: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textStrong,
    fontWeight: '600',
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickChipText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingGroup: {
    gap: 8,
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
  skeletonCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  skeletonLineShort: {
    height: 10,
    width: '38%',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  skeletonLineLong: {
    height: 10,
    width: '82%',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
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
    fontSize: 16,
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
  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  successCard: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#ffffff',
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
  badgeSuccess: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  badgeSuccessText: {
    color: colors.success,
  },
  badgeWarning: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  badgeWarningText: {
    color: '#b45309',
  },
  badgeError: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  badgeErrorText: {
    color: colors.error,
  },
  badgeNeutral: {
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  badgeNeutralText: {
    color: colors.caption,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: '#ffffff',
  },
  infoText: {
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  dangerButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 14,
  },
  detailActionBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailActionText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
