import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getMyAssignedWasteRequestDetail,
  measureAssignedWasteRequest,
} from '../api/driverWasteApi';
import { uploadImageFile } from '../api/uploadApi';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PhotoThumbnailCard } from '../components/PhotoThumbnailCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { ApiErrorResponse, DriverAssignedWasteRequest } from '../types/waste';
import { toWasteStatusLabel } from '../utils/wasteStatusLabel';

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
      setDetailError(toErrorMessage(error));
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
      setUploadError(toErrorMessage(error));
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
      setMeasureError(toErrorMessage(error));
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>배정 상세</Text>
            <Pressable style={styles.ghostButton} onPress={() => void loadAssignedRequestDetail()}>
              <Text style={styles.ghostButtonText}>새로고침</Text>
            </Pressable>
          </View>
          <Text style={styles.detailTitle}>{selectedTitle}</Text>
          {isLoadingDetail && <Text style={styles.meta}>상세를 불러오는 중..</Text>}
          {detailError && <Text style={styles.error}>{detailError}</Text>}

          {selectedRequest && (
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>주문번호: {formatOrderNoFromRequestId(selectedRequest.requestId)}</Text>
              <Text style={styles.detailText}>주소: {selectedRequest.address}</Text>
              <Text style={styles.detailText}>연락처: {selectedRequest.contactPhone}</Text>
              <Text style={styles.detailText}>요청사항: {selectedRequest.note || '-'}</Text>
              <Text style={styles.detailText}>상태: {toWasteStatusLabel(selectedRequest.status)}</Text>
              <Text style={styles.detailText}>배정일: {formatDate(selectedRequest.assignedAt)}</Text>
              <Text style={styles.detailText}>생성일: {formatDate(selectedRequest.createdAt)}</Text>
              <Text style={styles.detailText}>수정일: {formatDate(selectedRequest.updatedAt)}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>측정 완료 처리</Text>
          {!canMeasureSelected && (
            <Text style={styles.meta}>기사 배정 상태 요청만 측정 완료 처리할 수 있습니다.</Text>
          )}

          <Text style={styles.label}>무게(kg)</Text>
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
            <Text style={styles.label}>업로드 사진 ({photoUrls.length})</Text>
            <Pressable
              style={[styles.ghostButton, (!canMeasureSelected || isUploadingPhoto) && styles.buttonDisabled]}
              onPress={() => void handlePickAndUploadPhoto()}
              disabled={!canMeasureSelected || isUploadingPhoto}
            >
              <Text style={styles.ghostButtonText}>{isUploadingPhoto ? '업로드 중..' : '사진 선택/업로드'}</Text>
            </Pressable>
          </View>

          {uploadError && <Text style={styles.error}>{uploadError}</Text>}

          {photoUrls.length > 0 && (
            <View style={styles.photoGrid}>
              {photoUrls.map((url, index) => (
                <PhotoThumbnailCard
                  key={`${url}-${index}`}
                  photoUrl={url}
                  label={`사진 ${index + 1}`}
                  onPress={() => setPreviewPhotoUrl(url)}
                  onRemove={() => handleRemovePhoto(index)}
                />
              ))}
            </View>
          )}

          {measureError && <Text style={styles.error}>{measureError}</Text>}
          <Pressable
            style={[styles.button, (!canMeasureSelected || isMeasuring || isUploadingPhoto) && styles.buttonDisabled]}
            onPress={() => void handleMeasureComplete()}
            disabled={!canMeasureSelected || isMeasuring || isUploadingPhoto}
          >
            <Text style={styles.buttonText}>{isMeasuring ? '측정 완료 처리 중..' : '측정 완료 처리'}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <PhotoPreviewModal photoUrl={previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: ui.colors.screen,
    gap: 12,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  meta: {
    fontSize: 13,
    color: ui.colors.text,
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
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
