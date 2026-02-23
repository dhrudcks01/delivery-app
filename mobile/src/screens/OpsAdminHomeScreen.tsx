import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  approveDriverApplication,
  getDriverApplicationsForOps,
  rejectDriverApplication,
} from '../api/opsAdminDriverApplicationApi';
import {
  assignWasteRequestForOps,
  getFailedPaymentsForOps,
  getOpsWasteRequestDetail,
  getOpsWasteRequests,
  retryFailedPaymentForOps,
} from '../api/opsAdminWasteApi';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';
import { DriverApplication } from '../types/driverApplication';
import { FailedPayment, OpsWasteRequest } from '../types/opsAdmin';
import { ApiErrorResponse } from '../types/waste';

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

export function OpsAdminHomeScreen() {
  const { me, signOut } = useAuth();

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

  const [wasteStatusFilter, setWasteStatusFilter] = useState('');
  const [isLoadingWasteList, setIsLoadingWasteList] = useState(false);
  const [wasteListError, setWasteListError] = useState<string | null>(null);
  const [opsWasteRequests, setOpsWasteRequests] = useState<OpsWasteRequest[]>([]);
  const [selectedWasteRequestId, setSelectedWasteRequestId] = useState<number | null>(null);
  const [selectedWasteRequest, setSelectedWasteRequest] = useState<OpsWasteRequest | null>(null);
  const [isLoadingWasteDetail, setIsLoadingWasteDetail] = useState(false);
  const [wasteDetailError, setWasteDetailError] = useState<string | null>(null);

  const [driverIdInput, setDriverIdInput] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [isLoadingFailedPayments, setIsLoadingFailedPayments] = useState(false);
  const [failedPaymentError, setFailedPaymentError] = useState<string | null>(null);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [isRetryingPayment, setIsRetryingPayment] = useState<number | null>(null);
  const [retryResultMessage, setRetryResultMessage] = useState<string | null>(null);

  const parsedDriverId = useMemo(() => {
    const parsed = Number(driverIdInput.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [driverIdInput]);

  const loadWasteRequests = async () => {
    setIsLoadingWasteList(true);
    setWasteListError(null);

    try {
      const response = await getOpsWasteRequests({
        status: wasteStatusFilter.trim() || undefined,
        page: 0,
        size: 20,
      });
      setOpsWasteRequests(response.content);
    } catch (error) {
      setWasteListError(toErrorMessage(error));
    } finally {
      setIsLoadingWasteList(false);
    }
  };

  const loadWasteRequestDetail = async (requestId: number) => {
    setIsLoadingWasteDetail(true);
    setWasteDetailError(null);
    setSelectedWasteRequestId(requestId);

    try {
      const response = await getOpsWasteRequestDetail(requestId);
      setSelectedWasteRequest(response);
    } catch (error) {
      setWasteDetailError(toErrorMessage(error));
      setSelectedWasteRequest(null);
    } finally {
      setIsLoadingWasteDetail(false);
    }
  };

  const loadFailedPayments = async () => {
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
  };

  const loadPendingApplications = async () => {
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
  };

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

  const handleAssignWasteRequest = async () => {
    if (!selectedWasteRequestId) {
      setAssignError('배정할 요청을 목록에서 선택해 주세요.');
      return;
    }
    if (!parsedDriverId) {
      setAssignError('배정할 기사 사용자 ID를 숫자로 입력해 주세요.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    setAssignMessage(null);

    try {
      const response = await assignWasteRequestForOps(selectedWasteRequestId, { driverId: parsedDriverId });
      setSelectedWasteRequest(response);
      setAssignMessage(`요청 #${response.id} 기사 배정 완료`);
      await loadWasteRequests();
    } catch (error) {
      setAssignError(toErrorMessage(error));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRetryFailedPayment = async (wasteRequestId: number) => {
    setIsRetryingPayment(wasteRequestId);
    setFailedPaymentError(null);
    setRetryResultMessage(null);

    try {
      const response = await retryFailedPaymentForOps(wasteRequestId);
      setRetryResultMessage(`요청 #${response.id} 결제 재시도 완료 (${response.status})`);
      await loadFailedPayments();
      await loadWasteRequests();
      if (selectedWasteRequestId === wasteRequestId) {
        await loadWasteRequestDetail(wasteRequestId);
      }
    } catch (error) {
      setFailedPaymentError(toErrorMessage(error));
    } finally {
      setIsRetryingPayment(null);
    }
  };

  useEffect(() => {
    void loadPendingApplications();
    void loadWasteRequests();
    void loadFailedPayments();
  }, []);

  useEffect(() => {
    if (!selectedApplicationId) {
      setSelectedApplication(null);
      return;
    }
    const found = applications.find((item) => item.id === selectedApplicationId) ?? null;
    setSelectedApplication(found);
  }, [applications, selectedApplicationId]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="always"
    >
      <Text style={styles.title}>OPS_ADMIN 운영 관리</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>화면 상태 요약</Text>
        <Text style={styles.statusText}>
          신청 로딩: {isLoadingApplications ? '진행 중' : '대기'} / 요청 로딩: {isLoadingWasteList ? '진행 중' : '대기'}
        </Text>
        <Text style={styles.statusText}>
          실패결제 로딩: {isLoadingFailedPayments ? '진행 중' : '대기'} / 선택 요청 ID: {selectedWasteRequestId ?? '-'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>기사 신청 승인/반려 (OPS_ADMIN/SYS_ADMIN)</Text>
          <Pressable style={styles.ghostButton} onPress={loadPendingApplications}>
            <Text style={styles.ghostButtonText}>대기 목록 새로고침</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>OPS_ADMIN 또는 SYS_ADMIN 권한으로 기사 신청을 처리할 수 있습니다.</Text>
        {isLoadingApplications && <Text style={styles.meta}>기사 신청 목록 로딩 중..</Text>}
        {applicationListError && <Text style={styles.error}>{applicationListError}</Text>}
        {applications.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.listItem, selectedApplicationId === item.id && styles.listItemActive]}
            onPress={() => {
              setSelectedApplicationId(item.id);
              setApplicationActionError(null);
              setApplicationResultMessage(null);
            }}
          >
            <Text style={styles.listTitle}>요청 #{item.id}</Text>
            <Text style={styles.listSub}>신청자: {item.userDisplayName} ({item.userEmail})</Text>
            <Text style={styles.listSub}>신청시각: {formatDate(item.createdAt)}</Text>
          </Pressable>
        ))}
        {!isLoadingApplications && applications.length === 0 && (
          <Text style={styles.meta}>현재 대기(PENDING) 기사 신청이 없습니다.</Text>
        )}

        {selectedApplication && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>선택 요청 ID: {selectedApplication.id}</Text>
            <Text style={styles.detailText}>상태: {selectedApplication.status}</Text>
            <Text style={styles.detailText}>
              신청자: {selectedApplication.userDisplayName} ({selectedApplication.userEmail})
            </Text>
            <Text style={styles.detailText}>신청시각: {formatDate(selectedApplication.createdAt)}</Text>
            <Text style={styles.detailText}>
              신청내용: {selectedApplication.payload ? JSON.stringify(selectedApplication.payload) : '-'}
            </Text>
          </View>
        )}
        {applicationResultMessage && <Text style={styles.success}>{applicationResultMessage}</Text>}
        {applicationActionError && <Text style={styles.error}>{applicationActionError}</Text>}
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, isSubmittingApprove && styles.buttonDisabled]}
            onPress={handleApproveApplication}
            disabled={isSubmittingApprove || isSubmittingReject || !selectedApplicationId}
          >
            <Text style={styles.buttonText}>{isSubmittingApprove ? '승인 중..' : '승인'}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.rejectButton, isSubmittingReject && styles.buttonDisabled]}
            onPress={handleRejectApplication}
            disabled={isSubmittingApprove || isSubmittingReject || !selectedApplicationId}
          >
            <Text style={styles.buttonText}>{isSubmittingReject ? '반려 중..' : '반려'}</Text>
          </Pressable>
        </View>
        {latestApplicationResult && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>최근 처리 요청 ID: {latestApplicationResult.id}</Text>
            <Text style={styles.detailText}>상태: {latestApplicationResult.status}</Text>
            <Text style={styles.detailText}>신청자: {latestApplicationResult.userEmail}</Text>
            <Text style={styles.detailText}>처리시각: {formatDate(latestApplicationResult.processedAt)}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>수거 요청 목록</Text>
          <Pressable style={styles.ghostButton} onPress={loadWasteRequests}>
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={wasteStatusFilter}
          onChangeText={setWasteStatusFilter}
          placeholder="상태 필터 (예: REQUESTED, PAYMENT_FAILED)"
          placeholderTextColor="#94a3b8"
        />
        <Pressable style={styles.secondaryButton} onPress={loadWasteRequests}>
          <Text style={styles.secondaryButtonText}>필터 적용</Text>
        </Pressable>
        {isLoadingWasteList && <Text style={styles.meta}>요청 목록 로딩 중..</Text>}
        {wasteListError && <Text style={styles.error}>{wasteListError}</Text>}
        {opsWasteRequests.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.listItem, selectedWasteRequestId === item.id && styles.listItemActive]}
            onPress={() => void loadWasteRequestDetail(item.id)}
          >
            <Text style={styles.listTitle}>#{item.id} {item.status}</Text>
            <Text style={styles.listSub}>{item.address}</Text>
            <Text style={styles.listSub}>{formatDate(item.createdAt)}</Text>
          </Pressable>
        ))}
        {!isLoadingWasteList && opsWasteRequests.length === 0 && (
          <Text style={styles.meta}>조회된 요청이 없습니다.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>요청 상세/기사 배정</Text>
        {isLoadingWasteDetail && <Text style={styles.meta}>요청 상세 로딩 중..</Text>}
        {wasteDetailError && <Text style={styles.error}>{wasteDetailError}</Text>}
        {!selectedWasteRequest && !isLoadingWasteDetail && (
          <Text style={styles.meta}>목록에서 요청을 선택해 주세요.</Text>
        )}
        {selectedWasteRequest && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>요청 ID: {selectedWasteRequest.id}</Text>
            <Text style={styles.detailText}>상태: {selectedWasteRequest.status}</Text>
            <Text style={styles.detailText}>주소: {selectedWasteRequest.address}</Text>
            <Text style={styles.detailText}>연락처: {selectedWasteRequest.contactPhone}</Text>
            <Text style={styles.detailText}>최종금액: {selectedWasteRequest.finalAmount ?? '-'}</Text>
            <TextInput
              style={styles.input}
              value={driverIdInput}
              onChangeText={setDriverIdInput}
              placeholder="배정할 기사 사용자 ID"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
            {assignMessage && <Text style={styles.success}>{assignMessage}</Text>}
            {assignError && <Text style={styles.error}>{assignError}</Text>}
            <Pressable
              style={[styles.button, isAssigning && styles.buttonDisabled]}
              onPress={handleAssignWasteRequest}
              disabled={isAssigning}
            >
              <Text style={styles.buttonText}>{isAssigning ? '배정 중..' : '기사 배정'}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>결제 실패 처리</Text>
          <Pressable style={styles.ghostButton} onPress={loadFailedPayments}>
            <Text style={styles.ghostButtonText}>실패 목록 새로고침</Text>
          </Pressable>
        </View>
        {retryResultMessage && <Text style={styles.success}>{retryResultMessage}</Text>}
        {failedPaymentError && <Text style={styles.error}>{failedPaymentError}</Text>}
        {isLoadingFailedPayments && <Text style={styles.meta}>실패 결제 목록 로딩 중..</Text>}
        {failedPayments.map((item) => (
          <View key={item.paymentId} style={styles.listItem}>
            <Text style={styles.listTitle}>결제 #{item.paymentId}</Text>
            <Text style={styles.listSub}>요청 ID: {item.wasteRequestId}</Text>
            <Text style={styles.listSub}>실패코드: {item.failureCode ?? '-'}</Text>
            <Text style={styles.listSub}>실패사유: {item.failureMessage ?? '-'}</Text>
            <Text style={styles.listSub}>갱신시각: {formatDate(item.updatedAt)}</Text>
            <Pressable
              style={[styles.button, isRetryingPayment === item.wasteRequestId && styles.buttonDisabled]}
              onPress={() => void handleRetryFailedPayment(item.wasteRequestId)}
              disabled={isRetryingPayment !== null}
            >
              <Text style={styles.buttonText}>
                {isRetryingPayment === item.wasteRequestId ? '재시도 중..' : '결제 재시도'}
              </Text>
            </Pressable>
          </View>
        ))}
        {!isLoadingFailedPayments && failedPayments.length === 0 && (
          <Text style={styles.meta}>결제 실패 건이 없습니다.</Text>
        )}
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
    padding: 16,
    paddingBottom: 28,
    backgroundColor: ui.colors.screen,
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
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.textStrong,
  },
  success: {
    color: ui.colors.success,
    fontSize: 13,
  },
  error: {
    color: ui.colors.error,
    fontSize: 13,
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
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: ui.colors.primary,
    fontWeight: '700',
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
  listItem: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    gap: 4,
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
