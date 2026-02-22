import { AxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getMyAssignedWasteRequestDetail,
  getMyAssignedWasteRequests,
  measureAssignedWasteRequest,
} from '../api/driverWasteApi';
import { createOpsAdminApplication } from '../api/roleApplicationApi';
import { uploadImageFile } from '../api/uploadApi';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';
import { ApiErrorResponse, DriverAssignedWasteRequest } from '../types/waste';

type DriverFilter = 'ALL' | 'ACTION_REQUIRED' | 'DONE';

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
  const [isSubmittingOpsAdminApplication, setIsSubmittingOpsAdminApplication] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);
  const [opsAdminApplicationError, setOpsAdminApplicationError] = useState<string | null>(null);

  const [assignedRequests, setAssignedRequests] = useState<DriverAssignedWasteRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DriverAssignedWasteRequest | null>(null);
  const [driverFilter, setDriverFilter] = useState<DriverFilter>('ACTION_REQUIRED');

  const [measuredWeightKgText, setMeasuredWeightKgText] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [opsAdminApplicationReason, setOpsAdminApplicationReason] = useState('');
  const [opsAdminApplicationResult, setOpsAdminApplicationResult] = useState<string | null>(null);

  const selectedTitle = useMemo(() => {
    if (!selectedRequest) {
      return '상세 요청을 선택해 주세요.';
    }
    return `요청 #${selectedRequest.requestId} (${selectedRequest.status})`;
  }, [selectedRequest]);

  const canMeasureSelected = selectedRequest?.status === 'ASSIGNED';
  const filteredRequests = useMemo(() => {
    if (driverFilter === 'ALL') {
      return assignedRequests;
    }
    if (driverFilter === 'ACTION_REQUIRED') {
      return assignedRequests.filter((request) => request.status === 'ASSIGNED');
    }
    return assignedRequests.filter((request) => request.status !== 'ASSIGNED');
  }, [assignedRequests, driverFilter]);

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

  const handleSubmitOpsAdminApplication = async () => {
    const reason = opsAdminApplicationReason.trim();
    if (!reason) {
      setOpsAdminApplicationError('신청 사유를 입력해 주세요.');
      return;
    }

    setIsSubmittingOpsAdminApplication(true);
    setOpsAdminApplicationError(null);
    setOpsAdminApplicationResult(null);

    try {
      const response = await createOpsAdminApplication(reason);
      setOpsAdminApplicationReason('');
      setOpsAdminApplicationResult(
        `OPS_ADMIN 권한 신청이 접수되었습니다. (신청 #${response.id}, 상태: ${response.status})`,
      );
    } catch (error) {
      setOpsAdminApplicationError(toErrorMessage(error));
    } finally {
      setIsSubmittingOpsAdminApplication(false);
    }
  };

  useEffect(() => {
    refreshAssignedRequests();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>DRIVER 전용 배정건</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>OPS_ADMIN 권한 신청</Text>
        <Text style={styles.meta}>DRIVER 계정은 운영 권한을 신청할 수 있습니다.</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={opsAdminApplicationReason}
          onChangeText={setOpsAdminApplicationReason}
          multiline
          placeholder="신청 사유를 입력해 주세요."
          placeholderTextColor="#94a3b8"
          editable={!isSubmittingOpsAdminApplication}
        />
        {opsAdminApplicationResult && <Text style={styles.success}>{opsAdminApplicationResult}</Text>}
        {opsAdminApplicationError && <Text style={styles.error}>{opsAdminApplicationError}</Text>}
        <Pressable
          style={[styles.button, isSubmittingOpsAdminApplication && styles.buttonDisabled]}
          onPress={handleSubmitOpsAdminApplication}
          disabled={isSubmittingOpsAdminApplication}
        >
          <Text style={styles.buttonText}>
            {isSubmittingOpsAdminApplication ? '신청 중...' : 'OPS_ADMIN 권한 신청'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>1단계. 배정 목록</Text>
          <Pressable style={styles.ghostButton} onPress={refreshAssignedRequests}>
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>상태 필터</Text>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, driverFilter === 'ACTION_REQUIRED' && styles.filterChipActive]}
            onPress={() => setDriverFilter('ACTION_REQUIRED')}
          >
            <Text style={[styles.filterChipText, driverFilter === 'ACTION_REQUIRED' && styles.filterChipTextActive]}>
              처리 필요
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, driverFilter === 'DONE' && styles.filterChipActive]}
            onPress={() => setDriverFilter('DONE')}
          >
            <Text style={[styles.filterChipText, driverFilter === 'DONE' && styles.filterChipTextActive]}>
              처리 완료
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, driverFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setDriverFilter('ALL')}
          >
            <Text style={[styles.filterChipText, driverFilter === 'ALL' && styles.filterChipTextActive]}>
              전체
            </Text>
          </Pressable>
        </View>

        {isLoadingList && <Text style={styles.meta}>목록을 불러오는 중...</Text>}
        {listError && <Text style={styles.error}>{listError}</Text>}

        {filteredRequests.map((item) => (
          <Pressable
            key={item.requestId}
            style={[styles.listItem, selectedRequestId === item.requestId && styles.listItemActive]}
            onPress={() => loadAssignedRequestDetail(item.requestId)}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.listTitle}>
                #{item.requestId} {item.status}
              </Text>
              {item.status === 'ASSIGNED' && <Text style={styles.priorityBadge}>우선 처리</Text>}
            </View>
            <Text style={styles.listSub}>{item.address}</Text>
            <Text style={styles.listSub}>배정일: {formatDate(item.assignedAt)}</Text>
          </Pressable>
        ))}

        {!isLoadingList && filteredRequests.length === 0 && (
          <Text style={styles.meta}>선택한 필터에 해당하는 배정 요청이 없습니다.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2단계. 배정 상세 확인</Text>
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
        <Text style={styles.cardTitle}>3단계. 측정 완료 처리</Text>
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  filterChipText: {
    color: ui.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: ui.colors.primary,
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
  priorityBadge: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  photoText: {
    flex: 1,
    color: ui.colors.text,
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
    color: ui.colors.error,
    fontSize: 13,
  },
  success: {
    color: ui.colors.success,
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
  logoutButton: {
    marginBottom: 20,
  },
});
