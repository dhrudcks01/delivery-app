import { AxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUserServiceAreas } from '../api/serviceAreaApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { ui } from '../theme/ui';
import { ApiErrorResponse } from '../types/waste';
import { ServiceArea } from '../types/serviceArea';

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (!error.response) {
      return '네트워크 연결을 확인해 주세요.';
    }
    return apiError?.message ?? '서비스 지역 목록을 불러오지 못했습니다.';
  }
  return '서비스 지역 목록을 불러오지 못했습니다.';
}

function formatAreaLabel(area: ServiceArea): string {
  return `${area.city} ${area.district} ${area.dong}`.trim();
}

export function ServiceAreaBrowseScreen() {
  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadAreas = useCallback(async (query: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getUserServiceAreas({ query, page: 0, size: 100 });
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
    void loadAreas('');
  }, [loadAreas]);

  const handleSearch = () => {
    const nextQuery = queryInput.trim();
    setAppliedQuery(nextQuery);
    void loadAreas(nextQuery);
  };

  const handleReset = () => {
    setQueryInput('');
    setAppliedQuery('');
    void loadAreas('');
  };

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>서비스 가능 지역</Text>
      <Text style={styles.meta}>시/구/동 단위로 검색할 수 있습니다.</Text>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          value={queryInput}
          onChangeText={setQueryInput}
          placeholder="예: 마포구 서교동"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <View style={styles.searchActions}>
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>검색</Text>
          </Pressable>
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>초기화</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>검색 결과</Text>
        {appliedQuery ? <Text style={styles.meta}>검색어: {appliedQuery}</Text> : <Text style={styles.meta}>전체 지역</Text>}
        <Text style={styles.meta}>총 {totalCount}건</Text>

        {isLoading && <Text style={styles.meta}>서비스 지역을 불러오는 중입니다.</Text>}
        {errorMessage && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadAreas(appliedQuery)}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !errorMessage && areas.length === 0 && (
          <Text style={styles.meta}>조회된 서비스 가능 지역이 없습니다.</Text>
        )}

        {!isLoading && !errorMessage && areas.length > 0 && (
          <View style={styles.listWrap}>
            {areas.map((area) => (
              <View key={area.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{formatAreaLabel(area)}</Text>
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
  searchBox: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 12,
    gap: 10,
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
  searchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  searchButton: {
    flex: 1,
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: ui.colors.primary,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resetButton: {
    flex: 1,
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    backgroundColor: '#ffffff',
  },
  resetButtonText: {
    color: ui.colors.textStrong,
    fontWeight: '700',
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
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  listTitle: {
    color: ui.colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  errorWrap: {
    gap: 8,
  },
  errorText: {
    color: ui.colors.error,
    fontSize: 13,
  },
  retryButton: {
    borderRadius: ui.radius.control,
    borderWidth: 1,
    borderColor: ui.colors.error,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff5f5',
  },
  retryButtonText: {
    color: ui.colors.error,
    fontWeight: '700',
  },
});
