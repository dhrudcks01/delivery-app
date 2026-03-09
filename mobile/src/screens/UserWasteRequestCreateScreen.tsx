import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createWasteRequest } from '../api/wasteApi';
import { getUserServiceAreaAvailability } from '../api/serviceAreaApi';
import { createUserAddress, getUserAddresses } from '../api/userAddressApi';
import { uploadImageFile } from '../api/uploadApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PhotoThumbnailCard } from '../components/PhotoThumbnailCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { clearLegacyUserAddresses, loadLegacyUserAddresses } from '../storage/userAddressStorage';
import { ui } from '../theme/ui';
import type { UserAddress } from '../types/userAddress';
import type { ApiErrorResponse } from '../types/waste';
import { buildWasteRequestAddress } from '../utils/wasteRequestAddress';

type Props = { includeTopInset?: boolean };
type Step = 0 | 1 | 2;
type Code = 'GENERAL' | 'BOX';

const STEP_TITLES = ['수거 품목 선택', '특이사항 입력', '신청 정보 확인'] as const;
const SPECIAL_OPTIONS = ['전용 비닐 외 다른 비닐 사용', '문 앞이 아닌 곳에 배출', '날카로운 물건 배출'] as const;
const VISIT_SCHEDULE_NOTICE = '해당 날 밤 10시 ~ 다음날 아침 6시 사이 방문';
const DISPOSAL_ITEM_LABEL: Record<Code, string> = {
  GENERAL: '혼합 쓰레기',
  BOX: '택배 박스',
};
const SERVICE_AREA_UNAVAILABLE_MESSAGE = '서비스 지역이 아닙니다.';

const colors = ui.colors;

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '요청 처리 중 오류가 발생했습니다.';
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

