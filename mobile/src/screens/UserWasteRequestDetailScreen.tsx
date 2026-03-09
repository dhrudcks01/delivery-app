import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cancelMyWasteRequest, getMyWasteRequestDetail } from '../api/wasteApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PhotoThumbnailCard } from '../components/PhotoThumbnailCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ApiErrorResponse, WasteRequestDetail } from '../types/waste';
import {
  toUserWasteStatusLabel,
  toUserWasteStatusLabelOrStart,
} from '../utils/wasteStatusLabel';

const STATUS_FLOW = ['REQUESTED', 'ASSIGNED', 'MEASURED', 'COMPLETED'] as const;
const DISPOSAL_ITEM_LABEL: Record<string, string> = {
  GENERAL: '혼합 쓰레기',
  BOX: '택배 박스',
};

type StepState = 'done' | 'current' | 'upcoming';

const colors = {
  primary: '#2563EB',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  textStrong: '#0F172A',
  text: '#334155',
  caption: '#64748B',
};

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '요청 처리 중 오류가 발생했습니다.';
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function formatDate(dateTime: string | null | undefined): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

function formatWeight(weight: number | null): string {
  if (weight === null) {
    return '미측정';
  }
  return `${weight} kg`;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) {
    return '미정';
  }
  if (currency === 'KRW') {
    return `${amount.toLocaleString('ko-KR')}원`;
  }
  return `${amount.toLocaleString('ko-KR')} ${currency}`;
}

function toDisposalItemLabel(item: string): string {
  return DISPOSAL_ITEM_LABEL[item] ?? item;
}

function resolveStepState(stepStatus: string, currentStatus: string | null, passedStatuses: string[]): StepState {
  if (currentStatus === stepStatus) {
    return 'current';
  }

  const currentIndex = STATUS_FLOW.indexOf(currentStatus as (typeof STATUS_FLOW)[number]);
  const stepIndex = STATUS_FLOW.indexOf(stepStatus as (typeof STATUS_FLOW)[number]);

  if (stepIndex === -1) {
    return 'upcoming';
  }

  if (currentIndex !== -1) {
    return stepIndex < currentIndex ? 'done' : 'upcoming';
  }

  return passedStatuses.includes(stepStatus) ? 'done' : 'upcoming';
}

function getStatusBadgeStyle(status: string) {
  if (status === 'COMPLETED' || status === 'PAID') {
    return { container: styles.badgeSuccess, text: styles.badgeSuccessText };
  }
  if (status === 'PAYMENT_FAILED' || status === 'CANCELED') {
    return { container: styles.badgeError, text: styles.badgeErrorText };
  }
  return { container: styles.badgeWarning, text: styles.badgeWarningText };
}

function InfoRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>{value}</Text>
    </View>
  );
}

