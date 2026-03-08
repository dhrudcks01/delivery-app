import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
const VISIT_SLOTS = ['오늘 밤 (22:00~06:00)', '내일 밤 (22:00~06:00)'] as const;
const SERVICE_AREA_UNAVAILABLE_MESSAGE = '서비스 지역이 아닙니다.';

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
  const [visitSlot, setVisitSlot] = useState<typeof VISIT_SLOTS[number]>(VISIT_SLOTS[0]);
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
        `[방문일정]\n${visitSlot}`,
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
        <View style={styles.card}>
          <Text style={styles.title}>수거 요청</Text>
          <Text style={styles.meta}>수거 품목, 특이사항/참고사진, 신청 정보 확인 순서로 진행됩니다.</Text>
          {isCheckingServiceArea && (
            <Text style={styles.meta}>서비스 가능 여부를 확인 중입니다.</Text>
          )}
          {serviceAreaError && (
            <>
              <Text style={styles.error}>{serviceAreaError}</Text>
              <Pressable style={styles.retryButton} onPress={() => setServiceAreaRetryKey((prev) => prev + 1)}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </Pressable>
            </>
          )}
          {isServiceAreaBlocked && !isCheckingServiceArea && !serviceAreaError && (
            <>
              <View style={styles.guardBox}>
                <Text style={styles.guardTitle}>{SERVICE_AREA_UNAVAILABLE_MESSAGE}</Text>
                <Text style={styles.guardDescription}>현재 대표 주소지는 신청 가능한 지역이 아닙니다.</Text>
              </View>
              <Pressable style={styles.ghostButton} onPress={() => navigation.navigate('ServiceAreaBrowse')}>
                <Text style={styles.ghostButtonText}>서비스 지역 살펴보기</Text>
              </Pressable>
            </>
          )}
          <Pressable
            style={[styles.primaryButton, !canStartRequest && styles.primaryButtonDisabled]}
            onPress={() => setStarted(true)}
            disabled={!canStartRequest}
          >
            <Text style={styles.primaryButtonText}>수거 요청 시작</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollScreen>
    );
  }

  return (
    <>
      <KeyboardAwareScrollScreen contentContainerStyle={styles.container} includeTopInset={includeTopInset}>
      <View style={styles.card}>
        <View style={styles.progress}>
          {STEP_TITLES.map((title, index) => (
            <View key={title} style={[styles.segment, step >= index && styles.segmentActive]} />
          ))}
        </View>
        <Text style={styles.stepTitle}>
          {step + 1}. {STEP_TITLES[step]}
        </Text>
      </View>

      {step === 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>수거 품목 선택</Text>
          <View style={styles.rowBetween}>
            <Text>혼합 쓰레기</Text>
            <View style={styles.counter}>
              <Pressable onPress={() => adjustCount('GENERAL', -1)}>
                <Text>-</Text>
              </Pressable>
              <Text>{counts.GENERAL}</Text>
              <Pressable onPress={() => adjustCount('GENERAL', 1)}>
                <Text>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.rowBetween}>
            <Text>택배 박스</Text>
            <View style={styles.counter}>
              <Pressable onPress={() => adjustCount('BOX', -1)}>
                <Text>-</Text>
              </Pressable>
              <Text>{counts.BOX}</Text>
              <Pressable onPress={() => adjustCount('BOX', 1)}>
                <Text>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionTitle}>비닐 배송 요청</Text>
          <View style={styles.rowBetween}>
            <Text>전용 수거비닐</Text>
            <View style={styles.counter}>
              <Pressable onPress={() => setBagCount((prev) => Math.max(0, prev - 1))}>
                <Text>-</Text>
              </Pressable>
              <Text>{bagCount}</Text>
              <Pressable onPress={() => setBagCount((prev) => prev + 1)}>
                <Text>+</Text>
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
                <Text style={[styles.optionChoiceText, selected && styles.optionChoiceTextSelected]}>
                  {option}
                </Text>
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
            <Pressable style={styles.ghostButton} disabled={isUploadingPhoto} onPress={() => void pickReferencePhoto()}>
              <Text style={styles.ghostButtonText}>{isUploadingPhoto ? '업로드 중..' : '사진 추가'}</Text>
            </Pressable>
          </View>
          {photoUploadError && (
            <View style={styles.photoErrorWrap}>
              <Text style={styles.error}>{photoUploadError}</Text>
              <Pressable style={styles.retryButton} disabled={isUploadingPhoto} onPress={() => void pickReferencePhoto()}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </Pressable>
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

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            maxLength={300}
            multiline
            placeholder="요청사항을 입력해 주세요."
          />
          <Text style={styles.meta}>{note.length}/300</Text>
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>방문일정</Text>
          {VISIT_SLOTS.map((slot) => (
            <Pressable
              key={slot}
              style={[styles.option, visitSlot === slot && styles.optionSelected]}
              onPress={() => setVisitSlot(slot)}
            >
              <Text style={styles.meta}>{slot}</Text>
            </Pressable>
          ))}

          <Text style={styles.sectionTitle}>주소</Text>
          <Text style={styles.meta}>{addressBuildResult?.ok ? addressBuildResult.address : '대표 주소지를 설정해 주세요.'}</Text>
          {serviceAreaError && <Text style={styles.error}>{serviceAreaError}</Text>}

          <Text style={styles.sectionTitle}>결제수단</Text>
          <Text style={styles.meta}>카드 자동결제</Text>

          <Pressable style={styles.rowBetween} onPress={() => setAgreed((prev) => !prev)}>
            <Text style={styles.meta}>유의사항을 확인했습니다.</Text>
            <Text style={styles.meta}>{agreed ? '체크됨' : '미체크'}</Text>
          </Pressable>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.footer}>
        <Pressable
          style={styles.ghostButton}
          onPress={() => (step === 0 ? setStarted(false) : setStep((prev) => (prev - 1) as Step))}
        >
          <Text style={styles.ghostButtonText}>{step === 0 ? '취소' : '이전'}</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} disabled={isSubmitting || isUploadingPhoto} onPress={onNext}>
          <Text style={styles.primaryButtonText}>{step === 2 ? (isSubmitting ? '요청 중..' : '수거 요청하기') : '다음'}</Text>
        </Pressable>
      </View>
      </KeyboardAwareScrollScreen>
      <PhotoPreviewModal photoUrl={selectedPhotoUrl} onClose={() => setSelectedPhotoUrl(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: ui.colors.screen, gap: 12 },
  card: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 14,
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: ui.colors.textStrong },
  stepTitle: { fontSize: 16, fontWeight: '700', color: ui.colors.textStrong },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: ui.colors.textStrong, marginTop: 4 },
  meta: { fontSize: 13, color: ui.colors.text },
  error: { fontSize: 13, color: ui.colors.error },
  progress: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 999, backgroundColor: '#d9e5e1' },
  segmentActive: { backgroundColor: '#f97316' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  option: { borderWidth: 1, borderColor: '#dce7e2', borderRadius: 10, padding: 10 },
  optionSelected: { borderColor: ui.colors.primary, backgroundColor: '#eef8f6' },
  optionChoice: {
    borderWidth: 1,
    borderColor: '#a7bcb5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  optionChoiceSelected: {
    borderColor: '#0f766e',
    backgroundColor: '#e6fffa',
  },
  optionChoiceText: {
    color: ui.colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  optionChoiceTextSelected: {
    color: '#0f766e',
    fontWeight: '700',
  },
  optionBadge: {
    minWidth: 62,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  optionBadgeSelected: {
    borderColor: '#0f766e',
    backgroundColor: '#ccfbf1',
  },
  optionBadgeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  optionBadgeTextSelected: {
    color: '#115e59',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#cad9d3',
    borderRadius: ui.radius.control,
    minHeight: 100,
    padding: 10,
    textAlignVertical: 'top',
    color: ui.colors.textStrong,
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoErrorWrap: {
    gap: 8,
  },
  referencePhotoCard: { width: '31%' },
  referencePhotoImage: { height: 86 },
  footer: { flexDirection: 'row', gap: 8 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  ghostButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#9fc2b9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostButtonText: { color: ui.colors.text, fontSize: 14, fontWeight: '700' },
  retryButton: {
    borderRadius: ui.radius.control,
    borderWidth: 1,
    borderColor: ui.colors.error,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff5f5',
  },
  retryButtonText: {
    color: ui.colors.error,
    fontWeight: '700',
  },
  guardBox: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff1f2',
    gap: 4,
  },
  guardTitle: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  guardDescription: {
    color: '#7f1d1d',
    fontSize: 13,
  },
});
