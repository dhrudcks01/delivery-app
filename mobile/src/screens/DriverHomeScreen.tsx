import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getMyAssignedWasteRequests } from '../api/driverWasteApi';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/Card';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { ScreenState } from '../components/ScreenState';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import type { DriverAssignedWasteRequest } from '../types/waste';
import { toApiErrorMessage } from '../utils/errorMessage';
import { getStatusBadgePalette, resolveWasteStatusBadgeTone } from '../utils/statusBadge';
import { toWasteStatusLabel } from '../utils/wasteStatusLabel';

type DriverFilter = 'ALL' | 'ACTION_REQUIRED' | 'DONE';

const colors = ui.colors;

function formatDate(dateTime: string | null): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

function getFilterCount(requests: DriverAssignedWasteRequest[], filter: DriverFilter): number {
  if (filter === 'ALL') {
    return requests.length;
  }
  if (filter === 'ACTION_REQUIRED') {
    return requests.filter((request) => request.status === 'ASSIGNED').length;
  }
  return requests.filter((request) => request.status !== 'ASSIGNED').length;
}

export function DriverHomeScreen() {
  const { me } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [assignedRequests, setAssignedRequests] = useState<DriverAssignedWasteRequest[]>([]);
  const [driverFilter, setDriverFilter] = useState<DriverFilter>('ACTION_REQUIRED');

  const filteredRequests = useMemo(() => {
    if (driverFilter === 'ALL') {
      return assignedRequests;
    }
    if (driverFilter === 'ACTION_REQUIRED') {
      return assignedRequests.filter((request) => request.status === 'ASSIGNED');
    }
    return assignedRequests.filter((request) => request.status !== 'ASSIGNED');
  }, [assignedRequests, driverFilter]);

  const refreshAssignedRequests = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const data = await getMyAssignedWasteRequests();
      setAssignedRequests(data);
    } catch (error) {
      setListError(toApiErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAssignedRequests();
    }, [refreshAssignedRequests]),
  );

  const actionRequiredCount = useMemo(
    () => assignedRequests.filter((request) => request.status === 'ASSIGNED').length,
    [assignedRequests],
  );

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} includeTopInset>
      <View style={styles.screenContainer}>
        <Card style={styles.headerCard}>
          <Text style={styles.badge}>DRIVER</Text>
          <Text style={styles.title}>배정 수거 요청</Text>
          <Text style={styles.description}>배정 목록을 확인하고 요청별 상세 화면에서 측정 입력을 진행합니다.</Text>
          <Text style={styles.caption}>로그인 아이디: {me?.loginId ?? me?.email ?? '-'}</Text>
          <Text style={styles.caption}>역할: {me?.roles.join(', ') ?? '-'}</Text>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>전체 배정</Text>
            <Text style={styles.summaryValue}>{assignedRequests.length}건</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>처리 필요</Text>
            <Text style={styles.summaryValueWarn}>{actionRequiredCount}건</Text>
          </View>
          <SecondaryButton
            label={isLoadingList ? '새로고침 중...' : '새로고침'}
            onPress={() => void refreshAssignedRequests()}
            disabled={isLoadingList}
            tone="neutral"
            minHeight={40}
            style={styles.secondaryButtonCompact}
            textStyle={styles.secondaryButtonCompactText}
          />
        </Card>

        <Card style={styles.card}>
          <SectionHeader
            title="배정 목록"
            description="요청 카드를 눌러 상세 화면으로 이동하면 측정 입력/처리 완료를 진행할 수 있습니다."
            titleStyle={styles.sectionTitle}
            descriptionStyle={styles.caption}
          />

          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterChip, driverFilter === 'ACTION_REQUIRED' && styles.filterChipActive]}
              onPress={() => setDriverFilter('ACTION_REQUIRED')}
            >
              <Text style={[styles.filterChipText, driverFilter === 'ACTION_REQUIRED' && styles.filterChipTextActive]}>
                처리 필요 ({getFilterCount(assignedRequests, 'ACTION_REQUIRED')})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, driverFilter === 'DONE' && styles.filterChipActive]}
              onPress={() => setDriverFilter('DONE')}
            >
              <Text style={[styles.filterChipText, driverFilter === 'DONE' && styles.filterChipTextActive]}>
                처리 완료 ({getFilterCount(assignedRequests, 'DONE')})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, driverFilter === 'ALL' && styles.filterChipActive]}
              onPress={() => setDriverFilter('ALL')}
            >
              <Text style={[styles.filterChipText, driverFilter === 'ALL' && styles.filterChipTextActive]}>
                전체 ({getFilterCount(assignedRequests, 'ALL')})
              </Text>
            </Pressable>
          </View>

          {isLoadingList && (
            <ScreenState
              variant="loading"
              title="배정 목록을 불러오는 중입니다"
              description="잠시만 기다려 주세요."
            />
          )}

          {!isLoadingList && listError && (
            <ScreenState
              variant="error"
              title="배정 목록을 불러오지 못했습니다"
              description={listError}
              actionLabel="다시 시도"
              onAction={() => void refreshAssignedRequests()}
            />
          )}

          {!isLoadingList && !listError && filteredRequests.length === 0 && (
            <ScreenState
              variant="empty"
              title="선택한 필터에 해당하는 배정 요청이 없습니다"
              description="필터를 변경하거나 새로고침 후 다시 확인해 주세요."
            />
          )}

          {!isLoadingList && !listError && filteredRequests.length > 0 && (
            <View style={styles.listWrap}>
              {filteredRequests.map((item) => {
                const badgePalette = getStatusBadgePalette(resolveWasteStatusBadgeTone(item.status));
                const isActionRequired = item.status === 'ASSIGNED';
                return (
                  <Pressable
                    key={item.requestId}
                    style={styles.listItem}
                    onPress={() => navigation.navigate('DriverAssignedRequestDetail', { requestId: item.requestId })}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.listTitle}>요청 #{item.requestId}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badgePalette.backgroundColor }]}>
                        <Text style={[styles.statusBadgeText, { color: badgePalette.textColor }]}>
                          {toWasteStatusLabel(item.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.listSub}>{item.address}</Text>
                    <Text style={styles.listSub}>배정일: {formatDate(item.assignedAt)}</Text>

                    {item.contactPhone ? <Text style={styles.listSub}>연락처: {item.contactPhone}</Text> : null}
                    {item.note ? <Text style={styles.listSub}>요청사항: {item.note}</Text> : null}

                    <View style={styles.rowBetween}>
                      {isActionRequired ? (
                        <View style={styles.priorityBadge}>
                          <Text style={styles.priorityBadgeText}>우선 처리</Text>
                        </View>
                      ) : (
                        <View style={styles.priorityBadgeNeutral}>
                          <Text style={styles.priorityBadgeNeutralText}>처리 기록 확인</Text>
                        </View>
                      )}
                      <View style={styles.detailButton}>
                        <Text style={styles.detailButtonText}>{isActionRequired ? '측정 입력' : '상세보기'}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      </View>
    </KeyboardAwareScrollScreen>
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
    backgroundColor: ui.colors.infoSoftBackground,
    color: ui.colors.primaryPressed,
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
  caption: {
    fontSize: 12,
    color: colors.caption,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.caption,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    color: colors.textStrong,
    fontWeight: '700',
  },
  summaryValueWarn: {
    fontSize: 16,
    color: ui.colors.warningTextStrong,
    fontWeight: '700',
  },
  secondaryButtonCompact: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: ui.colors.card,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonCompactText: {
    fontSize: 13,
    color: colors.textStrong,
    fontWeight: '700',
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
  filterRow: {
    gap: 8,
  },
  filterChip: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: ui.colors.card,
  },
  filterChipActive: {
    borderColor: ui.colors.infoSoftBorder,
    backgroundColor: ui.colors.infoSoftBackground,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: ui.colors.primaryPressed,
  },
  loadingGroup: {
    gap: 8,
  },
  loadingCard: {
    backgroundColor: ui.colors.infoSoftBackground,
    borderWidth: 1,
    borderColor: ui.colors.infoSoftBorder,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: ui.colors.primaryPressed,
    fontWeight: '600',
  },
  skeletonCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: ui.colors.card,
  },
  skeletonLineShort: {
    height: 10,
    width: '36%',
    borderRadius: 999,
    backgroundColor: ui.colors.border,
  },
  skeletonLineLong: {
    height: 10,
    width: '82%',
    borderRadius: 999,
    backgroundColor: ui.colors.border,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: ui.colors.errorSoftBorder,
    backgroundColor: ui.colors.errorSoftBackground,
    borderRadius: 12,
    padding: 12,
    gap: 10,
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
    borderColor: ui.colors.errorSoftBorder,
    backgroundColor: ui.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 13,
    color: ui.colors.errorStrong,
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: ui.colors.card,
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
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: ui.colors.card,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  listTitle: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  listSub: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityBadge: {
    borderWidth: 1,
    borderColor: ui.colors.warningTintBorder,
    backgroundColor: ui.colors.warningTintBackground,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priorityBadgeText: {
    color: ui.colors.warningAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  priorityBadgeNeutral: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priorityBadgeNeutralText: {
    color: colors.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  detailButton: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.infoSoftBorder,
    backgroundColor: ui.colors.infoSoftBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  detailButtonText: {
    color: ui.colors.primaryPressed,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

