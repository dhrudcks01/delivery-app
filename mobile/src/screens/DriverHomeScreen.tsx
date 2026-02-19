import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMyAssignedWasteRequestDetail, getMyAssignedWasteRequests } from '../api/driverWasteApi';
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
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [assignedRequests, setAssignedRequests] = useState<DriverAssignedWasteRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DriverAssignedWasteRequest | null>(null);

  const selectedTitle = useMemo(() => {
    if (!selectedRequest) {
      return '상세 요청을 선택해 주세요.';
    }
    return `요청 #${selectedRequest.requestId} (${selectedRequest.status})`;
  }, [selectedRequest]);

  const refreshAssignedRequests = async () => {
    setIsLoadingList(true);
    setListError(null);

    try {
      const data = await getMyAssignedWasteRequests();
      setAssignedRequests(data);
      if (data.length === 0) {
        setSelectedRequestId(null);
        setSelectedRequest(null);
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
            <Text style={styles.listTitle}>#{item.requestId} {item.status}</Text>
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
  logoutButton: {
    marginBottom: 20,
  },
});
