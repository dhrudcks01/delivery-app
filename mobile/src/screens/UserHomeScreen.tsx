import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUserServiceAreas } from '../api/serviceAreaApi';
import { createWasteRequest, getMyWasteRequests } from '../api/wasteApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { loadUserAddresses } from '../storage/userAddressStorage';
import { ui } from '../theme/ui';
import { UserAddress } from '../types/userAddress';
import { ApiErrorResponse, WasteRequest } from '../types/waste';
import { buildWasteRequestAddress } from '../utils/wasteRequestAddress';

type UserHomeSection = 'all' | 'history' | 'request-form';

type UserHomeScreenProps = {
  section?: UserHomeSection;
  includeTopInset?: boolean;
};

type AddressRegion = {
  city: string;
  district: string;
  dong: string;
};

const SUCCESS_BANNER_TIMEOUT_MS = 2500;
const CITY_SUFFIXES = ['특별시', '광역시', '자치시', '자치도', '-si', '-do', '시', '도'];
const DISTRICT_SUFFIXES = ['자치구', '-gu', '-gun', '구', '군'];
const DONG_SUFFIXES = ['-dong', '-eup', '-myeon', '동', '읍', '면', '가'];

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

function tokenizeAddress(address: string): string[] {
  return address
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[(),]/g, '').trim())
    .filter((token) => token.length > 0);
}

function hasAnySuffix(token: string, suffixes: string[]): boolean {
  const lower = token.toLowerCase();
  return suffixes.some((suffix) => lower.endsWith(suffix.toLowerCase()));
}

function extractAddressRegion(address: string): AddressRegion | null {
  if (!address.trim()) {
    return null;
  }

  const tokens = tokenizeAddress(address);
  let city: string | null = null;
  let district: string | null = null;
  let dong: string | null = null;

  for (const token of tokens) {
    if (!city && hasAnySuffix(token, CITY_SUFFIXES)) {
      city = token;
      continue;
    }
    if (!district && hasAnySuffix(token, DISTRICT_SUFFIXES)) {
      district = token;
      continue;
    }
    if (!dong && hasAnySuffix(token, DONG_SUFFIXES)) {
      dong = token;
    }
  }

  if (!city && district && dong && tokens.length >= 3) {
    city = tokens[0];
  }

  if (!city || !district || !dong) {
    return null;
  }

  return { city, district, dong };
}

function normalizeRegionToken(value: string): string {
  return value.trim().toLowerCase();
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
  const [isCheckingServiceArea, setIsCheckingServiceArea] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [serviceAreaCheckError, setServiceAreaCheckError] = useState<string | null>(null);
  const [isServiceAreaAvailable, setIsServiceAreaAvailable] = useState<boolean | null>(null);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unavailableAlertAddressRef = useRef<string | null>(null);

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
  const primaryRequestAddress = primaryAddressBuildResult?.ok ? primaryAddressBuildResult.address : null;
  const isServiceAreaBlocked = isServiceAreaAvailable === false;
  const canSubmitRequest =
    canUsePrimaryAddress
    && isPhoneVerified
    && isServiceAreaAvailable === true
    && !isCheckingServiceArea
    && !serviceAreaCheckError;

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

  const checkServiceAreaAvailability = useCallback(async (address: string) => {
    const region = extractAddressRegion(address);
    if (!region) {
      setIsServiceAreaAvailable(false);
      setServiceAreaCheckError('대표 주소지의 시/구/동 정보를 확인할 수 없습니다.');
      return;
    }

    setIsCheckingServiceArea(true);
    setServiceAreaCheckError(null);

    try {
      const response = await getUserServiceAreas({
        query: `${region.city} ${region.district} ${region.dong}`,
        page: 0,
        size: 100,
      });

      const available = response.content.some(
        (item) =>
          normalizeRegionToken(item.city) === normalizeRegionToken(region.city)
          && normalizeRegionToken(item.district) === normalizeRegionToken(region.district)
          && normalizeRegionToken(item.dong) === normalizeRegionToken(region.dong),
      );

      setIsServiceAreaAvailable(available);
      if (!available && unavailableAlertAddressRef.current !== address) {
        Alert.alert('서비스 지역이 아니예요!');
        unavailableAlertAddressRef.current = address;
      }
    } catch {
      setIsServiceAreaAvailable(null);
      setServiceAreaCheckError('서비스 가능 지역 확인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsCheckingServiceArea(false);
    }
  }, []);

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
    if (isServiceAreaAvailable !== true) {
      setSubmitError('서비스 지역이 아니예요!');
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

  useEffect(() => {
    if (!showRequestForm) {
      return;
    }
    if (!primaryRequestAddress) {
      setIsServiceAreaAvailable(null);
      setServiceAreaCheckError(null);
      return;
    }
    void checkServiceAreaAvailability(primaryRequestAddress);
  }, [showRequestForm, primaryRequestAddress, checkServiceAreaAvailability]);

  return (
    <KeyboardAwareScrollScreen
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      includeTopInset={includeTopInset}
    >
      <Text style={styles.title}>USER 수거 요청</Text>
      <Text style={styles.meta}>로그인 아이디: {me?.loginId ?? me?.email ?? '-'}</Text>
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

          {isCheckingServiceArea && (
            <Text style={styles.meta}>서비스 가능 여부를 확인 중입니다.</Text>
          )}
          {serviceAreaCheckError && (
            <>
              <Text style={styles.error}>{serviceAreaCheckError}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  if (primaryRequestAddress) {
                    void checkServiceAreaAvailability(primaryRequestAddress);
                  }
                }}
              >
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </Pressable>
            </>
          )}

          {isServiceAreaBlocked && !isCheckingServiceArea && !serviceAreaCheckError && (
            <View style={styles.guardBox}>
              <Text style={styles.guardTitle}>서비스 지역이 아니예요!</Text>
              <Text style={styles.guardDescription}>현재 대표 주소지는 신청 가능한 지역이 아닙니다.</Text>
            </View>
          )}

          {(isServiceAreaBlocked || !isPhoneVerified) && (
            <Pressable
              style={styles.ghostButton}
              onPress={() => navigation.navigate('ServiceAreaBrowse')}
            >
              <Text style={styles.ghostButtonText}>서비스 지역 살펴보기</Text>
            </Pressable>
          )}

          {canSubmitRequest && (
            <>
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
                style={[styles.button, (isSubmitting || !canSubmitRequest) && styles.buttonDisabled]}
                onPress={handleCreate}
                disabled={isSubmitting || !canSubmitRequest}
              >
                <Text style={styles.buttonText}>{isSubmitting ? '생성 중..' : '수거 요청 생성'}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {showHistory && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>요청/이용 내역</Text>
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
  guardBox: {
    borderWidth: 1,
    borderColor: '#f5c2c7',
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  guardTitle: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  guardDescription: {
    color: '#7f1d1d',
    fontSize: 12,
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
