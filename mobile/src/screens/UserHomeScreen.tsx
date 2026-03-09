import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUserServiceAreaAvailability } from '../api/serviceAreaApi';
import { createUserAddress, getUserAddresses } from '../api/userAddressApi';
import { createWasteRequest, getMyWasteRequests } from '../api/wasteApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { TabHeaderCard } from '../components/TabHeaderCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { clearLegacyUserAddresses, loadLegacyUserAddresses } from '../storage/userAddressStorage';
import { ui } from '../theme/ui';
import type { UserAddress } from '../types/userAddress';
import type { ApiErrorResponse, WasteRequest } from '../types/waste';
import { toUserWasteStatusLabel } from '../utils/wasteStatusLabel';
import { buildWasteRequestAddress } from '../utils/wasteRequestAddress';

type UserHomeSection = 'all' | 'history' | 'request-form';

type UserHomeScreenProps = {
  section?: UserHomeSection;
  includeTopInset?: boolean;
};

const SECTION_HEADER_COPY: Record<UserHomeSection, { badge: string; title: string; description: string }> = {
  all: {
    badge: '수거 요청',
    title: '수거 요청 홈',
    description: '요청 현황과 이용 내역을 한곳에서 확인할 수 있어요.',
  },
  history: {
    badge: '이용내역',
    title: '이용내역',
    description: '내 수거 요청의 상태와 처리 이력을 확인할 수 있어요.',
  },
  'request-form': {
    badge: '수거 요청',
    title: '수거 요청',
    description: '대표 주소를 기준으로 수거 신청을 진행할 수 있어요.',
  },
};

const colors = ui.colors;

