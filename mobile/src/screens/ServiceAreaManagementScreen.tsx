import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createOpsServiceAreaByCode,
  deleteOpsServiceArea,
  deactivateOpsServiceArea,
  getOpsServiceAreaMasterDongs,
  getOpsServiceAreas,
  reactivateOpsServiceArea,
} from '../api/serviceAreaApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { useAuth } from '../auth/AuthContext';
import { ApiErrorResponse } from '../types/waste';
import { ServiceArea, ServiceAreaMasterDong } from '../types/serviceArea';

type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const CITY_ALIAS_BY_NORMALIZED: Record<string, string> = {
  seoul: '서울특별시',
  busan: '부산광역시',
  daegu: '대구광역시',
  incheon: '인천광역시',
  gwangju: '광주광역시',
  daejeon: '대전광역시',
  ulsan: '울산광역시',
  sejong: '세종특별자치시',
};

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

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeCityToken(value: string): string {
  const normalized = normalizeToken(value);
  const canonical = CITY_ALIAS_BY_NORMALIZED[normalized];
  if (!canonical) {
    return normalized;
  }
  return normalizeToken(canonical);
}

function isSameCity(cityA: string, cityB: string): boolean {
  return normalizeCityToken(cityA) === normalizeCityToken(cityB);
}

function isSameDistrict(districtA: string, districtB: string): boolean {
  return normalizeToken(districtA) === normalizeToken(districtB);
}

function toAreaKey(city: string, district: string, dong: string): string {
  return `${normalizeCityToken(city)}|${normalizeToken(district)}|${normalizeToken(dong)}`;
}

function formatAreaLabel(area: Pick<ServiceArea, 'city' | 'district' | 'dong'>): string {
  return `${area.city} ${area.district} ${area.dong}`.trim();
}

function formatDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString();
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
  const [isRetrySubmitting, setIsRetrySubmitting] = useState(false);
  const [isBulkSelecting, setIsBulkSelecting] = useState(false);
  const [submittingTargetCount, setSubmittingTargetCount] = useState(0);
  const [updatingAreaId, setUpdatingAreaId] = useState<number | null>(null);
  const [deletingAreaId, setDeletingAreaId] = useState<number | null>(null);
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
  const [failedRegistrationTargets, setFailedRegistrationTargets] = useState<ServiceAreaMasterDong[]>([]);

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

  const loadMasterDongs = useCallback(
    async (params: { query?: string; city?: string; district?: string }): Promise<ServiceAreaMasterDong[]> => {
      const byCode = new Map<string, ServiceAreaMasterDong>();
      let page = 0;
      let done = false;
      while (!done) {
        const response = await getOpsServiceAreaMasterDongs({
          query: params.query,
          city: params.city,
          district: params.district,
          active: true,
          page,
          size: 300,
        });
        response.content.forEach((item) => {
          byCode.set(item.code, item);
        });
        done = response.last;
        page += 1;
        if (page > 100) {
          done = true;
        }
      }
      return Array.from(byCode.values());
    },
    [],
  );

  const loadAllMasterDongsForDistrict = useCallback(
    async (city: string, district: string): Promise<ServiceAreaMasterDong[]> => {
      const dongs = await loadMasterDongs({ city, district });
      return dongs
        .filter((item) => isSameCity(item.city, city) && isSameDistrict(item.district, district))
        .sort((a, b) => a.dong.localeCompare(b.dong, 'ko'));
    },
    [loadMasterDongs],
  );

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

  const handleCitySearch = useCallback(async () => {
    setIsCityLoading(true);
    setErrorMessage(null);
    try {
      const query = citySearchInput.trim();
      const masterDongs = await loadMasterDongs({ query });
      setCityOptions(uniqueSorted(masterDongs.map((item) => item.city)));
      if (masterDongs.length === 0) {
        setResultMessage('검색된 시/도가 없습니다. 검색어를 바꿔 다시 시도해 주세요.');
      } else {
        setResultMessage(null);
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsCityLoading(false);
    }
  }, [citySearchInput, loadMasterDongs]);

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSelectedDistrict(null);
    setDistrictSearchInput('');
    setDongSearchInput('');
    setDistrictOptions([]);
    setDongOptions([]);
    setFailedRegistrationTargets([]);
    setResultMessage(null);
    setErrorMessage(null);
  };

  const handleDistrictSearch = useCallback(async () => {
    if (!selectedCity) {
      setErrorMessage('먼저 시/도를 선택해 주세요.');
      return;
    }
    setIsDistrictLoading(true);
    setErrorMessage(null);
    try {
      const keyword = districtSearchInput.trim();
      const masterDongs = await loadMasterDongs({
        query: keyword,
        city: selectedCity,
      });
      const filtered = masterDongs.filter((item) => isSameCity(item.city, selectedCity));
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
  }, [districtSearchInput, loadMasterDongs, selectedCity]);

  const handleSelectDistrict = (district: string) => {
    setSelectedDistrict(district);
    setDongSearchInput('');
    setDongOptions([]);
    setFailedRegistrationTargets([]);
    setResultMessage(null);
    setErrorMessage(null);
  };

  const handleDongSearch = useCallback(async () => {
    if (!selectedCity || !selectedDistrict) {
      setErrorMessage('시/도와 시/군/구를 먼저 선택해 주세요.');
      return;
    }
    setIsDongLoading(true);
    setErrorMessage(null);
    try {
      const keyword = dongSearchInput.trim();
      const masterDongs = await loadMasterDongs({
        query: keyword,
        city: selectedCity,
        district: selectedDistrict,
      });
      const filtered = masterDongs
        .filter(
          (item) => isSameCity(item.city, selectedCity) && isSameDistrict(item.district, selectedDistrict),
        )
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
  }, [dongSearchInput, loadMasterDongs, selectedCity, selectedDistrict]);

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
    setFailedRegistrationTargets([]);
    setErrorMessage(null);
    setResultMessage(null);
  };

  const removeSelectedDong = (code: string) => {
    setSelectedDongMap((prev) => {
      const next = new Map(prev);
      next.delete(code);
      return next;
    });
    setFailedRegistrationTargets([]);
  };

  const clearSelectedDongs = () => {
    setSelectedDongMap(new Map());
    setFailedRegistrationTargets([]);
  };

  const handleAddDistrictAllDongs = async () => {
    if (!selectedCity || !selectedDistrict) {
      setErrorMessage('시/도와 시/군/구를 먼저 선택해 주세요.');
      return;
    }

    setIsBulkSelecting(true);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const districtDongs = await loadAllMasterDongsForDistrict(selectedCity, selectedDistrict);
      let addedCount = 0;
      let skippedCount = 0;
      setSelectedDongMap((prev) => {
        const next = new Map(prev);
        for (const item of districtDongs) {
          if (next.has(item.code)) {
            skippedCount += 1;
            continue;
          }
          next.set(item.code, item);
          addedCount += 1;
        }
        return next;
      });
      setResultMessage(`구 전체 선택 결과: 추가 ${addedCount}건, 스킵 ${skippedCount}건, 대상 ${districtDongs.length}건`);
      setFailedRegistrationTargets([]);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsBulkSelecting(false);
    }
  };

  const registerTargets = async (targets: ServiceAreaMasterDong[], retryFailedOnly: boolean) => {
    if (targets.length === 0) {
      setErrorMessage('등록할 동을 1개 이상 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setIsRetrySubmitting(retryFailedOnly);
    setSubmittingTargetCount(targets.length);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const activeKeys = await loadAllActiveAreaKeys();
      let addedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const failedTargets: ServiceAreaMasterDong[] = [];
      const failureMessages: string[] = [];

      for (const item of targets) {
        const key = toAreaKey(item.city, item.district, item.dong);
        if (activeKeys.has(key)) {
          skippedCount += 1;
          continue;
        }
        try {
          await createOpsServiceAreaByCode({ code: item.code });
          activeKeys.add(key);
          addedCount += 1;
        } catch (error) {
          failedCount += 1;
          failedTargets.push(item);
          failureMessages.push(`${formatAreaLabel(item)}: ${toErrorMessage(error)}`);
        }
      }

      setResultMessage(`등록 결과: 추가 ${addedCount}건, 스킵 ${skippedCount}건, 실패 ${failedCount}건`);
      if (failureMessages.length > 0) {
        setErrorMessage(failureMessages.slice(0, 2).join('\n'));
      }
      setFailedRegistrationTargets(failedTargets);

      if (addedCount > 0) {
        await loadAreas(appliedQuery, activeParam);
      }
      if (failedTargets.length > 0) {
        const failedMap = new Map<string, ServiceAreaMasterDong>();
        failedTargets.forEach((item) => failedMap.set(item.code, item));
        setSelectedDongMap(failedMap);
      } else {
        clearSelectedDongs();
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setIsRetrySubmitting(false);
      setSubmittingTargetCount(0);
    }
  };

  const handleRegisterSelected = async () => {
    await registerTargets(selectedDongList, false);
  };

  const handleRetryFailedRegistrations = async () => {
    if (failedRegistrationTargets.length === 0) {
      setErrorMessage('재시도할 실패 건이 없습니다.');
      return;
    }
    await registerTargets(failedRegistrationTargets, true);
  };

  const handleDeactivate = async (serviceAreaId: number) => {
    setUpdatingAreaId(serviceAreaId);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const updated = await deactivateOpsServiceArea(serviceAreaId);
      setResultMessage(`비활성화 처리되었습니다: ${formatAreaLabel(updated)}`);
      await loadAreas(appliedQuery, activeParam);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setUpdatingAreaId(null);
    }
  };

  const handleReactivate = async (serviceAreaId: number) => {
    setUpdatingAreaId(serviceAreaId);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const updated = await reactivateOpsServiceArea(serviceAreaId);
      setResultMessage(`재활성화 처리되었습니다: ${formatAreaLabel(updated)}`);
      await loadAreas(appliedQuery, activeParam);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setUpdatingAreaId(null);
    }
  };

  const handleDeleteInactive = async (serviceAreaId: number) => {
    setDeletingAreaId(serviceAreaId);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      await deleteOpsServiceArea(serviceAreaId);
      setResultMessage('비활성 서비스 신청지역이 삭제되었습니다.');
      await loadAreas(appliedQuery, activeParam);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setDeletingAreaId(null);
    }
  };

  if (!canManage) {
    return (
      <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} includeTopInset>
        <View style={styles.screenContainer}>
          <View style={styles.headerCard}>
            <Text style={styles.badge}>운영 설정</Text>
            <Text style={styles.title}>서비스 신청지역</Text>
            <Text style={styles.description}>서비스 신청지역 등록/조회/상태 변경을 관리합니다.</Text>
          </View>
          <View style={styles.noPermissionCard}>
            <Text style={styles.errorText}>접근 권한이 없습니다.</Text>
            <Text style={styles.caption}>OPS_ADMIN 또는 SYS_ADMIN 권한이 필요합니다.</Text>
          </View>
        </View>
      </KeyboardAwareScrollScreen>
    );
  }

  return (
    <KeyboardAwareScrollScreen
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      includeTopInset
    >
      <View style={styles.screenContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.badge}>운영 설정</Text>
          <Text style={styles.title}>서비스 신청지역</Text>
          <Text style={styles.description}>OPS_ADMIN/SYS_ADMIN 권한으로 서비스 신청지역을 등록하고 상태를 관리합니다.</Text>
        </View>

        {resultMessage && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>{resultMessage}</Text>
          </View>
        )}
        {errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>선택형 지역 등록 (시/구/동 트리)</Text>
          <Text style={styles.caption}>행정구역 마스터를 검색해 동을 선택하고 등록합니다.</Text>

          <Text style={styles.fieldLabel}>1) 시/도 선택</Text>
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
            <Pressable
              style={[styles.inlineButton, isCityLoading && styles.buttonDisabled]}
              onPress={() => void handleCitySearch()}
              disabled={isCityLoading}
            >
              <Text style={styles.inlineButtonText}>{isCityLoading ? '조회 중' : '조회'}</Text>
            </Pressable>
          </View>
          <View style={styles.chipWrap}>
            {cityOptions.map((city) => (
              <Pressable
                key={city}
                style={[styles.chip, selectedCity === city && styles.chipActive]}
                onPress={() => handleSelectCity(city)}
              >
                <Text style={[styles.chipText, selectedCity === city && styles.chipTextActive]}>{city}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>2) 시/군/구 선택</Text>
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
              style={[styles.inlineButton, (!selectedCity || isDistrictLoading) && styles.buttonDisabled]}
              onPress={() => void handleDistrictSearch()}
              disabled={!selectedCity || isDistrictLoading}
            >
              <Text style={styles.inlineButtonText}>{isDistrictLoading ? '조회 중' : '조회'}</Text>
            </Pressable>
          </View>
          <View style={styles.chipWrap}>
            {districtOptions.map((district) => (
              <Pressable
                key={`${selectedCity ?? 'city'}-${district}`}
                style={[styles.chip, selectedDistrict === district && styles.chipActive]}
                onPress={() => handleSelectDistrict(district)}
              >
                <Text style={[styles.chipText, selectedDistrict === district && styles.chipTextActive]}>
                  {district}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[
              styles.bulkButton,
              (!selectedDistrict || isBulkSelecting || isSubmitting) && styles.buttonDisabled,
            ]}
            onPress={() => void handleAddDistrictAllDongs()}
            disabled={!selectedDistrict || isBulkSelecting || isSubmitting}
          >
            <Text style={styles.bulkButtonText}>
              {isBulkSelecting ? '구 전체 동 불러오는 중...' : '선택한 구 전체 동 추가'}
            </Text>
          </Pressable>

          <Text style={styles.fieldLabel}>3) 동 선택 (다중 선택)</Text>
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
              style={[styles.inlineButton, (!selectedDistrict || isDongLoading || isSubmitting) && styles.buttonDisabled]}
              onPress={() => void handleDongSearch()}
              disabled={!selectedDistrict || isDongLoading || isSubmitting}
            >
              <Text style={styles.inlineButtonText}>{isDongLoading ? '조회 중' : '조회'}</Text>
            </Pressable>
          </View>

          {isDongLoading && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>동 목록을 불러오는 중입니다...</Text>
              </View>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
            </View>
          )}

          {!isDongLoading && dongOptions.length === 0 && (
            <View style={styles.emptyInlineCard}>
              <Text style={styles.caption}>조회된 동이 없습니다.</Text>
            </View>
          )}

          {!isDongLoading && dongOptions.length > 0 && (
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
            </View>
          )}

          <View style={styles.selectedCountRow}>
            <Text style={styles.caption}>선택된 동</Text>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{selectedDongList.length}건</Text>
            </View>
          </View>
          <View style={styles.chipWrap}>
            {selectedDongList.map((item) => (
              <Pressable
                key={`selected-${item.code}`}
                style={styles.selectedChip}
                onPress={() => removeSelectedDong(item.code)}
              >
                <Text style={styles.selectedChipText}>{formatAreaLabel(item)} (해제)</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.primaryButton, (isSubmitting || isBulkSelecting) && styles.buttonDisabled]}
              onPress={() => void handleRegisterSelected()}
              disabled={isSubmitting || isBulkSelecting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? '등록 중...' : `선택 지역 등록 (${selectedDongList.length})`}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={clearSelectedDongs}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonText}>선택 초기화</Text>
            </Pressable>
          </View>

          {isSubmitting && (
            <View style={styles.progressCard}>
              <Text style={styles.progressText}>
                {isRetrySubmitting
                  ? `실패 건 재시도 중입니다. (${submittingTargetCount}건)`
                  : `대량 등록 처리 중입니다. (${submittingTargetCount}건)`}
              </Text>
            </View>
          )}

          {failedRegistrationTargets.length > 0 && !isSubmitting && (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>실패 {failedRegistrationTargets.length}건이 남아 있습니다.</Text>
              <Pressable style={styles.retryButton} onPress={() => void handleRetryFailedRegistrations()}>
                <Text style={styles.retryButtonText}>실패 건 재시도</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>등록 지역 조회/상태 관리</Text>
          <Text style={styles.caption}>검색 후 활성/비활성 상태를 변경하거나 비활성 항목을 삭제합니다.</Text>

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
            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSearch}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>검색</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>초기화</Text>
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.caption}>{appliedQuery ? `검색어: ${appliedQuery}` : '전체 지역'}</Text>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{totalCount}건</Text>
            </View>
          </View>

          {isLoading && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>서비스 신청지역 목록을 불러오는 중입니다...</Text>
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

          {!isLoading && areas.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>조회된 서비스 신청지역이 없습니다</Text>
              <Text style={styles.emptyDescription}>검색어 또는 필터를 조정한 뒤 다시 조회해 주세요.</Text>
            </View>
          )}

          {!isLoading && areas.length > 0 && (
            <View style={styles.listWrap}>
              {areas.map((area) => (
                <View key={area.id} style={styles.listItem}>
                  <View style={styles.selectedCountRow}>
                    <Text style={styles.listTitle}>{formatAreaLabel(area)}</Text>
                    <View style={[styles.statusBadge, area.active ? styles.statusActiveBadge : styles.statusInactiveBadge]}>
                      <Text style={[styles.statusBadgeText, area.active ? styles.statusActiveText : styles.statusInactiveText]}>
                        {area.active ? '활성' : '비활성'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.listSub}>업데이트: {formatDateTime(area.updatedAt)}</Text>

                  {area.active && (
                    <Pressable
                      style={[styles.dangerButton, updatingAreaId === area.id && styles.buttonDisabled]}
                      onPress={() => void handleDeactivate(area.id)}
                      disabled={updatingAreaId !== null || deletingAreaId !== null}
                    >
                      <Text style={styles.dangerButtonText}>
                        {updatingAreaId === area.id ? '처리 중...' : '비활성화'}
                      </Text>
                    </Pressable>
                  )}

                  {!area.active && (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.reactivateButton, updatingAreaId === area.id && styles.buttonDisabled]}
                        onPress={() => void handleReactivate(area.id)}
                        disabled={updatingAreaId !== null || deletingAreaId !== null}
                      >
                        <Text style={styles.reactivateButtonText}>
                          {updatingAreaId === area.id ? '처리 중...' : '재활성화'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.dangerButton, deletingAreaId === area.id && styles.buttonDisabled]}
                        onPress={() => void handleDeleteInactive(area.id)}
                        disabled={updatingAreaId !== null || deletingAreaId !== null}
                      >
                        <Text style={styles.dangerButtonText}>
                          {deletingAreaId === area.id ? '처리 중...' : '삭제'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
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
    color: colors.textStrong,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
  fieldLabel: {
    fontSize: 14,
    color: colors.textStrong,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    color: colors.caption,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.textStrong,
    backgroundColor: '#ffffff',
    fontSize: 14,
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
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  inlineButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  bulkButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 14,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#1d4ed8',
  },
  selectedCountRow: {
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
  selectedChip: {
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedChipText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#1d4ed8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: colors.textStrong,
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  skeletonLineShort: {
    height: 10,
    width: '34%',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  skeletonLineLong: {
    height: 10,
    width: '78%',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  emptyInlineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
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
  successCard: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  progressCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
  },
  progressText: {
    color: '#1d4ed8',
    fontSize: 13,
    lineHeight: 18,
  },
  warningCard: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  warningText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '600',
  },
  retryButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
  },
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: '#ffffff',
  },
  listItemSelected: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  listTitle: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  listSub: {
    color: colors.text,
    fontSize: 12,
  },
  pickText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  pickTextSelected: {
    color: colors.success,
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
  statusActiveBadge: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  statusInactiveBadge: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  statusActiveText: {
    color: colors.success,
  },
  statusInactiveText: {
    color: '#b45309',
  },
  dangerButton: {
    flex: 1,
    height: 44,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
  },
  dangerButtonText: {
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '700',
  },
  reactivateButton: {
    flex: 1,
    height: 44,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  reactivateButtonText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
  noPermissionCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
});
