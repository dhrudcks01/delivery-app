import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  assignWasteRequestForOps,
  getDriverAssignmentCandidatesForOps,
  getOpsWasteRequestDetail,
} from '../api/opsAdminWasteApi';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PhotoThumbnailCard } from '../components/PhotoThumbnailCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { DriverAssignmentCandidate, OpsWasteRequestDetail } from '../types/opsAdmin';
import { ApiErrorResponse } from '../types/waste';
import { toWasteStatusLabel } from '../utils/wasteStatusLabel';

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      return '권한이 없습니다. OPS_ADMIN 권한을 확인해 주세요.';
    }
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

function formatAmount(amount: number | null): string {
  if (amount === null) {
    return '미정';
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function OpsWasteRequestDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OpsWasteRequestDetail'>>();
  const { requestId } = route.params;

  const [selectedWasteRequest, setSelectedWasteRequest] = useState<OpsWasteRequestDetail | null>(null);
  const [isLoadingWasteDetail, setIsLoadingWasteDetail] = useState(false);
  const [wasteDetailError, setWasteDetailError] = useState<string | null>(null);
  const [driverCandidateQuery, setDriverCandidateQuery] = useState('');
  const [driverCandidates, setDriverCandidates] = useState<DriverAssignmentCandidate[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [isLoadingDriverCandidates, setIsLoadingDriverCandidates] = useState(false);
  const [driverCandidateError, setDriverCandidateError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const referencePhotos = useMemo(
    () => selectedWasteRequest?.photos.filter((photo) => photo.type === 'REFERENCE') ?? [],
    [selectedWasteRequest],
  );
  const driverPhotos = useMemo(
    () => selectedWasteRequest?.photos.filter((photo) => photo.type !== 'REFERENCE') ?? [],
    [selectedWasteRequest],
  );
  const isReassignMode = selectedWasteRequest?.status === 'ASSIGNED' && selectedWasteRequest.driverId !== null;

  const loadWasteRequestDetail = useCallback(async () => {
    setIsLoadingWasteDetail(true);
    setWasteDetailError(null);
    try {
      const response = await getOpsWasteRequestDetail(requestId);
      setSelectedWasteRequest(response);
      setSelectedDriverId((current) => current ?? response.driverId ?? null);
    } catch (error) {
      setWasteDetailError(toErrorMessage(error));
      setSelectedWasteRequest(null);
    } finally {
      setIsLoadingWasteDetail(false);
    }
  }, [requestId]);

  const loadDriverCandidates = useCallback(async () => {
    setIsLoadingDriverCandidates(true);
    setDriverCandidateError(null);
    try {
      const response = await getDriverAssignmentCandidatesForOps({
        query: driverCandidateQuery.trim() || undefined,
        page: 0,
        size: 20,
      });
      setDriverCandidates(response.content);
      setSelectedDriverId((current) => {
        if (current && response.content.some((item) => item.driverId === current)) {
          return current;
        }
        return response.content[0]?.driverId ?? selectedWasteRequest?.driverId ?? null;
      });
    } catch (error) {
      setDriverCandidates([]);
      setDriverCandidateError(toErrorMessage(error));
    } finally {
      setIsLoadingDriverCandidates(false);
    }
  }, [driverCandidateQuery, selectedWasteRequest?.driverId]);

  const handleAssignWasteRequest = async () => {
    if (!selectedWasteRequest) {
      setAssignError('요청 상세를 먼저 불러와 주세요.');
      return;
    }
    if (!selectedDriverId) {
      setAssignError('배정할 기사를 검색 후 선택해 주세요.');
      return;
    }
    if (selectedWasteRequest.driverId === selectedDriverId) {
      setAssignError('이미 동일 기사로 배정되어 있습니다. 다른 기사를 선택해 주세요.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    setAssignMessage(null);

    try {
      const response = await assignWasteRequestForOps(selectedWasteRequest.id, { driverId: selectedDriverId });
      setAssignMessage(
        isReassignMode
          ? `요청 #${response.id} 기사 재배정 완료`
          : `요청 #${response.id} 기사 배정 완료`,
      );
      await loadWasteRequestDetail();
    } catch (error) {
      setAssignError(toErrorMessage(error));
    } finally {
      setIsAssigning(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadWasteRequestDetail();
      void loadDriverCandidates();
    }, [loadWasteRequestDetail, loadDriverCandidates]),
  );

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>수거 요청 상세</Text>
            <Pressable style={styles.ghostButton} onPress={() => void loadWasteRequestDetail()}>
              <Text style={styles.ghostButtonText}>새로고침</Text>
            </Pressable>
          </View>
          {isLoadingWasteDetail && <Text style={styles.meta}>요청 상세 로딩 중..</Text>}
          {wasteDetailError && <Text style={styles.error}>{wasteDetailError}</Text>}
          {!selectedWasteRequest && !isLoadingWasteDetail && (
            <Text style={styles.meta}>요청 정보를 불러오지 못했습니다.</Text>
          )}
          {selectedWasteRequest && (
            <View style={styles.resultBox}>
              <Text style={styles.detailText}>요청 ID: {selectedWasteRequest.id}</Text>
              <Text style={styles.detailText}>주문번호: {selectedWasteRequest.orderNo || '-'}</Text>
              <Text style={styles.detailText}>상태: {toWasteStatusLabel(selectedWasteRequest.status)}</Text>
              <Text style={styles.detailText}>주소: {selectedWasteRequest.address}</Text>
              <Text style={styles.detailText}>연락처: {selectedWasteRequest.contactPhone}</Text>
              <Text style={styles.detailText}>배출품목: {selectedWasteRequest.disposalItems.join(', ') || '-'}</Text>
              <Text style={styles.detailText}>수거비닐 수량: {selectedWasteRequest.bagCount}개</Text>
              <Text style={styles.detailText}>측정무게: {selectedWasteRequest.measuredWeightKg ?? '미측정'}</Text>
              <Text style={styles.detailText}>측정시각: {formatDate(selectedWasteRequest.measuredAt)}</Text>
              <Text style={styles.detailText}>결제예정금액: {formatAmount(selectedWasteRequest.finalAmount)}</Text>
              <Text style={styles.detailText}>현재 배정 기사 ID: {selectedWasteRequest.driverId ?? '-'}</Text>
              <Text style={styles.detailText}>배정시각: {formatDate(selectedWasteRequest.assignedAt)}</Text>
            </View>
          )}
        </View>

        {selectedWasteRequest && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>참고 사진 ({referencePhotos.length})</Text>
              {referencePhotos.length === 0 && <Text style={styles.meta}>등록된 참고 사진이 없습니다.</Text>}
              {referencePhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {referencePhotos.map((photo, index) => (
                    <PhotoThumbnailCard
                      key={`ref-${photo.url}-${index}`}
                      photoUrl={photo.url}
                      label={`REFERENCE ${index + 1}`}
                      onPress={() => setPreviewPhotoUrl(photo.url)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>기사 사진 ({driverPhotos.length})</Text>
              {driverPhotos.length === 0 && <Text style={styles.meta}>등록된 기사 사진이 없습니다.</Text>}
              {driverPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {driverPhotos.map((photo, index) => (
                    <PhotoThumbnailCard
                      key={`driver-${photo.url}-${index}`}
                      photoUrl={photo.url}
                      label={`${photo.type || 'PHOTO'} ${index + 1}`}
                      onPress={() => setPreviewPhotoUrl(photo.url)}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>기사 {isReassignMode ? '재배정' : '배정'}</Text>
          <Text style={styles.meta}>ASSIGNED 상태에서는 재배정, REQUESTED 상태에서는 신규 배정을 수행합니다.</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.queryInput]}
              value={driverCandidateQuery}
              onChangeText={setDriverCandidateQuery}
              placeholder="기사 검색(이름/아이디)"
              placeholderTextColor="#94a3b8"
              editable={!isLoadingDriverCandidates}
            />
            <Pressable
              style={[styles.ghostButton, isLoadingDriverCandidates && styles.buttonDisabled]}
              onPress={() => void loadDriverCandidates()}
              disabled={isLoadingDriverCandidates}
            >
              <Text style={styles.ghostButtonText}>검색</Text>
            </Pressable>
          </View>
          {isLoadingDriverCandidates && <Text style={styles.meta}>기사 후보 조회 중..</Text>}
          {driverCandidateError && <Text style={styles.error}>{driverCandidateError}</Text>}
          {driverCandidates.map((candidate) => (
            <Pressable
              key={candidate.driverId}
              style={[styles.listItem, selectedDriverId === candidate.driverId && styles.listItemActive]}
              onPress={() => {
                setSelectedDriverId(candidate.driverId);
                setAssignError(null);
              }}
            >
              <Text style={styles.listTitle}>기사 #{candidate.driverId}</Text>
              <Text style={styles.listSub}>이름: {candidate.name}</Text>
              <Text style={styles.listSub}>아이디: {candidate.loginId}</Text>
            </Pressable>
          ))}
          {!isLoadingDriverCandidates && driverCandidates.length === 0 && (
            <Text style={styles.meta}>검색 결과가 없습니다.</Text>
          )}
          {assignMessage && <Text style={styles.success}>{assignMessage}</Text>}
          {assignError && <Text style={styles.error}>{assignError}</Text>}
          <Pressable
            style={[styles.button, isAssigning && styles.buttonDisabled]}
            onPress={() => void handleAssignWasteRequest()}
            disabled={isAssigning}
          >
            <Text style={styles.buttonText}>
              {isAssigning ? '처리 중..' : isReassignMode ? '기사 재배정' : '기사 배정'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <PhotoPreviewModal photoUrl={previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 28,
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
  meta: {
    fontSize: 13,
    color: ui.colors.text,
  },
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
  success: {
    color: ui.colors.success,
    fontSize: 13,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.textStrong,
  },
  queryInput: {
    flex: 1,
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
    gap: 4,
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
  resultBox: {
    gap: 4,
  },
  detailText: {
    color: ui.colors.textStrong,
    fontSize: 13,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
