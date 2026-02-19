import { AxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getMyAssignedWasteRequestDetail,
  getMyAssignedWasteRequests,
  measureAssignedWasteRequest,
} from '../api/driverWasteApi';
import { uploadImageFile } from '../api/uploadApi';
import { useAuth } from '../auth/AuthContext';
import { ApiErrorResponse, DriverAssignedWasteRequest } from '../types/waste';

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

export function DriverHomeScreen() {
  const { me, signOut } = useAuth();

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);

  const [assignedRequests, setAssignedRequests] = useState<DriverAssignedWasteRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DriverAssignedWasteRequest | null>(null);

  const [measuredWeightKgText, setMeasuredWeightKgText] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const selectedTitle = useMemo(() => {
    if (!selectedRequest) {
      return '상세 요청을 선택해 주세요.';
    }
    return `요청 #${selectedRequest.requestId} (${selectedRequest.status})`;
  }, [selectedRequest]);

  const canMeasureSelected = selectedRequest?.status === 'ASSIGNED';

  const resetMeasureForm = () => {
    setMeasuredWeightKgText('');
    setPhotoUrls([]);
    setUploadError(null);
    setMeasureError(null);
  };

  const refreshAssignedRequests = async () => {
    setIsLoadingList(true);
    setListError(null);

    try {
      const data = await getMyAssignedWasteRequests();
      setAssignedRequests(data);
      if (data.length === 0) {
        setSelectedRequestId(null);
        setSelectedRequest(null);
        resetMeasureForm();
      }
    } catch (error) {
      setListError(toErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadAssignedRequestDetail = async (requestId: number) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setSelectedRequestId(requestId);
    resetMeasureForm();

    try {
      const detail = await getMyAssignedWasteRequestDetail(requestId);
      setSelectedRequest(detail);
    } catch (error) {
      setDetailError(toErrorMessage(error));
      setSelectedRequest(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePickAndUploadPhoto = async () => {
    if (!selectedRequestId || !canMeasureSelected) {
      return;
    }

    setUploadError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError('사진 접근 권한이 필요합니다.');
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
    if (!selectedRequestId || !canMeasureSelected) {
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
      await measureAssignedWasteRequest(selectedRequestId, {
        measuredWeightKg: parsedWeight,
        photoUrls,
      });
      await refreshAssignedRequests();
      await loadAssignedRequestDetail(selectedRequestId);
    } catch (error) {
      setMeasureError(toErrorMessage(error));
    } finally {
      setIsMeasuring(false);
    }
  };

  useEffect(() => {
    refreshAssignedRequests();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>DRIVER 배정 요청</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>내 배정 목록</Text>
          <Pressable style={styles.ghostButton} onPress={refreshAssignedRequests}>
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>

        {isLoadingList && <Text style={styles.meta}>목록을 불러오는 중...</Text>}
        {listError && <Text style={styles.error}>{listError}</Text>}

        {assignedRequests.map((item) => (
          <Pressable
            key={item.requestId}
            style={[styles.listItem, selectedRequestId === item.requestId && styles.listItemActive]}
            onPress={() => loadAssignedRequestDetail(item.requestId)}
          >
            <Text style={styles.listTitle}>
              #{item.requestId} {item.status}
            </Text>
            <Text style={styles.listSub}>{item.address}</Text>
            <Text style={styles.listSub}>배정일: {formatDate(item.assignedAt)}</Text>
          </Pressable>
        ))}

        {!isLoadingList && assignedRequests.length === 0 && (
          <Text style={styles.meta}>배정된 요청이 없습니다.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>배정 상세</Text>
        <Text style={styles.detailTitle}>{selectedTitle}</Text>

        {isLoadingDetail && <Text style={styles.meta}>상세를 불러오는 중...</Text>}
        {detailError && <Text style={styles.error}>{detailError}</Text>}

        {selectedRequest && (
          <View style={styles.detailBox}>
            <Text style={styles.detailText}>주소: {selectedRequest.address}</Text>
            <Text style={styles.detailText}>연락처: {selectedRequest.contactPhone}</Text>
            <Text style={styles.detailText}>요청사항: {selectedRequest.note || '-'}</Text>
            <Text style={styles.detailText}>상태: {selectedRequest.status}</Text>
            <Text style={styles.detailText}>배정일: {formatDate(selectedRequest.assignedAt)}</Text>
            <Text style={styles.detailText}>생성일: {formatDate(selectedRequest.createdAt)}</Text>
            <Text style={styles.detailText}>수정일: {formatDate(selectedRequest.updatedAt)}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>측정 완료 처리</Text>
        {!canMeasureSelected && (
          <Text style={styles.meta}>ASSIGNED 상태 요청을 선택해야 측정 완료할 수 있습니다.</Text>
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
            onPress={handlePickAndUploadPhoto}
            disabled={!canMeasureSelected || isUploadingPhoto}
          >
            <Text style={styles.ghostButtonText}>{isUploadingPhoto ? '업로드 중...' : '사진 선택/업로드'}</Text>
          </Pressable>
        </View>

        {uploadError && <Text style={styles.error}>{uploadError}</Text>}

        {photoUrls.map((url, index) => (
          <View key={`${url}-${index}`} style={styles.photoRow}>
            <Text style={styles.photoText} numberOfLines={1}>
              {index + 1}. {url}
            </Text>
            <Pressable style={styles.removeButton} onPress={() => handleRemovePhoto(index)}>
              <Text style={styles.removeButtonText}>삭제</Text>
            </Pressable>
          </View>
        ))}

        {measureError && <Text style={styles.error}>{measureError}</Text>}

        <Pressable
          style={[
            styles.button,
            (!canMeasureSelected || isMeasuring || isUploadingPhoto) && styles.buttonDisabled,
          ]}
          onPress={handleMeasureComplete}
          disabled={!canMeasureSelected || isMeasuring || isUploadingPhoto}
        >
          <Text style={styles.buttonText}>{isMeasuring ? '측정 완료 처리 중...' : '측정 완료 처리'}</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.button, styles.logoutButton]} onPress={signOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
  label: {
    fontSize: 13,
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0f172a',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  photoText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
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
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    marginBottom: 20,
  },
});
