import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createWasteRequest, getMyWasteRequests } from '../api/wasteApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { loadUserAddresses } from '../storage/userAddressStorage';
import { ui } from '../theme/ui';
import { UserAddress } from '../types/userAddress';
import { buildWasteRequestAddress } from '../utils/wasteRequestAddress';
import { ApiErrorResponse, WasteRequest } from '../types/waste';

type UserHomeSection = 'all' | 'history' | 'request-form';

type UserHomeScreenProps = {
  section?: UserHomeSection;
  includeTopInset?: boolean;
};

const SUCCESS_BANNER_TIMEOUT_MS = 2500;

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    if (!error.response) {
      return 'Network is unavailable. Please check your connection and try again.';
    }
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

export function UserHomeScreen({ section = 'all', includeTopInset = false }: UserHomeScreenProps) {
  const { me } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [primaryAddress, setPrimaryAddress] = useState<UserAddress | null>(null);
  const [isLoadingPrimaryAddress, setIsLoadingPrimaryAddress] = useState(false);
  const [primaryAddressError, setPrimaryAddressError] = useState<string | null>(null);

  const [note, setNote] = useState('');

  const [requests, setRequests] = useState<WasteRequest[]>([]);

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRequestForm = section === 'all' || section === 'request-form';
  const showHistory = section === 'all' || section === 'history';
  const isPhoneVerified = Boolean(me?.phoneNumber && me?.phoneVerifiedAt);

  const primaryAddressBuildResult = useMemo(() => {
    if (!primaryAddress) {
      return null;
    }
    return buildWasteRequestAddress(primaryAddress);
  }, [primaryAddress]);
  const canUsePrimaryAddress = primaryAddressBuildResult?.ok ?? false;

  const showSubmitSuccessMessage = useCallback((message: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }

    setSubmitSuccessMessage(message);
    successTimerRef.current = setTimeout(() => {
      setSubmitSuccessMessage(null);
      successTimerRef.current = null;
    }, SUCCESS_BANNER_TIMEOUT_MS);
  }, []);

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
    } catch (error) {
      setListError(toErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleCreate = async () => {
    if (!primaryAddress) {
      setSubmitError('대표 주소지가 없습니다. 내정보 주소관리에서 먼저 등록해 주세요.');
      return;
    }
    if (!primaryAddressBuildResult || !primaryAddressBuildResult.ok) {
      setSubmitError(
        primaryAddressBuildResult?.message
        ?? '대표 주소지 정보가 올바르지 않습니다. 주소관리에서 주소를 다시 저장해 주세요.',
      );
      return;
    }

    if (!isPhoneVerified) {
      setSubmitError('휴대폰 본인인증 완료 후 신청할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createWasteRequest({
        address: primaryAddressBuildResult.address,
        note: note.trim() ? note.trim() : undefined,
      });

      setNote('');
      showSubmitSuccessMessage(
        created.orderNo
          ? `Request created. OrderNo: ${created.orderNo}`
          : 'Request created successfully.',
      );
      navigation.navigate('WasteRequestDetail', {
        requestId: created.id,
        orderNo: created.orderNo || undefined,
      });
      void refreshRequests();
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    void refreshRequests();
  }, []);

  useEffect(() => () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPrimaryAddress();
    }, [loadPrimaryAddress]),
  );

  return (
    <KeyboardAwareScrollScreen
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      includeTopInset={includeTopInset}
    >
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
              <Text style={styles.addressTitle}>
                {primaryAddressBuildResult?.ok
                  ? primaryAddressBuildResult.address
                  : primaryAddress.roadAddress || primaryAddress.jibunAddress || '-'}
              </Text>
              <Text style={styles.addressSub}>우편번호: {primaryAddress.zipCode || '-'}</Text>
              <Text style={styles.addressSub}>지번: {primaryAddress.jibunAddress || '-'}</Text>
            </View>
          )}
          {!isLoadingPrimaryAddress && !primaryAddress && (
            <Text style={styles.error}>대표 주소지가 없습니다. 내정보 주소관리에서 먼저 등록해 주세요.</Text>
          )}
          {primaryAddressError && <Text style={styles.error}>{primaryAddressError}</Text>}
          {primaryAddress && primaryAddressBuildResult && !primaryAddressBuildResult.ok && (
            <Text style={styles.error}>{primaryAddressBuildResult.message}</Text>
          )}

          <Text style={styles.meta}>
            연락처는 인증된 휴대폰 번호가 자동 적용됩니다: {me?.phoneNumber ?? '-'}
          </Text>
          {!isPhoneVerified && (
            <Text style={styles.error}>휴대폰 본인인증 완료 후 신청할 수 있습니다.</Text>
          )}
          <Pressable
            style={styles.ghostButton}
            onPress={() => navigation.navigate('ServiceAreaBrowse')}
          >
            <Text style={styles.ghostButtonText}>서비스 지역 살펴보기</Text>
          </Pressable>

          <Text style={styles.label}>요청사항(선택)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="요청사항"
            placeholderTextColor="#94a3b8"
            returnKeyType="done"
          />

          {submitSuccessMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{submitSuccessMessage}</Text>
            </View>
          )}
          {submitError && <Text style={styles.error}>{submitError}</Text>}
          {submitError && !isSubmitting && (
            <Pressable style={styles.retryButton} onPress={handleCreate}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.button, (isSubmitting || !canUsePrimaryAddress || !isPhoneVerified) && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={isSubmitting || !canUsePrimaryAddress || !isPhoneVerified}
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
              style={styles.listItem}
              onPress={() => navigation.navigate('WasteRequestDetail', { requestId: item.id })}
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
    </KeyboardAwareScrollScreen>
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
  successBanner: {
    backgroundColor: '#e8f7ee',
    borderWidth: 1,
    borderColor: '#6cbf8f',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  successBannerText: {
    color: '#1f5134',
    fontSize: 13,
    fontWeight: '600',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: ui.colors.error,
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff5f5',
  },
  retryButtonText: {
    color: ui.colors.error,
    fontWeight: '700',
  },
  button: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
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
  listTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
  },
  listSub: {
    color: ui.colors.text,
    fontSize: 12,
  },
});
