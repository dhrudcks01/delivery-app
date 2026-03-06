import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMyAssignedWasteRequests } from '../api/driverWasteApi';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';
import { ApiErrorResponse, DriverAssignedWasteRequest } from '../types/waste';
import { toWasteStatusLabel } from '../utils/wasteStatusLabel';

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
      setListError(toErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAssignedRequests();
    }, [refreshAssignedRequests]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>DRIVER 전용 배정건</Text>
      <Text style={styles.meta}>로그인 아이디: {me?.loginId ?? me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>배정 목록</Text>
          <Pressable style={styles.ghostButton} onPress={() => void refreshAssignedRequests()}>
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>요청을 탭하면 상세 화면으로 이동합니다.</Text>

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
            <Text style={[styles.filterChipText, driverFilter === 'ALL' && styles.filterChipTextActive]}>전체</Text>
          </Pressable>
        </View>

        {isLoadingList && <Text style={styles.meta}>목록을 불러오는 중..</Text>}
        {listError && <Text style={styles.error}>{listError}</Text>}

        {filteredRequests.map((item) => (
          <Pressable
            key={item.requestId}
            style={styles.listItem}
            onPress={() => navigation.navigate('DriverAssignedRequestDetail', { requestId: item.requestId })}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.listTitle}>#{item.requestId} {toWasteStatusLabel(item.status)}</Text>
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
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
});
