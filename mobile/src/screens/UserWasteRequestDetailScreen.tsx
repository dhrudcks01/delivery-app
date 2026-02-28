import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { cancelMyWasteRequest, getMyWasteRequestDetail } from '../api/wasteApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { ApiErrorResponse, WasteRequestDetail } from '../types/waste';
import { toWasteStatusLabel, toWasteStatusLabelOrStart } from '../utils/wasteStatusLabel';

const STATUS_FLOW = ['REQUESTED', 'ASSIGNED', 'MEASURED', 'PAYMENT_PENDING', 'PAID', 'COMPLETED'] as const;

type StepState = 'done' | 'current' | 'upcoming';

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>수거요청 상세</Text>
            <Text style={styles.meta}>요청 ID: {requestId}</Text>
          </View>
          <Pressable style={styles.ghostButton} onPress={() => void loadDetail()}>
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>

        <View style={styles.orderNoCard}>
          <Text style={styles.orderNoLabel}>주문번호</Text>
          <Text style={styles.orderNoValue}>{displayOrderNo}</Text>
        </View>

        {isLoading && !detail && <Text style={styles.meta}>상세를 불러오는 중입니다.</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        {detail && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>주문정보</Text>
              <InfoRow label="요청상태" value={toWasteStatusLabel(detail.status)} />
              <InfoRow label="주소" value={detail.address} />
              <InfoRow label="연락처" value={detail.contactPhone} />
              <InfoRow label="요청사항" value={detail.note || '-'} />
              <InfoRow label="생성일시" value={formatDate(detail.createdAt)} />
              <InfoRow label="수정일시" value={formatDate(detail.updatedAt)} />

              <Pressable
                style={[
                  styles.actionButton,
                  (!canCancel || isCancelling) && styles.actionButtonDisabled,
                  !canCancel && styles.actionButtonMuted,
                ]}
                onPress={() => void handleCancel()}
                disabled={!canCancel || isCancelling}
              >
                <Text style={styles.actionButtonText}>
                  {isCancelling ? '취소 처리 중..' : canCancel ? '요청 취소' : '취소 불가 상태'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>배출정보</Text>
              <InfoRow label="수거비닐 수량" value={`${detail.bagCount}개`} />
              {disposalItems.length === 0 && <Text style={styles.meta}>배출품목 정보가 없습니다.</Text>}
              {disposalItems.length > 0 && (
                <View style={styles.itemsWrap}>
                  {disposalItems.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.itemChip}>
                      <Text style={styles.itemChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>기사 사진</Text>
              {detail.photos.length === 0 && (
                <Text style={styles.meta}>등록된 기사 사진이 없습니다.</Text>
              )}
              {detail.photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {detail.photos.map((photo, index) => (
                    <Pressable
                      key={`${photo.url}-${index}`}
                      style={styles.thumbnail}
                      onPress={() => setSelectedPhotoUrl(photo.url)}
                    >
                      <Image source={{ uri: photo.url }} style={styles.thumbnailImage} resizeMode="cover" />
                      <View style={styles.thumbnailMeta}>
                        <Text style={styles.thumbnailMetaText}>
                          {photo.type || 'PHOTO'} {index + 1}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>수거정보</Text>
              <InfoRow label="측정무게" value={formatWeight(detail.measuredWeightKg)} />
              <InfoRow label="측정시각" value={formatDate(detail.measuredAt)} />
              <InfoRow label="담당기사 ID" value={detail.driverId ? String(detail.driverId) : '-'} />
              <InfoRow label="배정시각" value={formatDate(detail.assignedAt)} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>결제정보</Text>
              <InfoRow label="통화" value={detail.currency} />
              <InfoRow label="결제예정금액" value={formatAmount(detail.finalAmount, detail.currency)} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>상태 타임라인</Text>
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
                      {toWasteStatusLabel(status)}
                    </Text>
                  </View>
                );
              })}
              {detail.statusTimeline.length === 0 && <Text style={styles.meta}>상태 이력이 없습니다.</Text>}
              {detail.statusTimeline.length > 0 && (
                <View style={styles.timelineLogBox}>
                  {detail.statusTimeline.map((timeline, index) => (
                    <Text key={`${timeline.toStatus}-${timeline.at}-${index}`} style={styles.timelineLogText}>
                      {`${toWasteStatusLabelOrStart(timeline.fromStatus)} -> ${toWasteStatusLabel(timeline.toStatus)} (${formatDate(timeline.at)})`}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </KeyboardAwareScrollScreen>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(selectedPhotoUrl)}
        onRequestClose={() => setSelectedPhotoUrl(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPhotoUrl(null)}>
          {selectedPhotoUrl && (
            <Image source={{ uri: selectedPhotoUrl }} style={styles.modalImage} resizeMode="contain" />
          )}
          <Text style={styles.modalHint}>탭하면 닫힙니다.</Text>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: ui.colors.screen,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  meta: {
    fontSize: 13,
    color: ui.colors.text,
  },
  orderNoCard: {
    borderWidth: 1,
    borderColor: '#b8d2ca',
    borderRadius: 10,
    backgroundColor: '#eef8f6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  orderNoLabel: {
    color: ui.colors.text,
    fontSize: 12,
  },
  orderNoValue: {
    color: ui.colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
  section: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    color: ui.colors.text,
    fontSize: 12,
  },
  infoValue: {
    color: ui.colors.textStrong,
    fontSize: 13,
  },
  actionButton: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  actionButtonMuted: {
    backgroundColor: ui.colors.textMuted,
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemChip: {
    borderWidth: 1,
    borderColor: '#a8c8c0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f2fbf8',
  },
  itemChipText: {
    color: ui.colors.textStrong,
    fontSize: 12,
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnail: {
    width: '48%',
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  thumbnailImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#cbd5e1',
  },
  thumbnailMeta: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  thumbnailMetaText: {
    color: ui.colors.textStrong,
    fontSize: 11,
    fontWeight: '600',
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
    color: ui.colors.textMuted,
    fontSize: 12,
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
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 3,
  },
  timelineLogText: {
    color: ui.colors.text,
    fontSize: 11,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  modalImage: {
    width: '100%',
    height: '78%',
  },
  modalHint: {
    color: '#e2e8f0',
    fontSize: 13,
  },
});