const SUCCESS_BANNER_TIMEOUT_MS = 2500;
const PRIMARY_ADDRESS_MISSING_MESSAGE = '대표 주소가 없습니다. 내정보 > 주소 관리에서 대표 주소를 등록해 주세요.';

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다. 다시 시도해 주세요.';
    }
    if (!error.response) {
      return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
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

function getStatusBadgeStyle(status: WasteRequest['status']) {
  if (status === 'COMPLETED' || status === 'PAID') {
    return { container: styles.badgeSuccess, text: styles.badgeSuccessText };
  }
  if (status === 'PAYMENT_FAILED' || status === 'CANCELED') {
    return { container: styles.badgeError, text: styles.badgeErrorText };
  }
  if (status === 'REQUESTED' || status === 'ASSIGNED' || status === 'MEASURED' || status === 'PAYMENT_PENDING') {
    return { container: styles.badgeWarning, text: styles.badgeWarningText };
  }
  return { container: styles.badgeNeutral, text: styles.badgeNeutralText };
}

export function UserHomeScreen({ section = 'all', includeTopInset = false }: UserHomeScreenProps) {
  const { me } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const headerCopy = SECTION_HEADER_COPY[section];

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
  const isPrimaryAddressMissing = !isLoadingPrimaryAddress && !primaryAddress && !primaryAddressError;
  const shouldShowAddressManagementCta = isPrimaryAddressMissing;
  const primaryAddressIssueMessage =
    isPrimaryAddressMissing
      ? PRIMARY_ADDRESS_MISSING_MESSAGE
      : (primaryAddressError
        ?? (primaryAddress && primaryAddressBuildResult && !primaryAddressBuildResult.ok
          ? primaryAddressBuildResult.message
          : null));

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

  const migrateLegacyAddresses = useCallback(async (): Promise<boolean> => {
    if (!me?.id) {
      return false;
    }

    const legacyAddresses = await loadLegacyUserAddresses(me.id);
    if (legacyAddresses.length === 0) {
      return false;
    }

    const sorted = [...legacyAddresses].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
    for (const legacy of sorted) {
      await createUserAddress({
        roadAddress: legacy.roadAddress.trim(),
        jibunAddress: legacy.jibunAddress.trim() || undefined,
        zipCode: legacy.zipCode.trim() || undefined,
        detailAddress: legacy.detailAddress.trim() || undefined,
        isPrimary: legacy.isPrimary,
      });
    }

    await clearLegacyUserAddresses(me.id);
    return true;
  }, [me?.id]);

  const loadPrimaryAddress = useCallback(async () => {
    if (!me?.id) {
      setPrimaryAddress(null);
      setPrimaryAddressError('사용자 정보를 불러오지 못했습니다.');
      return;
    }

    setIsLoadingPrimaryAddress(true);
    setPrimaryAddressError(null);

    try {
      let addresses = await getUserAddresses();
      if (addresses.length === 0) {
        const migrated = await migrateLegacyAddresses();
        if (migrated) {
          addresses = await getUserAddresses();
        }
      }
      if (addresses.length > 0) {
        await clearLegacyUserAddresses(me.id);
      }
      const selected = addresses.find((item) => item.isPrimary) ?? addresses[0] ?? null;
      setPrimaryAddress(selected);
    } catch (error) {
      setPrimaryAddress(null);
      setPrimaryAddressError(toErrorMessage(error));
    } finally {
      setIsLoadingPrimaryAddress(false);
    }
  }, [me?.id, migrateLegacyAddresses]);

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
    setIsCheckingServiceArea(true);
    setServiceAreaCheckError(null);

    try {
      const response = await getUserServiceAreaAvailability(address);
      setIsServiceAreaAvailable(response.available);

      if (response.reasonCode === 'SERVICE_AREA_ADDRESS_UNRESOLVED') {
        setServiceAreaCheckError(
          response.message ?? '대표 주소에서 동 정보를 확인할 수 없습니다.',
        );
        return;
      }

      if (!response.available && unavailableAlertAddressRef.current !== address) {
        Alert.alert('현재 대표 주소는 서비스 가능 지역이 아닙니다.');
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
      setSubmitError('대표 주소가 없습니다. 내정보 > 주소 관리에서 대표 주소를 등록해 주세요.');
      return;
    }
    if (!primaryAddressBuildResult || !primaryAddressBuildResult.ok) {
      setSubmitError(
        primaryAddressBuildResult?.message
          ?? '대표 주소 데이터가 올바르지 않습니다. 주소를 다시 저장해 주세요.',
      );
      return;
    }
    if (!isPhoneVerified) {
      setSubmitError('수거 신청 전 휴대폰 본인인증이 필요합니다.');
      return;
    }
    if (isServiceAreaAvailable !== true) {
      setSubmitError('현재 대표 주소는 서비스 가능 지역이 아닙니다.');
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
        created.orderNo ? `수거 요청이 접수되었습니다. 주문번호: ${created.orderNo}` : '수거 요청이 접수되었습니다.',
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

  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    },
    [],
  );

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
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      includeTopInset={includeTopInset}
    >
      <TabHeaderCard
        badge={headerCopy.badge}
        title={headerCopy.title}
        description={headerCopy.description}
        meta={(
          <>
            <Text style={styles.caption}>로그인 ID: {me?.loginId ?? me?.email ?? '-'}</Text>
            <Text style={styles.caption}>권한: {me?.roles.join(', ') ?? '-'}</Text>
          </>
        )}
      />

      {showRequestForm && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>수거 요청 생성</Text>
          <Text style={styles.bodyText}>대표 주소는 내정보/주소 관리에서 자동으로 불러옵니다.</Text>

          <Text style={styles.label}>대표 주소</Text>
          {isLoadingPrimaryAddress && (
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineLong} />
            </View>
          )}

          {primaryAddress && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                {primaryAddressBuildResult?.ok
                  ? primaryAddressBuildResult.address
                  : primaryAddress.roadAddress || primaryAddress.jibunAddress || '-'}
              </Text>
              <Text style={styles.infoMeta}>우편번호: {primaryAddress.zipCode || '-'}</Text>
              <Text style={styles.infoMeta}>지번주소: {primaryAddress.jibunAddress || '-'}</Text>
            </View>
          )}

          {primaryAddressIssueMessage && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{primaryAddressIssueMessage}</Text>
            </View>
          )}

          {shouldShowAddressManagementCta && (
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('UserAddressManagement')}>
              <Text style={styles.secondaryButtonText}>주소 관리 열기</Text>
            </Pressable>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>연락처</Text>
            <Text style={styles.infoMeta}>본인인증 완료된 휴대폰 번호가 자동 적용됩니다.</Text>
            <Text style={styles.infoMeta}>{me?.phoneNumber ?? '-'}</Text>
            {!isPhoneVerified && <Text style={styles.errorText}>휴대폰 본인인증이 필요합니다.</Text>}
          </View>

          {isCheckingServiceArea && <Text style={styles.caption}>서비스 가능 지역을 확인하고 있습니다...</Text>}

          {serviceAreaCheckError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{serviceAreaCheckError}</Text>
            </View>
          )}

          {serviceAreaCheckError && (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                if (primaryRequestAddress) {
                  void checkServiceAreaAvailability(primaryRequestAddress);
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>다시 시도</Text>
            </Pressable>
          )}

          {isServiceAreaBlocked && !isCheckingServiceArea && !serviceAreaCheckError && (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>서비스 지역 안내</Text>
              <Text style={styles.warningText}>현재 대표 주소는 서비스 가능 지역이 아닙니다.</Text>
            </View>
          )}

          {(isServiceAreaBlocked || !isPhoneVerified) && (
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('ServiceAreaBrowse')}>
              <Text style={styles.secondaryButtonText}>서비스 지역 둘러보기</Text>
            </Pressable>
          )}

          {canSubmitRequest && (
            <>
              <Text style={styles.label}>요청사항 (선택)</Text>
              <TextInput
                style={styles.textArea}
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="요청사항을 입력해 주세요"
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
                maxLength={300}
              />

              {submitSuccessMessage && (
                <View style={styles.successCard}>
                  <Text style={styles.successText}>{submitSuccessMessage}</Text>
                </View>
              )}

              {submitError && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              )}

              {submitError && !isSubmitting && (
                <Pressable style={styles.secondaryButton} onPress={handleCreate}>
                  <Text style={styles.secondaryButtonText}>다시 시도</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.primaryButton, (isSubmitting || !canSubmitRequest) && styles.buttonDisabled]}
                onPress={handleCreate}
                disabled={isSubmitting || !canSubmitRequest}
              >
                <Text style={styles.primaryButtonText}>{isSubmitting ? '생성 중...' : '수거 요청 생성'}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {showHistory && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>요청 내역</Text>
            <Pressable style={styles.secondaryButtonCompact} onPress={refreshRequests}>
              <Text style={styles.secondaryButtonCompactText}>새로고침</Text>
            </Pressable>
          </View>

          {isLoadingList && (
            <View style={styles.listSkeletonGroup}>
              <View style={styles.skeletonListItem} />
              <View style={styles.skeletonListItem} />
              <View style={styles.skeletonListItem} />
            </View>
          )}

          {listError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{listError}</Text>
            </View>
          )}

          {!isLoadingList && requests.length === 0 && (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>아직 수거 요청이 없습니다</Text>
              <Text style={styles.emptyDescription}>생성한 수거 요청 내역이 이곳에 표시됩니다.</Text>
            </View>
          )}

          {requests.map((item) => {
            const badgeStyle = getStatusBadgeStyle(item.status);

            return (
              <Pressable
                key={item.id}
                style={styles.requestCard}
                onPress={() => navigation.navigate('WasteRequestDetail', { requestId: item.id })}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.requestTitle}>#{item.id}</Text>
                  <View style={[styles.statusBadge, badgeStyle.container]}>
                    <Text style={[styles.statusBadgeText, badgeStyle.text]}>{toUserWasteStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.requestAddress}>{item.address}</Text>
                <Text style={styles.requestDate}>{formatDate(item.createdAt)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 16,
    backgroundColor: colors.background,
    gap: 24,
  },
  caption: {
    fontSize: 12,
    color: colors.caption,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  bodyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  infoMeta: {
    fontSize: 12,
    color: colors.caption,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.textStrong,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonCompact: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonCompactText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    padding: 12,
    gap: 4,
  },
  warningTitle: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '700',
  },
  warningText: {
    color: '#b45309',
    fontSize: 12,
  },
  successCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong,
  },
  requestAddress: {
    fontSize: 14,
    color: colors.text,
  },
  requestDate: {
    fontSize: 12,
    color: colors.caption,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeSuccessText: {
    color: '#166534',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeWarningText: {
    color: '#92400e',
  },
  badgeError: {
    backgroundColor: '#fee2e2',
  },
  badgeErrorText: {
    color: '#991b1b',
  },
  badgeNeutral: {
    backgroundColor: '#e2e8f0',
  },
  badgeNeutralText: {
    color: '#334155',
  },
  emptyStateCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: {
    fontSize: 16,
    color: colors.caption,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  listSkeletonGroup: {
    gap: 10,
  },
  skeletonListItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
    height: 76,
  },
  skeletonCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  skeletonLineShort: {
    height: 10,
    width: '50%',
    borderRadius: 999,
    backgroundColor: '#dbe2ea',
  },
  skeletonLineLong: {
    height: 10,
    width: '78%',
    borderRadius: 999,
    backgroundColor: '#dbe2ea',
  },
});