async function ensureImagePermission(): Promise<boolean> {
  const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (currentPermission.granted) {
    return true;
  }

  const nextPermission = currentPermission.canAskAgain
    ? await ImagePicker.requestMediaLibraryPermissionsAsync()
    : currentPermission;
  if (nextPermission.granted) {
    return true;
  }

  Alert.alert(
    '사진 권한 필요',
    '참고사진 업로드를 위해 사진 접근 권한이 필요합니다. 설정에서 권한을 허용해 주세요.',
    [
      { text: '취소', style: 'cancel' },
      {
        text: '설정 열기',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
  return false;
}

export function UserWasteRequestCreateScreen({ includeTopInset = false }: Props) {
  const { me } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState<Step>(0);
  const [started, setStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [primaryAddress, setPrimaryAddress] = useState<UserAddress | null>(null);
  const [isServiceAreaAvailable, setIsServiceAreaAvailable] = useState<boolean | null>(null);
  const [isCheckingServiceArea, setIsCheckingServiceArea] = useState(false);
  const [serviceAreaError, setServiceAreaError] = useState<string | null>(null);
  const [serviceAreaRetryKey, setServiceAreaRetryKey] = useState(0);

  const [counts, setCounts] = useState<Record<Code, number>>({ GENERAL: 1, BOX: 0 });
  const [bagCount, setBagCount] = useState(1);
  const [options, setOptions] = useState<string[]>([]);
  const [referencePhotoUrls, setReferencePhotoUrls] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const addressBuildResult = useMemo(() => {
    if (!primaryAddress) {
      return null;
    }
    return buildWasteRequestAddress(primaryAddress);
  }, [primaryAddress]);

  const selectedDisposalCodes = useMemo(
    () => (Object.entries(counts).filter(([, value]) => value > 0).map(([key]) => key) as Code[]),
    [counts],
  );
  const selectedDisposalItemSummaries = useMemo(
    () => selectedDisposalCodes.map((code) => `${DISPOSAL_ITEM_LABEL[code]} ${counts[code]}개`),
    [selectedDisposalCodes, counts],
  );
  const selectedSpecialOptionSummaries = useMemo(
    () => (options.length > 0 ? options : ['선택 없음']),
    [options],
  );

  const isPhoneVerified = Boolean(me?.phoneNumber && me?.phoneVerifiedAt);
  const isServiceAreaBlocked = isServiceAreaAvailable === false;
  const requiresServiceAreaCheck = Boolean(addressBuildResult?.ok);
  const canStartRequest = !requiresServiceAreaCheck
    || (isServiceAreaAvailable === true && !isCheckingServiceArea && !serviceAreaError);

  const migrateLegacyAddresses = useCallback(async () => {
    if (!me?.id) {
      return false;
    }
    const legacyAddresses = await loadLegacyUserAddresses(me.id);
    if (legacyAddresses.length === 0) {
      return false;
    }

    for (const item of legacyAddresses) {
      await createUserAddress({
        roadAddress: item.roadAddress.trim(),
        jibunAddress: item.jibunAddress.trim() || undefined,
        zipCode: item.zipCode.trim() || undefined,
        detailAddress: item.detailAddress.trim() || undefined,
        isPrimary: item.isPrimary,
      });
    }
    await clearLegacyUserAddresses(me.id);
    return true;
  }, [me?.id]);

  const loadPrimaryAddress = useCallback(async () => {
    try {
      let addresses = await getUserAddresses();
      if (addresses.length === 0) {
        const migrated = await migrateLegacyAddresses();
        if (migrated) {
          addresses = await getUserAddresses();
        }
      }
      const selected = addresses.find((item) => item.isPrimary) ?? addresses[0] ?? null;
      setPrimaryAddress(selected);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    }
  }, [migrateLegacyAddresses]);

  useFocusEffect(
    useCallback(() => {
      void loadPrimaryAddress();
    }, [loadPrimaryAddress]),
  );

  useEffect(() => {
    if (!addressBuildResult?.ok) {
      setIsServiceAreaAvailable(null);
      setIsCheckingServiceArea(false);
      setServiceAreaError(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsCheckingServiceArea(true);
      setServiceAreaError(null);
      try {
        const response = await getUserServiceAreaAvailability(addressBuildResult.address);
        if (cancelled) {
          return;
        }
        setIsServiceAreaAvailable(response.available);
        if (response.reasonCode === 'SERVICE_AREA_ADDRESS_UNRESOLVED') {
          setServiceAreaError(response.message ?? '대표 주소지의 동 정보를 확인할 수 없습니다. 주소를 다시 확인해 주세요.');
          return;
        }
        setServiceAreaError(null);
      } catch {
        if (cancelled) {
          return;
        }
        setIsServiceAreaAvailable(null);
        setServiceAreaError('서비스 가능 지역 확인에 실패했습니다.');
      } finally {
        if (!cancelled) {
          setIsCheckingServiceArea(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addressBuildResult, serviceAreaRetryKey]);

  const adjustCount = (code: Code, delta: number) => {
    setCounts((prev) => ({ ...prev, [code]: Math.max(0, prev[code] + delta) }));
  };

  const toggleOption = (option: string) => {
    setOptions((prev) => (prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]));
  };

  const pickReferencePhoto = async () => {
    setPhotoUploadError(null);
    const hasPermission = await ensureImagePermission();
    if (!hasPermission) {
      setPhotoUploadError('사진 접근 권한이 필요합니다. 설정에서 권한을 허용한 뒤 다시 시도해 주세요.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (picked.canceled || picked.assets.length === 0) {
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await uploadImageFile(picked.assets[0].uri, picked.assets[0].fileName ?? undefined);
      setReferencePhotoUrls((prev) => [...prev, uploadedUrl]);
    } catch (uploadError) {
      setPhotoUploadError(toErrorMessage(uploadError));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const submit = async () => {
    setError(null);

    if (!addressBuildResult?.ok) {
      setError('대표 주소지를 먼저 확인해 주세요.');
      return;
    }
    if (!isPhoneVerified) {
      setError('휴대폰 본인인증 완료 후 신청할 수 있습니다.');
      return;
    }
    if (isServiceAreaBlocked) {
      setError(SERVICE_AREA_UNAVAILABLE_MESSAGE);
      return;
    }
    if (isServiceAreaAvailable !== true) {
      setError('서비스 가능 지역 확인 후 다시 시도해 주세요.');
      return;
    }
    if (!agreed) {
      setError('유의사항을 확인하고 동의해 주세요.');
      return;
    }
    if (selectedDisposalCodes.length === 0) {
      setError('수거 품목을 1개 이상 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const composedNote = [
        note.trim() ? `[요청사항]\n${note.trim()}` : '',
        options.length > 0 ? `[특이사항]\n- ${options.join('\n- ')}` : '',
        `[방문일정]\n${VISIT_SCHEDULE_NOTICE}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const created = await createWasteRequest({
        address: addressBuildResult.address,
        note: composedNote || undefined,
        disposalItems: selectedDisposalCodes,
        bagCount,
        referencePhotoUrls,
      });

      navigation.navigate('WasteRequestDetail', {
        requestId: created.id,
        orderNo: created.orderNo || undefined,
      });
      setStarted(false);
      setStep(0);
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onNext = () => {
    setError(null);
    if (step === 0 && selectedDisposalCodes.length === 0) {
      setError('수거 품목을 1개 이상 선택해 주세요.');
      return;
    }
    if (step < 2) {
      setStep((prev) => (prev + 1) as Step);
      return;
    }
    void submit();
  };

  if (!started) {
    return (
      <KeyboardAwareScrollScreen contentContainerStyle={styles.container} includeTopInset={includeTopInset}>
        <View style={styles.entryTopRow}>
          <Pressable
            style={styles.addressMarkerButton}
            accessibilityRole="button"
            accessibilityLabel="대표주소 설정 화면으로 이동"
            hitSlop={8}
            onPress={() => navigation.navigate('UserAddressManagement')}
          >
            <Ionicons name="location-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.title}>3단계로 간편하게 신청해요</Text>
          <Text style={styles.description}>수거 품목 선택 → 특이사항 입력 → 신청 정보 확인 순서로 진행됩니다.</Text>
        </View>

        {isCheckingServiceArea && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.caption}>서비스 가능 여부를 확인 중입니다.</Text>
          </View>
        )}

        {serviceAreaError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{serviceAreaError}</Text>
          </View>
        )}

        {serviceAreaError && (
          <Pressable style={styles.secondaryButton} onPress={() => setServiceAreaRetryKey((prev) => prev + 1)}>
            <Text style={styles.secondaryButtonText}>다시 시도</Text>
          </Pressable>
        )}

        {isServiceAreaBlocked && !isCheckingServiceArea && !serviceAreaError && (
          <>
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>{SERVICE_AREA_UNAVAILABLE_MESSAGE}</Text>
              <Text style={styles.warningText}>현재 대표 주소지는 신청 가능한 지역이 아닙니다.</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('ServiceAreaBrowse')}>
              <Text style={styles.secondaryButtonText}>서비스 지역 살펴보기</Text>
            </Pressable>
          </>
        )}

        <Pressable
          style={[styles.primaryButton, !canStartRequest && styles.buttonDisabled]}
          onPress={() => setStarted(true)}
          disabled={!canStartRequest}
        >
          <Text style={styles.primaryButtonText}>수거 요청 시작</Text>
        </Pressable>
      </KeyboardAwareScrollScreen>
    );
  }

  return (
    <>
      <KeyboardAwareScrollScreen contentContainerStyle={styles.container} includeTopInset={includeTopInset}>
        <View style={styles.stepCard}>
          <Text style={styles.badge}>신청 단계</Text>
          <Text style={styles.stepTitle}>{step + 1}. {STEP_TITLES[step]}</Text>

          <View style={styles.progressRow}>
            {STEP_TITLES.map((title, index) => (
              <View key={title} style={styles.progressItem}>
                <View style={[styles.progressDot, step >= index && styles.progressDotActive]} />
                <View style={[styles.progressBar, step >= index && styles.progressBarActive]} />
              </View>
            ))}
          </View>

          <View style={styles.progressLabelRow}>
            {STEP_TITLES.map((title, index) => (
              <Text
                key={`${title}-label`}
                style={[styles.progressLabel, step === index && styles.progressLabelActive]}
                numberOfLines={1}
              >
                {index + 1}단계
              </Text>
            ))}
          </View>
        </View>

        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>수거 품목 선택</Text>

            <View style={styles.selectionCard}>
              <View style={styles.selectionTextWrap}>
                <Text style={styles.selectionTitle}>혼합 쓰레기</Text>
                <Text style={styles.selectionDescription}>기본 수거 품목입니다.</Text>
              </View>
              <View style={styles.counter}>
                <Pressable style={styles.counterButton} onPress={() => adjustCount('GENERAL', -1)}>
                  <Text style={styles.counterButtonText}>-</Text>
                </Pressable>
                <Text style={styles.counterValue}>{counts.GENERAL}</Text>
                <Pressable style={styles.counterButton} onPress={() => adjustCount('GENERAL', 1)}>
                  <Text style={styles.counterButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.selectionCard}>
              <View style={styles.selectionTextWrap}>
                <Text style={styles.selectionTitle}>택배 박스</Text>
                <Text style={styles.selectionDescription}>함께 배출할 박스 수량을 선택해 주세요.</Text>
              </View>
              <View style={styles.counter}>
                <Pressable style={styles.counterButton} onPress={() => adjustCount('BOX', -1)}>
                  <Text style={styles.counterButtonText}>-</Text>
                </Pressable>
                <Text style={styles.counterValue}>{counts.BOX}</Text>
                <Pressable style={styles.counterButton} onPress={() => adjustCount('BOX', 1)}>
                  <Text style={styles.counterButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.sectionTitle}>비닐 배송 요청</Text>
            <View style={styles.selectionCard}>
              <View style={styles.selectionTextWrap}>
                <Text style={styles.selectionTitle}>전용 수거비닐</Text>
                <Text style={styles.selectionDescription}>필요한 수량을 선택해 주세요.</Text>
              </View>
              <View style={styles.counter}>
                <Pressable style={styles.counterButton} onPress={() => setBagCount((prev) => Math.max(0, prev - 1))}>
                  <Text style={styles.counterButtonText}>-</Text>
                </Pressable>
                <Text style={styles.counterValue}>{bagCount}</Text>
                <Pressable style={styles.counterButton} onPress={() => setBagCount((prev) => prev + 1)}>
                  <Text style={styles.counterButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>특이사항</Text>
            {SPECIAL_OPTIONS.map((option) => {
              const selected = options.includes(option);
              return (
                <Pressable
                  key={option}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${option} 선택`}
                  accessibilityState={{ checked: selected }}
                  hitSlop={8}
                  style={[styles.optionChoice, selected && styles.optionChoiceSelected]}
                  onPress={() => toggleOption(option)}
                >
                  <Text style={[styles.optionChoiceText, selected && styles.optionChoiceTextSelected]}>{option}</Text>
                  <View style={[styles.optionBadge, selected && styles.optionBadgeSelected]}>
                    <Text style={[styles.optionBadgeText, selected && styles.optionBadgeTextSelected]}>
                      {selected ? '선택됨' : '미선택'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>참고사진 ({referencePhotoUrls.length})</Text>
              <Pressable
                style={[styles.secondaryButtonCompact, isUploadingPhoto && styles.buttonDisabled]}
                disabled={isUploadingPhoto}
                onPress={() => void pickReferencePhoto()}
              >
                <Text style={styles.secondaryButtonCompactText}>{isUploadingPhoto ? '업로드 중...' : '사진 추가'}</Text>
              </Pressable>
            </View>

            {photoUploadError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{photoUploadError}</Text>
              </View>
            )}

            {photoUploadError && (
              <Pressable
                style={[styles.secondaryButton, isUploadingPhoto && styles.buttonDisabled]}
                disabled={isUploadingPhoto}
                onPress={() => void pickReferencePhoto()}
              >
                <Text style={styles.secondaryButtonText}>다시 시도</Text>
              </Pressable>
            )}

            {referencePhotoUrls.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>+</Text>
                <Text style={styles.emptyTitle}>참고사진이 없습니다.</Text>
                <Text style={styles.emptyDescription}>필요하면 사진을 추가해 기사에게 전달해 주세요.</Text>
              </View>
            )}

            <View style={styles.photoGrid}>
              {referencePhotoUrls.map((url, index) => (
                <PhotoThumbnailCard
                  key={`${url}-${index}`}
                  photoUrl={url}
                  label={`참고사진 ${index + 1}`}
                  onPress={() => setSelectedPhotoUrl(url)}
                  onRemove={() => setReferencePhotoUrls((prev) => prev.filter((_, i) => i !== index))}
                  containerStyle={styles.referencePhotoCard}
                  imageStyle={styles.referencePhotoImage}
                />
              ))}
            </View>

            <View style={styles.noteSection}>
              <Text style={styles.label}>요청사항</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                maxLength={300}
                multiline
                placeholder="요청사항을 입력해 주세요."
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.caption}>{note.length}/300</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>방문일정</Text>
              <Text style={styles.summaryValueStrong}>{VISIT_SCHEDULE_NOTICE}</Text>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>주소</Text>
              <Text style={styles.summaryValue}>
                {addressBuildResult?.ok ? addressBuildResult.address : '대표 주소지를 설정해 주세요.'}
              </Text>
              {serviceAreaError && <Text style={styles.errorText}>{serviceAreaError}</Text>}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>신청정보</Text>

              <Text style={styles.summaryLabel}>수거 품목</Text>
              {selectedDisposalItemSummaries.map((item) => (
                <Text key={item} style={styles.summaryBulletText}>• {item}</Text>
              ))}

              <Text style={styles.summaryLabel}>배출 특이사항</Text>
              {selectedSpecialOptionSummaries.map((item) => (
                <Text key={item} style={styles.summaryBulletText}>• {item}</Text>
              ))}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>결제수단</Text>
              <Text style={styles.summaryValue}>카드 자동결제</Text>
            </View>

            <Pressable style={styles.agreementRow} onPress={() => setAgreed((prev) => !prev)}>
              <View style={[styles.agreementCheckbox, agreed && styles.agreementCheckboxChecked]}>
                <Text style={[styles.agreementCheckboxText, agreed && styles.agreementCheckboxTextChecked]}>
                  {agreed ? '✓' : ''}
                </Text>
              </View>
              <Text style={styles.agreementText}>유의사항을 확인했습니다.</Text>
            </Pressable>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.footerRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => (step === 0 ? setStarted(false) : setStep((prev) => (prev - 1) as Step))}
          >
            <Text style={styles.secondaryButtonText}>{step === 0 ? '취소' : '이전'}</Text>
          </Pressable>
          <Pressable style={[styles.primaryButton, (isSubmitting || isUploadingPhoto) && styles.buttonDisabled]} disabled={isSubmitting || isUploadingPhoto} onPress={onNext}>
            <Text style={styles.primaryButtonText}>{step === 2 ? (isSubmitting ? '요청 중...' : '수거 요청하기') : '다음'}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollScreen>
      <PhotoPreviewModal photoUrl={selectedPhotoUrl} onClose={() => setSelectedPhotoUrl(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
    gap: 24,
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  addressMarkerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
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
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textStrong,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  caption: {
    fontSize: 12,
    color: colors.caption,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  progressBarActive: {
    backgroundColor: '#93C5FD',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: colors.caption,
  },
  progressLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  selectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F8FAFC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectionTextWrap: {
    gap: 4,
    flex: 1,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong,
  },
  selectionDescription: {
    fontSize: 12,
    color: colors.caption,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 20,
    color: colors.textStrong,
    lineHeight: 22,
  },
  counterValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
  },
  optionChoice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionChoiceSelected: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  optionChoiceText: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  optionChoiceTextSelected: {
    color: '#1E3A8A',
  },
  optionBadge: {
    minWidth: 62,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  optionBadgeSelected: {
    borderColor: '#93C5FD',
    backgroundColor: '#DBEAFE',
  },
  optionBadgeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  optionBadgeTextSelected: {
    color: '#1D4ED8',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  referencePhotoCard: {
    width: '48%',
  },
  referencePhotoImage: {
    height: 100,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: {
    fontSize: 18,
    color: colors.caption,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  emptyDescription: {
    fontSize: 12,
    color: colors.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  noteSection: {
    gap: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 112,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
    color: colors.textStrong,
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  summarySection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#ffffff',
  },
  summaryValue: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryValueStrong: {
    color: '#1E3A8A',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    marginTop: 6,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryBulletText: {
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 19,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agreementCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  agreementCheckboxChecked: {
    borderColor: colors.primary,
    backgroundColor: '#DBEAFE',
  },
  agreementCheckboxText: {
    color: 'transparent',
    fontSize: 13,
    fontWeight: '700',
  },
  agreementCheckboxTextChecked: {
    color: colors.primary,
  },
  agreementText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  loadingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    padding: 12,
    gap: 4,
  },
  warningTitle: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
  },
  warningText: {
    color: '#B45309',
    fontSize: 13,
    lineHeight: 18,
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
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
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
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
    opacity: 0.55,
  },
});
