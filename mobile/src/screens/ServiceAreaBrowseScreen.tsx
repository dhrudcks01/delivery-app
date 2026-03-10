import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUserServiceAreas } from '../api/serviceAreaApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { ServiceArea } from '../types/serviceArea';
import { ui } from '../theme/ui';
import { toApiErrorMessage } from '../utils/errorMessage';

const ERROR_MESSAGE_OPTIONS = {
  defaultMessage: '서비스 지역 목록을 불러오지 못했습니다.',
  timeoutMessage: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
  networkMessage: '네트워크 연결을 확인해 주세요.',
};

function formatAreaLabel(area: ServiceArea): string {
  return `${area.city} ${area.district} ${area.dong}`.trim();
}

function formatDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString();
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
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
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

  const resultLabel = useMemo(() => (appliedQuery ? `검색어: ${appliedQuery}` : '전체 지역'), [appliedQuery]);

  return (
    <KeyboardAwareScrollScreen
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      includeTopInset
    >
      <View style={styles.screenContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.badge}>서비스지역</Text>
          <Text style={styles.title}>서비스 가능 지역</Text>
          <Text style={styles.description}>시/구/동 단위로 서비스 가능지역을 검색할 수 있습니다.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>지역 검색</Text>
          <Text style={styles.caption}>예: 관악구 봉천동, 서울특별시 관악구</Text>

          <TextInput
            style={styles.input}
            value={queryInput}
            onChangeText={setQueryInput}
            placeholder="시/구/동을 입력해 주세요"
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSearch}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>{isLoading ? '검색 중...' : '검색'}</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>초기화</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionTitle}>검색 결과</Text>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{totalCount}건</Text>
            </View>
          </View>
          <Text style={styles.caption}>{resultLabel}</Text>

          {isLoading && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={ui.colors.primary} />
                <Text style={styles.loadingText}>서비스 가능지역을 불러오는 중입니다...</Text>
              </View>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
            </View>
          )}

          {!isLoading && errorMessage && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadAreas(appliedQuery)}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </Pressable>
            </View>
          )}

          {!isLoading && !errorMessage && areas.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>조회된 서비스 가능 지역이 없습니다</Text>
              <Text style={styles.emptyDescription}>검색어를 조정하거나 초기화 후 다시 확인해 주세요.</Text>
            </View>
          )}

          {!isLoading && !errorMessage && areas.length > 0 && (
            <View style={styles.listWrap}>
              {areas.map((area) => (
                <View key={area.id} style={styles.listItem}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.listTitle}>{formatAreaLabel(area)}</Text>
                    <View style={[styles.statusBadge, area.active ? styles.statusBadgeSuccess : styles.statusBadgeWarning]}>
                      <Text style={[styles.statusBadgeText, area.active ? styles.statusBadgeSuccessText : styles.statusBadgeWarningText]}>
                        {area.active ? '운영 중' : '비활성'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.listMeta}>최종 갱신: {formatDateTime(area.updatedAt)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: ui.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  screenContainer: {
    gap: 16,
  },
  headerCard: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.border,
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
    color: ui.colors.textStrong,
  },
  description: {
    fontSize: 14,
    color: ui.colors.text,
    lineHeight: 20,
  },
  card: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.textStrong,
  },
  caption: {
    fontSize: 12,
    color: ui.colors.caption,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    color: ui.colors.textStrong,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: ui.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  infoBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoBadgeText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '700',
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
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  skeletonCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
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
  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    color: ui.colors.error,
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
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  emptyIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: ui.colors.caption,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.textStrong,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: ui.colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  listTitle: {
    flex: 1,
    fontSize: 14,
    color: ui.colors.textStrong,
    fontWeight: '600',
    lineHeight: 20,
  },
  listMeta: {
    fontSize: 12,
    color: ui.colors.caption,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
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
    color: ui.colors.success,
  },
  statusBadgeWarning: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  statusBadgeWarningText: {
    color: '#b45309',
  },
});