export function UserWasteRequestDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'WasteRequestDetail'>>();
  const { requestId, orderNo: routeOrderNo } = route.params;

  const [detail, setDetail] = useState<WasteRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const canCancel = detail?.status === 'REQUESTED';
  const displayOrderNo = detail?.orderNo ?? routeOrderNo ?? '-';
  const paymentFailureNotice =
    detail?.status === 'PAYMENT_FAILED'
      ? '결제가 실패했습니다. 결제수단을 확인한 뒤 다시 시도해 주세요.'
      : null;

  const passedStatuses = useMemo(() => {
    if (!detail) {
      return [];
    }
    const ordered = detail.statusTimeline.map((item) => item.toStatus);
    if (detail.status) {
      ordered.push(detail.status);
    }
    return Array.from(new Set(ordered));
  }, [detail]);

  const disposalItems = useMemo(() => detail?.disposalItems ?? [], [detail]);
  const referencePhotos = useMemo(
    () => detail?.photos.filter((photo) => photo.type === 'REFERENCE') ?? [],
    [detail],
  );
  const driverPhotos = useMemo(
    () => detail?.photos.filter((photo) => photo.type !== 'REFERENCE') ?? [],
    [detail],
  );

  const statusBadgeStyle = useMemo(
    () => getStatusBadgeStyle(detail?.status ?? 'REQUESTED'),
    [detail?.status],
  );

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getMyWasteRequestDetail(requestId);
      setDetail(response);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
      setDetail(null);
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  const handleCancel = useCallback(async () => {
    if (!canCancel || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      await cancelMyWasteRequest(requestId);
      await loadDetail();
    } catch (cancelError) {
      setError(toErrorMessage(cancelError));
    } finally {
      setIsCancelling(false);
    }
  }, [canCancel, isCancelling, loadDetail, requestId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  return (
    <>
      <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>수거요청 상세</Text>
            <Text style={styles.caption}>요청 ID: {requestId}</Text>
            <Text style={styles.caption}>주문번호: {displayOrderNo}</Text>
          </View>
          <Pressable
            style={[styles.secondaryButtonCompact, isLoading && styles.buttonDisabled]}
            onPress={() => void loadDetail()}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonCompactText}>{isLoading ? '불러오는 중...' : '새로고침'}</Text>
          </Pressable>
        </View>

        {isLoading && !detail && (
          <View style={styles.loadingGroup}>
            <View style={styles.loadingCard}>
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineLong} />
              <View style={styles.skeletonLineLong} />
            </View>
            <View style={styles.loadingCard}>
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineLong} />
              <View style={styles.skeletonLineLong} />
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {error && (
          <Pressable style={styles.secondaryButton} onPress={() => void loadDetail()}>
            <Text style={styles.secondaryButtonText}>다시 시도</Text>
          </Pressable>
        )}

        {detail && (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>요약 정보</Text>
                <View style={[styles.statusBadge, statusBadgeStyle.container]}>
                  <Text style={[styles.statusBadgeText, statusBadgeStyle.text]}>
                    {toUserWasteStatusLabel(detail.status)}
                  </Text>
                </View>
              </View>
              <InfoRow label="주문번호" value={displayOrderNo} />
              <InfoRow label="생성일시" value={formatDate(detail.createdAt)} />
              <InfoRow label="수정일시" value={formatDate(detail.updatedAt)} />
              <InfoRow label="주소" value={detail.address} multiline />
              <InfoRow label="연락처" value={detail.contactPhone} />
              <InfoRow label="요청사항" value={detail.note || '-'} multiline />

              {paymentFailureNotice && (
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>결제 상태 안내</Text>
                  <Text style={styles.warningText}>{paymentFailureNotice}</Text>
                </View>
              )}

              <Pressable
                style={[
                  styles.primaryButton,
                  !canCancel && styles.primaryButtonMuted,
                  (isCancelling || !canCancel) && styles.buttonDisabled,
                ]}
                onPress={() => void handleCancel()}
                disabled={!canCancel || isCancelling}
              >
                <Text style={styles.primaryButtonText}>
                  {isCancelling ? '취소 처리 중...' : canCancel ? '요청 취소' : '취소 불가 상태'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>배출정보</Text>
              <InfoRow label="수거비닐 수량" value={`${detail.bagCount}개`} />
              {disposalItems.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>[]</Text>
                  <Text style={styles.emptyTitle}>배출 품목 정보가 없습니다</Text>
                  <Text style={styles.emptyDescription}>신청 시 선택된 품목이 이곳에 표시됩니다.</Text>
                </View>
              )}
              {disposalItems.length > 0 && (
                <View style={styles.itemsWrap}>
                  {disposalItems.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.itemChip}>
                      <Text style={styles.itemChipText}>{toDisposalItemLabel(item)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>수거정보</Text>
              <InfoRow label="측정무게" value={formatWeight(detail.measuredWeightKg)} />
              <InfoRow label="측정시각" value={formatDate(detail.measuredAt)} />
              <InfoRow label="담당기사 ID" value={detail.driverId ? String(detail.driverId) : '-'} />
              <InfoRow label="배정시각" value={formatDate(detail.assignedAt)} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>결제정보</Text>
              <InfoRow label="통화" value={detail.currency} />
              <InfoRow label="결제예정금액" value={formatAmount(detail.finalAmount, detail.currency)} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>상태 타임라인</Text>
              <View style={styles.timelineStepWrap}>
                {STATUS_FLOW.map((status) => {
                  const state = resolveStepState(status, detail.status, passedStatuses);
                  return (
                    <View key={status} style={styles.stepRow}>
                      <View
                        style={[
                          styles.stepDot,
                          state === 'done' && styles.stepDotDone,
                          state === 'current' && styles.stepDotCurrent,
                        ]}
                      />
                      <Text
                        style={[
                          styles.stepText,
                          state === 'done' && styles.stepTextDone,
                          state === 'current' && styles.stepTextCurrent,
                        ]}
                      >
                        {toUserWasteStatusLabel(status)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {detail.statusTimeline.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>[]</Text>
                  <Text style={styles.emptyTitle}>상태 이력이 없습니다</Text>
                  <Text style={styles.emptyDescription}>상태 변경 이력이 생성되면 여기에 표시됩니다.</Text>
                </View>
              )}

              {detail.statusTimeline.length > 0 && (
                <View style={styles.timelineLogBox}>
                  {detail.statusTimeline.map((timeline, index) => (
                    <Text key={`${timeline.toStatus}-${timeline.at}-${index}`} style={styles.timelineLogText}>
                      {`${toUserWasteStatusLabelOrStart(timeline.fromStatus)} -> ${toUserWasteStatusLabel(timeline.toStatus)} (${formatDate(timeline.at)})`}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>참고 사진</Text>
              {referencePhotos.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>[]</Text>
                  <Text style={styles.emptyTitle}>등록된 참고 사진이 없습니다</Text>
                  <Text style={styles.emptyDescription}>사용자가 업로드한 참고 사진이 여기에 표시됩니다.</Text>
                </View>
              )}
              {referencePhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {referencePhotos.map((photo, index) => (
                    <PhotoThumbnailCard
                      key={`reference-${photo.url}-${index}`}
                      photoUrl={photo.url}
                      label={`참고사진 ${index + 1}`}
                      containerStyle={styles.photoCard}
                      imageStyle={styles.photoImage}
                      onPress={() => setSelectedPhotoUrl(photo.url)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>기사 사진</Text>
              {driverPhotos.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>[]</Text>
                  <Text style={styles.emptyTitle}>등록된 기사 사진이 없습니다</Text>
                  <Text style={styles.emptyDescription}>기사님이 업로드한 사진이 여기에 표시됩니다.</Text>
                </View>
              )}
              {driverPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {driverPhotos.map((photo, index) => (
                    <PhotoThumbnailCard
                      key={`driver-${photo.url}-${index}`}
                      photoUrl={photo.url}
                      label={`기사사진 ${index + 1}`}
                      containerStyle={styles.photoCard}
                      imageStyle={styles.photoImage}
                      onPress={() => setSelectedPhotoUrl(photo.url)}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </KeyboardAwareScrollScreen>
      <PhotoPreviewModal photoUrl={selectedPhotoUrl} onClose={() => setSelectedPhotoUrl(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
    gap: 24,
  },
  headerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  headerTextWrap: {
    gap: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textStrong,
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
  loadingGroup: {
    gap: 12,
  },
  loadingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 10,
  },
  skeletonLineShort: {
    height: 10,
    width: '48%',
    borderRadius: 999,
    backgroundColor: '#dbe2ea',
  },
  skeletonLineLong: {
    height: 10,
    width: '80%',
    borderRadius: 999,
    backgroundColor: '#dbe2ea',
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
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: colors.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
  },
  infoValueMultiline: {
    lineHeight: 21,
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
  primaryButtonMuted: {
    backgroundColor: '#64748b',
  },
  buttonDisabled: {
    opacity: 0.7,
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
    alignSelf: 'flex-start',
  },
  secondaryButtonCompactText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  itemChipText: {
    color: colors.textStrong,
    fontSize: 12,
    fontWeight: '600',
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
    color: colors.caption,
    fontSize: 16,
  },
  emptyTitle: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDescription: {
    color: colors.caption,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  timelineStepWrap: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
  },
  stepDotDone: {
    backgroundColor: '#16a34a',
  },
  stepDotCurrent: {
    backgroundColor: '#0ea5e9',
  },
  stepText: {
    color: colors.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  stepTextDone: {
    color: '#166534',
  },
  stepTextCurrent: {
    color: '#0369a1',
    fontWeight: '700',
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
});
