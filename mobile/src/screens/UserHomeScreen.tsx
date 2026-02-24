import { useFocusEffect } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { cancelMyWasteRequest, createWasteRequest, getMyWasteRequestDetail, getMyWasteRequests } from '../api/wasteApi';
import { useAuth } from '../auth/AuthContext';
import { loadUserAddresses } from '../storage/userAddressStorage';
import { ui } from '../theme/ui';
import { UserAddress } from '../types/userAddress';
import { ApiErrorResponse, WasteRequest } from '../types/waste';

type UserHomeSection = 'all' | 'history' | 'request-form';

type UserHomeScreenProps = {
  section?: UserHomeSection;
};

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

function toFullAddress(item: UserAddress): string {
  const detailAddress = item.detailAddress.trim();
  return detailAddress ? `${item.roadAddress} ${detailAddress}` : item.roadAddress;
}

export function UserHomeScreen({ section = 'all' }: UserHomeScreenProps) {
  const { me } = useAuth();

  const [primaryAddress, setPrimaryAddress] = useState<UserAddress | null>(null);
  const [isLoadingPrimaryAddress, setIsLoadingPrimaryAddress] = useState(false);
  const [primaryAddressError, setPrimaryAddressError] = useState<string | null>(null);

  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');

  const [requests, setRequests] = useState<WasteRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const showRequestForm = section === 'all' || section === 'request-form';
  const showHistory = section === 'all' || section === 'history';

  const selectedStatus = selectedRequest?.status;
  const canCancelSelected = selectedStatus === 'REQUESTED';

  const selectedTitle = useMemo(() => {
    if (!selectedRequest) {
      return '상세 요청을 선택해 주세요.';
    }
    return `요청 #${selectedRequest.id} (${selectedRequest.status})`;
  }, [selectedRequest]);

  const loadPrimaryAddress = useCallback(async () => {
    if (!me?.id) {
      setPrimaryAddress(null);
      setPrimaryAddressError('사용자 정보를 확인할 수 없습니다.');
      return;
    }

    setIsLoadingPrimaryAddress(true);
    setPrimaryAddressError(null);

    try {
      const addresses = await loadUserAddresses(me.id);
      const selected = addresses.find((item) => item.isPrimary) ?? addresses[0] ?? null;
      setPrimaryAddress(selected);
      if (!selected) {
        setPrimaryAddressError('대표 주소지가 없습니다. 내정보 주소관리에서 먼저 등록해 주세요.');
      }
    } catch (error) {
      setPrimaryAddress(null);
      setPrimaryAddressError(toErrorMessage(error));
    } finally {
      setIsLoadingPrimaryAddress(false);
    }
  }, [me?.id]);

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
    if (!primaryAddress) {
      setSubmitError('대표 주소지가 없습니다. 내정보 주소관리에서 먼저 등록해 주세요.');
      return;
    }

    if (!contactPhone.trim()) {
      setSubmitError('연락처를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createWasteRequest({
        address: toFullAddress(primaryAddress),
        contactPhone: contactPhone.trim(),
        note: note.trim() ? note.trim() : undefined,
      });

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

  useEffect(() => {
    void refreshRequests();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPrimaryAddress();
    }, [loadPrimaryAddress]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>USER 수거 요청</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

      {showRequestForm && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>요청 생성</Text>
          <Text style={styles.meta}>주소는 내정보 주소관리에서 지정한 대표 주소지를 자동 사용합니다.</Text>

          <Text style={styles.label}>대표 주소지</Text>
          {isLoadingPrimaryAddress && <Text style={styles.meta}>대표 주소지를 불러오는 중입니다.</Text>}
          {primaryAddress && (
            <View style={styles.addressBox}>
              <Text style={styles.addressTitle}>{toFullAddress(primaryAddress)}</Text>
              <Text style={styles.addressSub}>우편번호: {primaryAddress.zipCode || '-'}</Text>
              <Text style={styles.addressSub}>지번: {primaryAddress.jibunAddress || '-'}</Text>
            </View>
          )}
          {!isLoadingPrimaryAddress && !primaryAddress && (
            <Text style={styles.error}>대표 주소지가 없습니다. 내정보 주소관리에서 먼저 등록해 주세요.</Text>
          )}
          {primaryAddressError && <Text style={styles.error}>{primaryAddressError}</Text>}

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

          <Pressable
            style={[styles.button, (isSubmitting || !primaryAddress) && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={isSubmitting || !primaryAddress}
          >
            <Text style={styles.buttonText}>{isSubmitting ? '생성 중..' : '수거 요청 생성'}</Text>
          </Pressable>
        </View>
      )}

      {showHistory && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>신청/이용 내역</Text>
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
              onPress={() => void loadRequestDetail(item.id)}
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
      )}

      {showHistory && (
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  label: {
    fontSize: 13,
    color: ui.colors.textStrong,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.textStrong,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addressBox: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  addressTitle: {
    color: ui.colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  addressSub: {
    color: ui.colors.text,
    fontSize: 12,
  },
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
  button: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonMuted: {
    backgroundColor: ui.colors.textMuted,
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
  detailTitle: {
    color: ui.colors.text,
    fontSize: 13,
  },
  detailBox: {
    gap: 4,
  },
  detailText: {
    color: ui.colors.textStrong,
    fontSize: 13,
  },
});
