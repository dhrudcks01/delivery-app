import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createOpsServiceArea,
  deactivateOpsServiceArea,
  getOpsServiceAreas,
} from '../api/serviceAreaApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';
import { ApiErrorResponse } from '../types/waste';
import { ServiceArea } from '../types/serviceArea';

type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (!error.response) {
      return '네트워크 연결을 확인해 주세요.';
    }
    if (error.response.status === 403) {
      return '권한이 없습니다. OPS_ADMIN 또는 SYS_ADMIN 권한이 필요합니다.';
    }
    return apiError?.message ?? '서비스 신청지역 작업 중 오류가 발생했습니다.';
  }
  return '서비스 신청지역 작업 중 오류가 발생했습니다.';
}

function formatAreaLabel(area: ServiceArea): string {
  return `${area.city} ${area.district} ${area.dong}`.trim();
}

export function ServiceAreaManagementScreen() {
  const { me } = useAuth();
  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [cityInput, setCityInput] = useState('');
  const [districtInput, setDistrictInput] = useState('');
  const [dongInput, setDongInput] = useState('');

  const canManage = useMemo(() => {
    const roles = me?.roles ?? [];
    return roles.includes('OPS_ADMIN') || roles.includes('SYS_ADMIN');
  }, [me?.roles]);

  const activeParam = useMemo(() => {
    if (activeFilter === 'ALL') {
      return undefined;
    }
    return activeFilter === 'ACTIVE';
  }, [activeFilter]);

  const loadAreas = useCallback(async (query: string, active?: boolean) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getOpsServiceAreas({ query, active, page: 0, size: 100 });
      setAreas(response.content);
      setTotalCount(response.totalElements);
    } catch (error) {
      setAreas([]);
      setTotalCount(0);
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) {
      return;
    }
    void loadAreas('', activeParam);
  }, [canManage, loadAreas, activeParam]);

  const handleSearch = () => {
    const nextQuery = queryInput.trim();
    setAppliedQuery(nextQuery);
    void loadAreas(nextQuery, activeParam);
  };

  const handleReset = () => {
    setQueryInput('');
    setAppliedQuery('');
    setActiveFilter('ALL');
    void loadAreas('', undefined);
  };

  const handleRegister = async () => {
    const city = cityInput.trim();
    const district = districtInput.trim();
    const dong = dongInput.trim();

    if (!city || !district || !dong) {
      setErrorMessage('시/도, 시/군/구, 동을 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const created = await createOpsServiceArea({ city, district, dong });
      setResultMessage(`서비스 신청지역이 저장되었습니다: ${formatAreaLabel(created)}`);
      setCityInput('');
      setDistrictInput('');
      setDongInput('');
      await loadAreas(appliedQuery, activeParam);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (serviceAreaId: number) => {
    setDeactivatingId(serviceAreaId);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const updated = await deactivateOpsServiceArea(serviceAreaId);
      setResultMessage(`비활성화 처리되었습니다: ${formatAreaLabel(updated)}`);
      await loadAreas(appliedQuery, activeParam);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setDeactivatingId(null);
    }
  };

  if (!canManage) {
    return (
      <KeyboardAwareScrollScreen contentContainerStyle={styles.container}>
        <Text style={styles.title}>서비스 신청지역</Text>
        <View style={styles.card}>
          <Text style={styles.errorText}>접근 권한이 없습니다.</Text>
          <Text style={styles.meta}>OPS_ADMIN 또는 SYS_ADMIN 권한이 필요합니다.</Text>
        </View>
      </KeyboardAwareScrollScreen>
    );
  }

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>서비스 신청지역</Text>
      <Text style={styles.meta}>OPS_ADMIN/SYS_ADMIN 권한으로 서비스 지역을 관리합니다.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>지역 등록</Text>
        <TextInput
          style={styles.input}
          value={cityInput}
          onChangeText={setCityInput}
          placeholder="시/도 (예: 서울특별시)"
          placeholderTextColor="#94a3b8"
        />
        <TextInput
          style={styles.input}
          value={districtInput}
          onChangeText={setDistrictInput}
          placeholder="시/군/구 (예: 마포구)"
          placeholderTextColor="#94a3b8"
        />
        <TextInput
          style={styles.input}
          value={dongInput}
          onChangeText={setDongInput}
          placeholder="동 (예: 서교동)"
          placeholderTextColor="#94a3b8"
        />
        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => void handleRegister()}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? '등록 중..' : '서비스 신청지역 등록'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>지역 조회/검색</Text>
        <TextInput
          style={styles.input}
          value={queryInput}
          onChangeText={setQueryInput}
          placeholder="검색어(시/구/동)"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>전체</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, activeFilter === 'ACTIVE' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ACTIVE')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ACTIVE' && styles.filterChipTextActive]}>활성</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, activeFilter === 'INACTIVE' && styles.filterChipActive]}
            onPress={() => setActiveFilter('INACTIVE')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'INACTIVE' && styles.filterChipTextActive]}>비활성</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButton} onPress={handleSearch}>
            <Text style={styles.primaryButtonText}>검색</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleReset}>
            <Text style={styles.secondaryButtonText}>초기화</Text>
          </Pressable>
        </View>

        {appliedQuery ? <Text style={styles.meta}>검색어: {appliedQuery}</Text> : <Text style={styles.meta}>전체 지역</Text>}
        <Text style={styles.meta}>총 {totalCount}건</Text>
        {resultMessage && <Text style={styles.successText}>{resultMessage}</Text>}
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        {isLoading && <Text style={styles.meta}>서비스 신청지역 목록을 불러오는 중입니다.</Text>}
        {!isLoading && areas.length === 0 && <Text style={styles.meta}>조회된 서비스 신청지역이 없습니다.</Text>}

        {!isLoading && areas.length > 0 && (
          <View style={styles.listWrap}>
            {areas.map((area) => (
              <View key={area.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{formatAreaLabel(area)}</Text>
                <Text style={styles.listSub}>상태: {area.active ? '활성' : '비활성'}</Text>
                <Text style={styles.listSub}>업데이트: {new Date(area.updatedAt).toLocaleString()}</Text>
                {area.active && (
                  <Pressable
                    style={[styles.deactivateButton, deactivatingId === area.id && styles.buttonDisabled]}
                    onPress={() => void handleDeactivate(area.id)}
                    disabled={deactivatingId !== null}
                  >
                    <Text style={styles.deactivateButtonText}>
                      {deactivatingId === area.id ? '처리 중..' : '비활성화'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </KeyboardAwareScrollScreen>
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
    color: ui.colors.text,
    fontSize: 13,
  },
  card: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.textStrong,
    backgroundColor: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.control,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  filterChipText: {
    color: ui.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: ui.colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: ui.colors.primary,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: ui.radius.control,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: ui.colors.textStrong,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  successText: {
    color: ui.colors.success,
    fontSize: 13,
  },
  errorText: {
    color: ui.colors.error,
    fontSize: 13,
  },
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: '#ffffff',
  },
  listTitle: {
    color: ui.colors.textStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  listSub: {
    color: ui.colors.text,
    fontSize: 12,
  },
  deactivateButton: {
    marginTop: 4,
    borderRadius: ui.radius.control,
    borderWidth: 1,
    borderColor: '#b91c1c',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff1f2',
  },
  deactivateButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
});
