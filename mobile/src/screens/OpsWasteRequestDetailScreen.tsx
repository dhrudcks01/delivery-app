import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  assignWasteRequestForOps,
  getDriverAssignmentCandidatesForOps,
  getOpsWasteRequestDetail,
} from '../api/opsAdminWasteApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PhotoThumbnailCard } from '../components/PhotoThumbnailCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { DriverAssignmentCandidate, OpsWasteRequestDetail } from '../types/opsAdmin';
import { ApiErrorResponse } from '../types/waste';
import { toWasteStatusLabel, toWasteStatusLabelOrStart } from '../utils/wasteStatusLabel';

const colors = ui.colors;

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

function formatWeight(weight: number | null): string {
  if (weight === null) {
    return '미측정';
  }
  return `${weight} kg`;
}

function getStatusBadgeStyle(status: string) {
  if (status === 'COMPLETED' || status === 'PAID' || status === 'PICKED_UP') {
    return { container: styles.statusBadgeSuccess, text: styles.statusBadgeSuccessText };
  }
  if (status === 'PAYMENT_FAILED' || status === 'CANCELED') {
    return { container: styles.statusBadgeError, text: styles.statusBadgeErrorText };
  }
  if (status === 'REQUESTED' || status === 'ASSIGNED' || status === 'PAYMENT_PENDING') {
    return { container: styles.statusBadgeWarning, text: styles.statusBadgeWarningText };
  }
  return { container: styles.statusBadgeNeutral, text: styles.statusBadgeNeutralText };
}

function InfoRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>{value}</Text>
    </View>
  );
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
  const statusBadgeStyle = useMemo(
    () => getStatusBadgeStyle(selectedWasteRequest?.status ?? 'REQUESTED'),
    [selectedWasteRequest?.status],
  );

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
      <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <View style={styles.screenContainer}>
          <View style={styles.headerCard}>
            <Text style={styles.badge}>OPS_ADMIN 상세</Text>
            <Text style={styles.title}>수거 요청 상세</Text>
            <Text style={styles.description}>요청 #{requestId}의 배정/재배정 상태를 관리합니다.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>요청 정보</Text>
              <Pressable
                style={[styles.secondaryButtonCompact, isLoadingWasteDetail && styles.buttonDisabled]}
                onPress={() => void loadWasteRequestDetail()}
                disabled={isLoadingWasteDetail}
              >
                <Text style={styles.secondaryButtonCompactText}>
                  {isLoadingWasteDetail ? '새로고침 중...' : '새로고침'}
                </Text>
              </Pressable>
            </View>

            {isLoadingWasteDetail && !selectedWasteRequest && (
              <View style={styles.loadingGroup}>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>요청 상세 정보를 불러오는 중입니다...</Text>
                </View>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonLineShort} />
                  <View style={styles.skeletonLineLong} />
                  <View style={styles.skeletonLineLong} />
                </View>
              </View>
            )}

            {wasteDetailError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{wasteDetailError}</Text>
                <Pressable style={styles.retryButton} onPress={() => void loadWasteRequestDetail()}>
                  <Text style={styles.retryButtonText}>다시 시도</Text>
                </Pressable>
              </View>
            )}

            {!isLoadingWasteDetail && !wasteDetailError && !selectedWasteRequest && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>[]</Text>
                <Text style={styles.emptyTitle}>요청 상세를 찾을 수 없습니다</Text>
                <Text style={styles.emptyDescription}>잠시 후 다시 시도하거나 목록에서 요청을 다시 선택해 주세요.</Text>
              </View>
            )}

            {selectedWasteRequest && (
              <View style={styles.infoGroup}>
                <View style={styles.rowBetween}>
                  <Text style={styles.infoLabel}>상태</Text>
                  <View style={[styles.statusBadge, statusBadgeStyle.container]}>
                    <Text style={[styles.statusBadgeText, statusBadgeStyle.text]}>
                      {toWasteStatusLabel(selectedWasteRequest.status)}
                    </Text>
                  </View>
                </View>
                <InfoRow label="요청 ID" value={String(selectedWasteRequest.id)} />
                <InfoRow label="주문번호" value={selectedWasteRequest.orderNo || '-'} />
                <InfoRow label="주소" value={selectedWasteRequest.address} multiline />
                <InfoRow label="연락처" value={selectedWasteRequest.contactPhone} />
                <InfoRow
                  label="배출 품목"
                  value={selectedWasteRequest.disposalItems.length > 0 ? selectedWasteRequest.disposalItems.join(', ') : '-'}
                  multiline
                />
                <InfoRow label="수거비닐 수량" value={`${selectedWasteRequest.bagCount}개`} />
                <InfoRow label="측정 무게" value={formatWeight(selectedWasteRequest.measuredWeightKg)} />
                <InfoRow label="측정 시각" value={formatDate(selectedWasteRequest.measuredAt)} />
                <InfoRow label="결제 예정 금액" value={formatAmount(selectedWasteRequest.finalAmount)} />
                <InfoRow label="현재 배정 기사 ID" value={selectedWasteRequest.driverId?.toString() ?? '-'} />
                <InfoRow label="배정 시각" value={formatDate(selectedWasteRequest.assignedAt)} />
                <InfoRow label="생성일시" value={formatDate(selectedWasteRequest.createdAt)} />
                <InfoRow label="수정일시" value={formatDate(selectedWasteRequest.updatedAt)} />
              </View>
            )}
          </View>

          {selectedWasteRequest && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>상태 로그</Text>
              {selectedWasteRequest.statusTimeline.length === 0 ? (
                <View style={styles.emptyInlineCard}>
                  <Text style={styles.caption}>등록된 상태 로그가 없습니다.</Text>
                </View>
              ) : (
                <View style={styles.timelineLogBox}>
                  {selectedWasteRequest.statusTimeline.map((timeline, index) => (
                    <Text key={`${timeline.toStatus}-${timeline.at}-${index}`} style={styles.timelineLogText}>
                      {`${toWasteStatusLabelOrStart(timeline.fromStatus)} -> ${toWasteStatusLabel(timeline.toStatus)} (${formatDate(timeline.at)})`}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {selectedWasteRequest && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>참고 사진 ({referencePhotos.length})</Text>
                {referencePhotos.length === 0 ? (
                  <View style={styles.emptyInlineCard}>
                    <Text style={styles.caption}>등록된 참고 사진이 없습니다.</Text>
                  </View>
                ) : (
                  <View style={styles.photoGrid}>
                    {referencePhotos.map((photo, index) => (
                      <PhotoThumbnailCard
                        key={`ref-${photo.url}-${index}`}
                        photoUrl={photo.url}
                        label={`참고사진 ${index + 1}`}
                        containerStyle={styles.photoCard}
                        imageStyle={styles.photoImage}
                        onPress={() => setPreviewPhotoUrl(photo.url)}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>기사 사진 ({driverPhotos.length})</Text>
                {driverPhotos.length === 0 ? (
                  <View style={styles.emptyInlineCard}>
                    <Text style={styles.caption}>등록된 기사 사진이 없습니다.</Text>
                  </View>
                ) : (
                  <View style={styles.photoGrid}>
                    {driverPhotos.map((photo, index) => (
                      <PhotoThumbnailCard
                        key={`driver-${photo.url}-${index}`}
                        photoUrl={photo.url}
                        label={`${photo.type || 'PHOTO'} ${index + 1}`}
                        containerStyle={styles.photoCard}
                        imageStyle={styles.photoImage}
                        onPress={() => setPreviewPhotoUrl(photo.url)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>기사 {isReassignMode ? '재배정' : '배정'}</Text>
            <Text style={styles.caption}>ASSIGNED 상태에서는 재배정, REQUESTED 상태에서는 신규 배정을 수행합니다.</Text>

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
                style={[styles.secondaryButtonCompact, isLoadingDriverCandidates && styles.buttonDisabled]}
                onPress={() => void loadDriverCandidates()}
                disabled={isLoadingDriverCandidates}
              >
                <Text style={styles.secondaryButtonCompactText}>검색</Text>
              </Pressable>
            </View>

            {isLoadingDriverCandidates && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>기사 후보를 불러오는 중입니다...</Text>
              </View>
            )}

            {!isLoadingDriverCandidates && driverCandidateError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{driverCandidateError}</Text>
                <Pressable style={styles.retryButton} onPress={() => void loadDriverCandidates()}>
                  <Text style={styles.retryButtonText}>다시 시도</Text>
                </Pressable>
              </View>
            )}

            {!isLoadingDriverCandidates && !driverCandidateError && driverCandidates.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>[]</Text>
                <Text style={styles.emptyTitle}>검색 결과가 없습니다</Text>
                <Text style={styles.emptyDescription}>이름 또는 아이디를 변경해 다시 검색해 주세요.</Text>
              </View>
            )}

            {!isLoadingDriverCandidates && !driverCandidateError && driverCandidates.length > 0 && (
              <View style={styles.listWrap}>
                {driverCandidates.map((candidate) => (
                  <Pressable
                    key={candidate.driverId}
                    style={[
                      styles.listItem,
                      selectedDriverId === candidate.driverId && styles.listItemActive,
                    ]}
                    onPress={() => {
                      setSelectedDriverId(candidate.driverId);
                      setAssignError(null);
                    }}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.listTitle}>기사 #{candidate.driverId}</Text>
                      {selectedDriverId === candidate.driverId && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>선택됨</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.listSub}>이름: {candidate.name}</Text>
                    <Text style={styles.listSub}>아이디: {candidate.loginId}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {assignMessage && (
              <View style={styles.successCard}>
                <Text style={styles.successText}>{assignMessage}</Text>
              </View>
            )}

            {assignError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{assignError}</Text>
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, isAssigning && styles.buttonDisabled]}
              onPress={() => void handleAssignWasteRequest()}
              disabled={isAssigning}
            >
              <Text style={styles.primaryButtonText}>
                {isAssigning ? '처리 중...' : isReassignMode ? '기사 재배정' : '기사 배정'}
              </Text>
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
  loadingGroup: {
    gap: 8,
  },
  loadingCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#1d4ed8',
    fontSize: 13,
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
    gap: 8,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: colors.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 18,
  },
  infoValueMultiline: {
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  queryInput: {
    flex: 1,
  },
  primaryButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonCompact: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonCompactText: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
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
  statusBadgeSuccess: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  statusBadgeSuccessText: {
    color: colors.success,
  },
  statusBadgeWarning: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  statusBadgeWarningText: {
    color: '#b45309',
  },
  statusBadgeError: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  statusBadgeErrorText: {
    color: colors.error,
  },
  statusBadgeNeutral: {
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  statusBadgeNeutralText: {
    color: colors.caption,
  },
  timelineLogBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  timelineLogText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
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
  emptyInlineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
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
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  successCard: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#ffffff',
  },
  listItemActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  selectedBadge: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  listTitle: {
    color: colors.textStrong,
    fontWeight: '700',
    fontSize: 14,
  },
  listSub: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCard: {
    width: '48%',
  },
  photoImage: {
    height: 104,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
