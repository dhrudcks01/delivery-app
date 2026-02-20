import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  completePaymentMethodRegistration,
  getMyPaymentMethodStatus,
  startPaymentMethodRegistration,
} from '../api/paymentApi';
import {
  cancelMyWasteRequest,
  createWasteRequest,
  getMyWasteRequestDetail,
  getMyWasteRequests,
} from '../api/wasteApi';
import { useAuth } from '../auth/AuthContext';
import { PaymentMethodStatusResponse } from '../types/payment';
import { ApiErrorResponse, WasteRequest } from '../types/waste';

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

function parseQueryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) {
    return {};
  }
  const query = url.substring(queryIndex + 1);
  const searchParams = new URLSearchParams(query);
  const result: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function UserHomeScreen() {
  const { me, signOut } = useAuth();

  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPreparingRegistration, setIsPreparingRegistration] = useState(false);
  const [isRegisteringPaymentMethod, setIsRegisteringPaymentMethod] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [paymentRegistrationError, setPaymentRegistrationError] = useState<string | null>(null);
  const [paymentRegistrationResult, setPaymentRegistrationResult] = useState<string | null>(null);
  const [paymentMethodStatusError, setPaymentMethodStatusError] = useState<string | null>(null);

  const [requests, setRequests] = useState<WasteRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null);
  const [isRegistrationModalVisible, setIsRegistrationModalVisible] = useState(false);
  const [paymentMethodStatus, setPaymentMethodStatus] = useState<PaymentMethodStatusResponse | null>(null);

  const selectedStatus = selectedRequest?.status;
  const canCancelSelected = selectedStatus === 'REQUESTED';
  const isSelectedPaymentFailed = selectedStatus === 'PAYMENT_FAILED';
  const activePaymentMethodCount =
    paymentMethodStatus?.paymentMethods.filter((item) => item.status === 'ACTIVE').length ?? 0;

  const selectedTitle = useMemo(() => {
    if (!selectedRequest) {
      return '상세 요청을 선택해 주세요.';
    }
    return `요청 #${selectedRequest.id} (${selectedRequest.status})`;
  }, [selectedRequest]);

  const refreshRequests = async () => {
    setIsLoadingList(true);
    setListError(null);

    try {
      const data = await getMyWasteRequests();
      setRequests(data);
      if (data.length === 0) {
        setSelectedRequestId(null);
        setSelectedRequest(null);
      }
    } catch (error) {
      setListError(toErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  };

  const refreshPaymentMethods = async () => {
    setIsLoadingPaymentMethods(true);
    setPaymentMethodStatusError(null);

    try {
      const data = await getMyPaymentMethodStatus();
      setPaymentMethodStatus(data);
    } catch (error) {
      setPaymentMethodStatusError(toErrorMessage(error));
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const loadRequestDetail = async (requestId: number) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setSelectedRequestId(requestId);

    try {
      const detail = await getMyWasteRequestDetail(requestId);
      setSelectedRequest(detail);
    } catch (error) {
      setDetailError(toErrorMessage(error));
      setSelectedRequest(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!address.trim() || !contactPhone.trim()) {
      setSubmitError('주소와 연락처를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createWasteRequest({
        address: address.trim(),
        contactPhone: contactPhone.trim(),
        note: note.trim() ? note.trim() : undefined,
      });

      setAddress('');
      setContactPhone('');
      setNote('');

      await refreshRequests();
      await loadRequestDetail(created.id);
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedRequestId || !canCancelSelected) {
      return;
    }

    setIsCancelling(true);
    setDetailError(null);

    try {
      const cancelled = await cancelMyWasteRequest(selectedRequestId);
      setSelectedRequest(cancelled);
      await refreshRequests();
    } catch (error) {
      setDetailError(toErrorMessage(error));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStartPaymentMethodRegistration = async () => {
    setIsPreparingRegistration(true);
    setPaymentRegistrationError(null);
    setPaymentRegistrationResult(null);

    try {
      const response = await startPaymentMethodRegistration();
      setRegistrationUrl(response.registrationUrl);
      setIsRegistrationModalVisible(true);
    } catch (error) {
      setPaymentRegistrationError(toErrorMessage(error));
    } finally {
      setIsPreparingRegistration(false);
    }
  };

  const handleCloseRegistrationModal = () => {
    setIsRegistrationModalVisible(false);
    setRegistrationUrl(null);
    setIsRegisteringPaymentMethod(false);
  };

  const handleRegistrationSuccessRedirect = async (url: string) => {
    if (isRegisteringPaymentMethod) {
      return;
    }

    const queryParams = parseQueryParams(url);
    const customerKey = queryParams.customerKey;
    const authKey = queryParams.authKey;

    if (!customerKey || !authKey) {
      setPaymentRegistrationError('등록 완료 파라미터가 올바르지 않습니다.');
      handleCloseRegistrationModal();
      return;
    }

    setIsRegisteringPaymentMethod(true);
    try {
      await completePaymentMethodRegistration(customerKey, authKey);
      setPaymentRegistrationResult('결제수단 등록이 완료되었습니다.');
      await refreshPaymentMethods();
    } catch (error) {
      setPaymentRegistrationError(toErrorMessage(error));
    } finally {
      handleCloseRegistrationModal();
    }
  };

  const handleRegistrationFailRedirect = (url: string) => {
    const queryParams = parseQueryParams(url);
    const message = queryParams.message ?? '결제수단 등록에 실패했습니다.';
    setPaymentRegistrationError(message);
    handleCloseRegistrationModal();
  };

  const handleShouldStartRegistrationRequest = (request: { url: string }) => {
    const { url } = request;

    if (url.includes('/user/payment-methods/registration/success')) {
      void handleRegistrationSuccessRedirect(url);
      return false;
    }

    if (url.includes('/user/payment-methods/registration/fail')) {
      handleRegistrationFailRedirect(url);
      return false;
    }

    return true;
  };

  useEffect(() => {
    void refreshRequests();
    void refreshPaymentMethods();
  }, []);

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>USER 수거 요청</Text>
        <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
        <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>결제수단 상태</Text>
            <Pressable style={styles.ghostButton} onPress={refreshPaymentMethods}>
              <Text style={styles.ghostButtonText}>상태 새로고침</Text>
            </Pressable>
          </View>
          <Text style={styles.helpText}>
            활성 결제수단: {activePaymentMethodCount}개
            {paymentMethodStatus?.canReregister ? ' (재등록 가능)' : ''}
          </Text>

          {isLoadingPaymentMethods && <Text style={styles.meta}>결제수단 상태를 불러오는 중..</Text>}
          {paymentMethodStatusError && <Text style={styles.error}>{paymentMethodStatusError}</Text>}

          {paymentMethodStatus?.paymentMethods.length ? (
            <View style={styles.paymentMethodList}>
              {paymentMethodStatus.paymentMethods.map((method) => (
                <View key={method.id} style={styles.paymentMethodItem}>
                  <Text style={styles.paymentMethodTitle}>
                    #{method.id} {method.provider}
                  </Text>
                  <Text
                    style={[
                      styles.paymentMethodStatus,
                      method.status === 'ACTIVE' ? styles.paymentMethodStatusActive : styles.paymentMethodStatusInactive,
                    ]}
                  >
                    {method.status}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            !isLoadingPaymentMethods && <Text style={styles.meta}>등록된 결제수단이 없습니다.</Text>
          )}

          {paymentRegistrationResult && <Text style={styles.successText}>{paymentRegistrationResult}</Text>}
          {paymentRegistrationError && <Text style={styles.error}>{paymentRegistrationError}</Text>}
          <Pressable
            style={[styles.button, isPreparingRegistration && styles.buttonDisabled]}
            onPress={handleStartPaymentMethodRegistration}
            disabled={isPreparingRegistration}
          >
            <Text style={styles.buttonText}>
              {isPreparingRegistration
                ? '등록 페이지 준비 중..'
                : activePaymentMethodCount > 0
                  ? '결제수단 재등록하기'
                  : '결제수단 등록하기'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>요청 생성</Text>
          <Text style={styles.label}>주소</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="수거 주소"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>연락처</Text>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="010-1234-5678"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>요청사항(선택)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="요청사항"
            placeholderTextColor="#94a3b8"
          />

          {submitError && <Text style={styles.error}>{submitError}</Text>}

          <Pressable style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleCreate}>
            <Text style={styles.buttonText}>{isSubmitting ? '생성 중..' : '수거 요청 생성'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>내 요청 목록</Text>
            <Pressable style={styles.ghostButton} onPress={refreshRequests}>
              <Text style={styles.ghostButtonText}>새로고침</Text>
            </Pressable>
          </View>

          {isLoadingList && <Text style={styles.meta}>목록을 불러오는 중..</Text>}
          {listError && <Text style={styles.error}>{listError}</Text>}

          {requests.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.listItem, selectedRequestId === item.id && styles.listItemActive]}
              onPress={() => loadRequestDetail(item.id)}
            >
              <Text style={styles.listTitle}>
                #{item.id} {item.status}
              </Text>
              <Text style={styles.listSub}>{item.address}</Text>
              <Text style={styles.listSub}>{formatDate(item.createdAt)}</Text>
            </Pressable>
          ))}

          {!isLoadingList && requests.length === 0 && <Text style={styles.meta}>생성된 요청이 없습니다.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>요청 상세</Text>
          <Text style={styles.detailTitle}>{selectedTitle}</Text>

          {isLoadingDetail && <Text style={styles.meta}>상세를 불러오는 중..</Text>}
          {detailError && <Text style={styles.error}>{detailError}</Text>}

          {selectedRequest && (
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>주소: {selectedRequest.address}</Text>
              <Text style={styles.detailText}>연락처: {selectedRequest.contactPhone}</Text>
              <Text style={styles.detailText}>요청사항: {selectedRequest.note || '-'}</Text>
              <Text style={styles.detailText}>상태: {selectedRequest.status}</Text>
              <Text style={styles.detailText}>측정무게: {selectedRequest.measuredWeightKg ?? '-'}</Text>
              <Text style={styles.detailText}>최종금액: {selectedRequest.finalAmount ?? '-'}</Text>
              <Text style={styles.detailText}>생성일: {formatDate(selectedRequest.createdAt)}</Text>
              <Text style={styles.detailText}>수정일: {formatDate(selectedRequest.updatedAt)}</Text>

              {isSelectedPaymentFailed && (
                <View style={styles.failedPaymentNotice}>
                  <Text style={styles.failedPaymentTitle}>결제 실패 안내</Text>
                  <Text style={styles.failedPaymentText}>
                    결제수단을 재등록한 뒤 운영자 재시도를 기다려 주세요. 상태가 갱신되지 않으면 고객센터로 문의해 주세요.
                  </Text>
                  <Pressable
                    style={[styles.button, isPreparingRegistration && styles.buttonDisabled]}
                    onPress={handleStartPaymentMethodRegistration}
                    disabled={isPreparingRegistration}
                  >
                    <Text style={styles.buttonText}>결제수단 재등록 바로가기</Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                style={[
                  styles.button,
                  (!canCancelSelected || isCancelling) && styles.buttonDisabled,
                  !canCancelSelected && styles.buttonMuted,
                ]}
                onPress={handleCancel}
                disabled={!canCancelSelected || isCancelling}
              >
                <Text style={styles.buttonText}>
                  {isCancelling ? '취소 처리 중..' : canCancelSelected ? '요청 취소' : '취소 불가 상태'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable style={[styles.button, styles.logoutButton]} onPress={signOut}>
          <Text style={styles.buttonText}>로그아웃</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={isRegistrationModalVisible} animationType="slide" onRequestClose={handleCloseRegistrationModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>결제수단 등록</Text>
          <Pressable onPress={handleCloseRegistrationModal} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseText}>닫기</Text>
          </Pressable>
        </View>

        {registrationUrl ? (
          <WebView
            source={{ uri: registrationUrl }}
            onShouldStartLoadWithRequest={handleShouldStartRegistrationRequest}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#0f172a" />
                <Text style={styles.meta}>결제수단 등록 페이지 로딩 중..</Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color="#0f172a" />
            <Text style={styles.meta}>등록 페이지를 준비하고 있습니다.</Text>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    fontSize: 13,
    color: '#334155',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  helpText: {
    fontSize: 13,
    color: '#475569',
  },
  successText: {
    color: '#15803d',
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    color: '#0f172a',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonMuted: {
    backgroundColor: '#64748b',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  listItemActive: {
    borderColor: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  listTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  listSub: {
    color: '#475569',
    fontSize: 12,
  },
  detailTitle: {
    color: '#334155',
    fontSize: 13,
  },
  detailBox: {
    gap: 4,
  },
  detailText: {
    color: '#0f172a',
    fontSize: 13,
  },
  paymentMethodList: {
    gap: 6,
  },
  paymentMethodItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  paymentMethodStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentMethodStatusActive: {
    color: '#15803d',
  },
  paymentMethodStatusInactive: {
    color: '#64748b',
  },
  failedPaymentNotice: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    gap: 8,
  },
  failedPaymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  failedPaymentText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  logoutButton: {
    marginBottom: 20,
  },
  modalHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalCloseButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modalCloseText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
