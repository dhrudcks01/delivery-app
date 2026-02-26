import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cancelMyWasteRequest, getMyWasteRequestDetail } from '../api/wasteApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { ApiErrorResponse, WasteRequestDetail } from '../types/waste';

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
    return '-';
  }
  if (currency === 'KRW') {
    return `${amount.toLocaleString('ko-KR')}원`;
  }
  return `${amount.toLocaleString('ko-KR')} ${currency}`;
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
  const { requestId } = route.params;

  const [detail, setDetail] = useState<WasteRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = detail?.status === 'REQUESTED';
  const disposalItemsText = useMemo(() => {
    if (!detail || detail.disposalItems.length === 0) {
      return '미입력';
    }
    return detail.disposalItems.join(', ');
  }, [detail]);

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
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.title}>수거요청 상세</Text>
          <Text style={styles.meta}>요청 ID: {requestId}</Text>
        </View>
        <Pressable style={styles.ghostButton} onPress={() => void loadDetail()}>
          <Text style={styles.ghostButtonText}>새로고침</Text>
        </Pressable>
      </View>

      {isLoading && !detail && <Text style={styles.meta}>상세를 불러오는 중입니다.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      {detail && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주문정보</Text>
            <InfoRow label="주문번호" value={detail.orderNo || '-'} />
            <InfoRow label="요청상태" value={detail.status} />
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
            <InfoRow label="배출품목" value={disposalItemsText} />
            <InfoRow label="수거비닐 수량" value={`${detail.bagCount}개`} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>수거정보</Text>
            <InfoRow label="측정무게" value={formatWeight(detail.measuredWeightKg)} />
            <InfoRow label="측정시각" value={formatDate(detail.measuredAt)} />
            <InfoRow label="담당기사 ID" value={detail.driverId ? String(detail.driverId) : '-'} />
            <InfoRow label="배정시각" value={formatDate(detail.assignedAt)} />
            <View style={styles.subSection}>
              <Text style={styles.subTitle}>사진</Text>
              {detail.photos.length === 0 && <Text style={styles.meta}>등록된 사진이 없습니다.</Text>}
              {detail.photos.map((photo, index) => (
                <Text key={`${photo.url}-${index}`} style={styles.listText}>
                  {index + 1}. [{photo.type}] {photo.url}
                </Text>
              ))}
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subTitle}>상태 타임라인</Text>
              {detail.statusTimeline.length === 0 && <Text style={styles.meta}>상태 이력이 없습니다.</Text>}
              {detail.statusTimeline.map((timeline, index) => (
                <Text key={`${timeline.toStatus}-${timeline.at}-${index}`} style={styles.listText}>
                  {timeline.fromStatus || 'START'} → {timeline.toStatus} ({formatDate(timeline.at)})
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제정보</Text>
            <InfoRow label="통화" value={detail.currency} />
            <InfoRow label="결제(예정)금액" value={formatAmount(detail.finalAmount, detail.currency)} />
          </View>
        </>
      )}
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: ui.colors.screen,
    gap: 12,
  },
  rowBetween: {
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
  subSection: {
    gap: 4,
  },
  subTitle: {
    color: ui.colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  listText: {
    color: ui.colors.textStrong,
    fontSize: 12,
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
});
