import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getMyAssignedWasteRequestDetail,
  measureAssignedWasteRequest,
} from '../api/driverWasteApi';
import { uploadImageFile } from '../api/uploadApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PhotoThumbnailCard } from '../components/PhotoThumbnailCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { DriverAssignedWasteRequest } from '../types/waste';
import { toApiErrorMessage } from '../utils/errorMessage';
import { getStatusBadgePalette, resolveWasteStatusBadgeTone } from '../utils/statusBadge';
import { toWasteStatusLabel } from '../utils/wasteStatusLabel';

const colors = ui.colors;
const ERROR_MESSAGE_OPTIONS = {
  defaultMessage: '요청 처리 중 오류가 발생했습니다.',
  timeoutMessage: '요청 처리 중 오류가 발생했습니다.',
  networkMessage: '요청 처리 중 오류가 발생했습니다.',
};

function formatDate(dateTime: string | null): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

function formatOrderNoFromRequestId(requestId: number): string {
  return `WR-${String(requestId).padStart(6, '0')}`;
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
    '사진 업로드를 위해 사진 접근 권한이 필요합니다. 설정에서 권한을 허용해 주세요.',
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

export function DriverAssignedRequestDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'DriverAssignedRequestDetail'>>();
  const { requestId } = route.params;

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DriverAssignedWasteRequest | null>(null);
  const [measuredWeightKgText, setMeasuredWeightKgText] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const canMeasureSelected = selectedRequest?.status === 'ASSIGNED';
  const statusBadgePalette = useMemo(
    () => getStatusBadgePalette(resolveWasteStatusBadgeTone(selectedRequest?.status ?? 'REQUESTED')),
    [selectedRequest?.status],
  );
  const selectedTitle = useMemo(() => {
    if (!selectedRequest) {
      return `요청 #${requestId}`;
    }
    return `요청 #${selectedRequest.requestId} (${toWasteStatusLabel(selectedRequest.status)})`;
  }, [requestId, selectedRequest]);

  const resetMeasureForm = () => {
    setMeasuredWeightKgText('');
    setPhotoUrls([]);
    setUploadError(null);
    setMeasureError(null);
  };

  const loadAssignedRequestDetail = useCallback(async () => {
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const detail = await getMyAssignedWasteRequestDetail(requestId);
      setSelectedRequest(detail);
    } catch (error) {
      setDetailError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
      setSelectedRequest(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [requestId]);

  const handlePickAndUploadPhoto = async () => {
    if (!selectedRequest || !canMeasureSelected) {
      return;
    }

    setUploadError(null);
    const hasPermission = await ensureImagePermission();
    if (!hasPermission) {
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (picked.canceled || picked.assets.length === 0) {
      return;
    }

    const selectedAsset = picked.assets[0];
    setIsUploadingPhoto(true);

    try {
      const uploadedUrl = await uploadImageFile(selectedAsset.uri, selectedAsset.fileName ?? undefined);
      setPhotoUrls((prev) => [...prev, uploadedUrl]);
    } catch (error) {
      setUploadError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMeasureComplete = async () => {
    if (!selectedRequest || !canMeasureSelected) {
      return;
    }

    setMeasureError(null);
    const parsedWeight = Number(measuredWeightKgText);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setMeasureError('무게(kg)는 0보다 큰 숫자로 입력해 주세요.');
      return;
    }
    if (photoUrls.length === 0) {
      setMeasureError('사진을 1장 이상 업로드해 주세요.');
      return;
    }

    setIsMeasuring(true);
    try {
      await measureAssignedWasteRequest(selectedRequest.requestId, {
        measuredWeightKg: parsedWeight,
        photoUrls,
      });
      resetMeasureForm();
      await loadAssignedRequestDetail();
    } catch (error) {
      setMeasureError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsMeasuring(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadAssignedRequestDetail();
    }, [loadAssignedRequestDetail]),
  );

  return (
    <>
      <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} includeTopInset keyboardShouldPersistTaps="handled">
        <View style={styles.screenContainer}>
          <View style={styles.headerCard}>
            <Text style={styles.badge}>DRIVER 상세</Text>
            <Text style={styles.title}>배정 상세</Text>
            <Text style={styles.description}>{selectedTitle}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>요청 정보</Text>
              <Pressable
                style={[styles.secondaryButtonCompact, isLoadingDetail && styles.buttonDisabled]}
                onPress={() => void loadAssignedRequestDetail()}
                disabled={isLoadingDetail}
              >
                <Text style={styles.secondaryButtonCompactText}>{isLoadingDetail ? '새로고침 중...' : '새로고침'}</Text>
              </Pressable>
            </View>

            {isLoadingDetail && (
              <View style={styles.loadingGroup}>
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingText}>상세 정보를 불러오는 중입니다...</Text>
                </View>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonLineShort} />
                  <View style={styles.skeletonLineLong} />
                  <View style={styles.skeletonLineLong} />
                </View>
              </View>
            )}

            {!isLoadingDetail && detailError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{detailError}</Text>
                <Pressable style={styles.retryButton} onPress={() => void loadAssignedRequestDetail()}>
                  <Text style={styles.retryButtonText}>다시 시도</Text>
                </Pressable>
              </View>
            )}

            {!isLoadingDetail && !detailError && !selectedRequest && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>[]</Text>
                <Text style={styles.emptyTitle}>요청 상세 정보를 찾을 수 없습니다</Text>
                <Text style={styles.emptyDescription}>잠시 후 다시 시도하거나 목록으로 돌아가 확인해 주세요.</Text>
              </View>
            )}

            {!isLoadingDetail && !detailError && selectedRequest && (
              <View style={styles.infoGroup}>
                <View style={styles.rowBetween}>
                  <Text style={styles.infoLabel}>상태</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusBadgePalette.backgroundColor,
                        borderColor: statusBadgePalette.backgroundColor,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusBadgePalette.textColor }]}>
                      {toWasteStatusLabel(selectedRequest.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.infoText}>주문번호: {formatOrderNoFromRequestId(selectedRequest.requestId)}</Text>
                <Text style={styles.infoText}>주소: {selectedRequest.address}</Text>
                <Text style={styles.infoText}>연락처: {selectedRequest.contactPhone || '-'}</Text>
                <Text style={styles.infoText}>요청사항: {selectedRequest.note || '-'}</Text>
                <Text style={styles.infoText}>배정일: {formatDate(selectedRequest.assignedAt)}</Text>
                <Text style={styles.infoText}>생성일: {formatDate(selectedRequest.createdAt)}</Text>
                <Text style={styles.infoText}>수정일: {formatDate(selectedRequest.updatedAt)}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>측정 완료 처리</Text>
            {!canMeasureSelected && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>기사 배정 상태 요청만 측정 완료 처리할 수 있습니다.</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>무게(kg)</Text>
            <TextInput
              style={styles.input}
              value={measuredWeightKgText}
              onChangeText={setMeasuredWeightKgText}
              keyboardType="decimal-pad"
              placeholder="예: 3.75"
              placeholderTextColor="#94a3b8"
              editable={Boolean(canMeasureSelected) && !isMeasuring}
            />

            <View style={styles.rowBetween}>
              <Text style={styles.fieldLabel}>업로드 사진 ({photoUrls.length})</Text>
              <Pressable
                style={[styles.secondaryButtonCompact, (!canMeasureSelected || isUploadingPhoto || isMeasuring) && styles.buttonDisabled]}
                onPress={() => void handlePickAndUploadPhoto()}
                disabled={!canMeasureSelected || isUploadingPhoto || isMeasuring}
              >
                <Text style={styles.secondaryButtonCompactText}>{isUploadingPhoto ? '업로드 중...' : '사진 선택/업로드'}</Text>
              </Pressable>
            </View>

            {isUploadingPhoto && (
              <View style={styles.progressCard}>
                <Text style={styles.progressText}>사진 업로드 중입니다...</Text>
              </View>
            )}

            {uploadError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{uploadError}</Text>
              </View>
            )}

            {photoUrls.length === 0 && (
              <View style={styles.emptyInlineCard}>
                <Text style={styles.caption}>업로드된 사진이 없습니다.</Text>
              </View>
            )}

            {photoUrls.length > 0 && (
              <View style={styles.photoGrid}>
                {photoUrls.map((url, index) => (
                  <PhotoThumbnailCard
                    key={`${url}-${index}`}
                    photoUrl={url}
                    label={`사진 ${index + 1}`}
                    onPress={() => setPreviewPhotoUrl(url)}
                    onRemove={() => handleRemovePhoto(index)}
                    containerStyle={styles.thumbnailCard}
                  />
                ))}
              </View>
            )}

            {measureError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{measureError}</Text>
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, (!canMeasureSelected || isMeasuring || isUploadingPhoto) && styles.buttonDisabled]}
              onPress={() => void handleMeasureComplete()}
              disabled={!canMeasureSelected || isMeasuring || isUploadingPhoto}
            >
              <Text style={styles.primaryButtonText}>{isMeasuring ? '측정 완료 처리 중...' : '측정 완료 처리'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollScreen>
      <PhotoPreviewModal photoUrl={previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  fieldLabel: {
    fontSize: 14,
    color: colors.textStrong,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    color: colors.caption,
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonCompactText: {
    fontSize: 13,
    color: colors.textStrong,
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
  },
  loadingText: {
    fontSize: 13,
    color: '#1d4ed8',
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
    width: '36%',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  skeletonLineLong: {
    height: 10,
    width: '82%',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  infoGroup: {
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.caption,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 13,
    color: colors.textStrong,
    lineHeight: 18,
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
  warningCard: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
  },
  warningText: {
    color: '#b45309',
    fontSize: 13,
    lineHeight: 18,
  },
  progressCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
  },
  progressText: {
    color: '#1d4ed8',
    fontSize: 13,
    lineHeight: 18,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    gap: 8,
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
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '700',
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
  emptyInlineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnailCard: {
    width: '48%',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
