import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createOpsServiceAreaByCode,
  deactivateOpsServiceArea,
  getOpsServiceAreaMasterDongs,
  getOpsServiceAreas,
} from '../api/serviceAreaApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';
import { ApiErrorResponse } from '../types/waste';
import { ServiceArea, ServiceAreaMasterDong } from '../types/serviceArea';

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

function toAreaKey(city: string, district: string, dong: string): string {
  return `${city.trim().toLowerCase()}|${district.trim().toLowerCase()}|${dong.trim().toLowerCase()}`;
}

function formatAreaLabel(area: Pick<ServiceArea, 'city' | 'district' | 'dong'>): string {
  return `${area.city} ${area.district} ${area.dong}`.trim();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'ko'));
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

  const [citySearchInput, setCitySearchInput] = useState('');
  const [districtSearchInput, setDistrictSearchInput] = useState('');
  const [dongSearchInput, setDongSearchInput] = useState('');

  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [dongOptions, setDongOptions] = useState<ServiceAreaMasterDong[]>([]);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedDongMap, setSelectedDongMap] = useState<Map<string, ServiceAreaMasterDong>>(new Map());

  const [isCityLoading, setIsCityLoading] = useState(false);
  const [isDistrictLoading, setIsDistrictLoading] = useState(false);
  const [isDongLoading, setIsDongLoading] = useState(false);

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

  const selectedDongList = useMemo(
    () => Array.from(selectedDongMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
    [selectedDongMap],
  );

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

  const loadAllActiveAreaKeys = useCallback(async (): Promise<Set<string>> => {
    const keys = new Set<string>();
    let page = 0;
    let done = false;
    while (!done) {
      const response = await getOpsServiceAreas({ active: true, page, size: 200 });
      response.content.forEach((area) => {
        keys.add(toAreaKey(area.city, area.district, area.dong));
      });
      done = response.last;
      page += 1;
      if (page > 100) {
        done = true;
      }
    }
    return keys;
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

  const handleCitySearch = async () => {
    setIsCityLoading(true);
    setErrorMessage(null);
    try {
      const query = citySearchInput.trim();
      const response = await getOpsServiceAreaMasterDongs({ query, active: true, page: 0, size: 300 });
      setCityOptions(uniqueSorted(response.content.map((item) => item.city)));
      if (response.content.length === 0) {
        setResultMessage('검색된 시/도가 없습니다. 검색어를 바꿔 다시 시도해 주세요.');
      } else {
        setResultMessage(null);
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsCityLoading(false);
    }
  };

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSelectedDistrict(null);
    setDistrictSearchInput('');
    setDongSearchInput('');
    setDistrictOptions([]);
    setDongOptions([]);
    setResultMessage(null);
    setErrorMessage(null);
  };

  const handleDistrictSearch = async () => {
    if (!selectedCity) {
      setErrorMessage('먼저 시/도를 선택해 주세요.');
      return;
    }
    setIsDistrictLoading(true);
    setErrorMessage(null);
    try {
      const keyword = districtSearchInput.trim();
      const query = `${selectedCity} ${keyword}`.trim();
      const response = await getOpsServiceAreaMasterDongs({ query, active: true, page: 0, size: 400 });
      const filtered = response.content.filter((item) => item.city === selectedCity);
      setDistrictOptions(uniqueSorted(filtered.map((item) => item.district)));
      if (filtered.length === 0) {
        setResultMessage('검색된 시/군/구가 없습니다. 검색어를 바꿔 다시 시도해 주세요.');
      } else {
        setResultMessage(null);
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsDistrictLoading(false);
    }
  };

  const handleSelectDistrict = (district: string) => {
    setSelectedDistrict(district);
    setDongSearchInput('');
    setDongOptions([]);
    setResultMessage(null);
    setErrorMessage(null);
  };

  const handleDongSearch = async () => {
    if (!selectedCity || !selectedDistrict) {
      setErrorMessage('시/도와 시/군/구를 먼저 선택해 주세요.');
      return;
    }
    setIsDongLoading(true);
    setErrorMessage(null);
    try {
      const keyword = dongSearchInput.trim();
      const query = `${selectedCity} ${selectedDistrict} ${keyword}`.trim();
      const response = await getOpsServiceAreaMasterDongs({ query, active: true, page: 0, size: 500 });
      const filtered = response.content
        .filter((item) => item.city === selectedCity && item.district === selectedDistrict)
        .sort((a, b) => a.dong.localeCompare(b.dong, 'ko'));
      setDongOptions(filtered);
      if (filtered.length === 0) {
        setResultMessage('검색된 동이 없습니다. 검색어를 바꿔 다시 시도해 주세요.');
      } else {
        setResultMessage(null);
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsDongLoading(false);
    }
  };

  const toggleDongSelection = (item: ServiceAreaMasterDong) => {
    setSelectedDongMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.code)) {
        next.delete(item.code);
      } else {
        next.set(item.code, item);
      }
      return next;
    });
    setErrorMessage(null);
    setResultMessage(null);
  };

  const removeSelectedDong = (code: string) => {
    setSelectedDongMap((prev) => {
      const next = new Map(prev);
      next.delete(code);
      return next;
    });
  };

  const clearSelectedDongs = () => {
    setSelectedDongMap(new Map());
  };

  const handleRegisterSelected = async () => {
    if (selectedDongList.length === 0) {
      setErrorMessage('등록할 동을 1개 이상 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const activeKeys = await loadAllActiveAreaKeys();
      let successCount = 0;
      let duplicateCount = 0;
      let failedCount = 0;
      const failureMessages: string[] = [];

      for (const item of selectedDongList) {
        const key = toAreaKey(item.city, item.district, item.dong);
        if (activeKeys.has(key)) {
          duplicateCount += 1;
          continue;
        }
        try {
          await createOpsServiceAreaByCode({ code: item.code });
          activeKeys.add(key);
          successCount += 1;
        } catch (error) {
          failedCount += 1;
          failureMessages.push(`${formatAreaLabel(item)}: ${toErrorMessage(error)}`);
        }
      }

      setResultMessage(`등록 결과: 성공 ${successCount}건, 중복 ${duplicateCount}건, 실패 ${failedCount}건`);
      if (failureMessages.length > 0) {
        setErrorMessage(failureMessages.slice(0, 2).join('\n'));
      }

      if (successCount > 0) {
        await loadAreas(appliedQuery, activeParam);
      }
      clearSelectedDongs();
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
        <Text style={styles.cardTitle}>선택형 지역 등록 (시/구/동 트리)</Text>
        <Text style={styles.meta}>텍스트 직접 입력 대신 행정구역 마스터에서 선택해 등록합니다.</Text>

        <Text style={styles.sectionTitle}>1) 시/도 선택</Text>
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            value={citySearchInput}
            onChangeText={setCitySearchInput}
            placeholder="시/도 검색어 (예: 서울)"
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            onSubmitEditing={() => void handleCitySearch()}
          />
          <Pressable style={styles.inlineButton} onPress={() => void handleCitySearch()} disabled={isCityLoading}>
            <Text style={styles.inlineButtonText}>{isCityLoading ? '조회중' : '조회'}</Text>
          </Pressable>
        </View>
        <View style={styles.optionWrap}>
          {cityOptions.map((city) => (
            <Pressable
              key={city}
              style={[styles.optionChip, selectedCity === city && styles.optionChipActive]}
              onPress={() => handleSelectCity(city)}
            >
              <Text style={[styles.optionChipText, selectedCity === city && styles.optionChipTextActive]}>{city}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>2) 시/군/구 선택</Text>
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            value={districtSearchInput}
            onChangeText={setDistrictSearchInput}
            placeholder={selectedCity ? '시/군/구 검색어 (예: 마포)' : '먼저 시/도를 선택해 주세요.'}
            placeholderTextColor="#94a3b8"
            editable={!!selectedCity}
            returnKeyType="search"
            onSubmitEditing={() => void handleDistrictSearch()}
          />
          <Pressable
            style={[styles.inlineButton, !selectedCity && styles.buttonDisabled]}
            onPress={() => void handleDistrictSearch()}
            disabled={!selectedCity || isDistrictLoading}
          >
            <Text style={styles.inlineButtonText}>{isDistrictLoading ? '조회중' : '조회'}</Text>
          </Pressable>
        </View>
        <View style={styles.optionWrap}>
          {districtOptions.map((district) => (
            <Pressable
              key={`${selectedCity ?? 'city'}-${district}`}
              style={[styles.optionChip, selectedDistrict === district && styles.optionChipActive]}
              onPress={() => handleSelectDistrict(district)}
            >
              <Text style={[styles.optionChipText, selectedDistrict === district && styles.optionChipTextActive]}>
                {district}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>3) 동 선택 (다중 선택)</Text>
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            value={dongSearchInput}
            onChangeText={setDongSearchInput}
            placeholder={selectedDistrict ? '동 검색어 (예: 서교)' : '먼저 시/군/구를 선택해 주세요.'}
            placeholderTextColor="#94a3b8"
            editable={!!selectedDistrict}
            returnKeyType="search"
            onSubmitEditing={() => void handleDongSearch()}
          />
          <Pressable
            style={[styles.inlineButton, !selectedDistrict && styles.buttonDisabled]}
            onPress={() => void handleDongSearch()}
            disabled={!selectedDistrict || isDongLoading}
          >
            <Text style={styles.inlineButtonText}>{isDongLoading ? '조회중' : '조회'}</Text>
          </Pressable>
        </View>
        <View style={styles.listWrap}>
          {dongOptions.map((item) => {
            const isSelected = selectedDongMap.has(item.code);
            return (
              <Pressable
                key={item.code}
                style={[styles.listItem, isSelected && styles.listItemSelected]}
                onPress={() => toggleDongSelection(item)}
              >
                <Text style={styles.listTitle}>{item.dong}</Text>
                <Text style={styles.listSub}>{item.code}</Text>
                <Text style={[styles.pickText, isSelected && styles.pickTextSelected]}>
                  {isSelected ? '선택됨' : '선택'}
                </Text>
              </Pressable>
            );
          })}
          {dongOptions.length === 0 && <Text style={styles.meta}>조회된 동이 없습니다.</Text>}
        </View>

        <Text style={styles.meta}>선택된 동: {selectedDongList.length}건</Text>
        <View style={styles.optionWrap}>
          {selectedDongList.map((item) => (
            <Pressable key={`selected-${item.code}`} style={styles.selectedChip} onPress={() => removeSelectedDong(item.code)}>
              <Text style={styles.selectedChipText}>{formatAreaLabel(item)} (해제)</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => void handleRegisterSelected()}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? '등록 중..' : `선택 지역 등록 (${selectedDongList.length})`}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={clearSelectedDongs}>
            <Text style={styles.secondaryButtonText}>선택 초기화</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>등록 지역 조회/비활성화</Text>
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
            <Text style={[styles.filterChipText, activeFilter === 'INACTIVE' && styles.filterChipTextActive]}>
              비활성
            </Text>
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
  sectionTitle: {
    marginTop: 4,
    color: ui.colors.textStrong,
    fontSize: 13,
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
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.textStrong,
    backgroundColor: '#ffffff',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
  },
  inlineButton: {
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: ui.colors.primary,
  },
  inlineButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  optionChipActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  optionChipText: {
    color: ui.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: ui.colors.primary,
  },
  selectedChip: {
    borderRadius: 999,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#67e8f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedChipText: {
    color: '#155e75',
    fontSize: 12,
    fontWeight: '600',
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
  listItemSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
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
  pickText: {
    color: ui.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  pickTextSelected: {
    color: '#15803d',
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
