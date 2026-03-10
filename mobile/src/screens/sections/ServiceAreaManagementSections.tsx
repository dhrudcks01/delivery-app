import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { ServiceArea, ServiceAreaMasterDong } from '../../types/serviceArea';
import { ui } from '../../theme/ui';

type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type ScreenStyles = Record<string, any>;

type ServiceAreaNoPermissionSectionProps = {
  styles: ScreenStyles;
};

type ServiceAreaManagementContentSectionProps = {
  styles: ScreenStyles;
  primaryColor: string;
  resultMessage: string | null;
  errorMessage: string | null;
  citySearchInput: string;
  onChangeCitySearchInput: (value: string) => void;
  cityOptions: string[];
  selectedCity: string | null;
  districtSearchInput: string;
  onChangeDistrictSearchInput: (value: string) => void;
  districtOptions: string[];
  selectedDistrict: string | null;
  dongSearchInput: string;
  onChangeDongSearchInput: (value: string) => void;
  dongOptions: ServiceAreaMasterDong[];
  selectedDongMap: Map<string, ServiceAreaMasterDong>;
  selectedDongList: ServiceAreaMasterDong[];
  failedRegistrationTargets: ServiceAreaMasterDong[];
  isCityLoading: boolean;
  isDistrictLoading: boolean;
  isDongLoading: boolean;
  isBulkSelecting: boolean;
  isSubmitting: boolean;
  isRetrySubmitting: boolean;
  submittingTargetCount: number;
  queryInput: string;
  onChangeQueryInput: (value: string) => void;
  appliedQuery: string;
  totalCount: number;
  activeFilter: ActiveFilter;
  areas: ServiceArea[];
  isLoading: boolean;
  updatingAreaId: number | null;
  deletingAreaId: number | null;
  onSearchCity: () => void;
  onSelectCity: (city: string) => void;
  onSearchDistrict: () => void;
  onSelectDistrict: (district: string) => void;
  onAddDistrictAllDongs: () => void;
  onSearchDong: () => void;
  onToggleDongSelection: (item: ServiceAreaMasterDong) => void;
  onRemoveSelectedDong: (code: string) => void;
  onRegisterSelected: () => void;
  onClearSelectedDongs: () => void;
  onRetryFailedRegistrations: () => void;
  onChangeActiveFilter: (filter: ActiveFilter) => void;
  onSearchAreas: () => void;
  onResetAreas: () => void;
  onDeactivateArea: (id: number) => void;
  onReactivateArea: (id: number) => void;
  onDeleteInactiveArea: (id: number) => void;
  formatAreaLabel: (area: Pick<ServiceArea, 'city' | 'district' | 'dong'>) => string;
  formatDateTime: (dateTime: string) => string;
};

export function ServiceAreaNoPermissionSection({ styles }: ServiceAreaNoPermissionSectionProps) {
  return (
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
  );
}

export function ServiceAreaManagementContentSection({
  styles,
  primaryColor,
  resultMessage,
  errorMessage,
  citySearchInput,
  onChangeCitySearchInput,
  cityOptions,
  selectedCity,
  districtSearchInput,
  onChangeDistrictSearchInput,
  districtOptions,
  selectedDistrict,
  dongSearchInput,
  onChangeDongSearchInput,
  dongOptions,
  selectedDongMap,
  selectedDongList,
  failedRegistrationTargets,
  isCityLoading,
  isDistrictLoading,
  isDongLoading,
  isBulkSelecting,
  isSubmitting,
  isRetrySubmitting,
  submittingTargetCount,
  queryInput,
  onChangeQueryInput,
  appliedQuery,
  totalCount,
  activeFilter,
  areas,
  isLoading,
  updatingAreaId,
  deletingAreaId,
  onSearchCity,
  onSelectCity,
  onSearchDistrict,
  onSelectDistrict,
  onAddDistrictAllDongs,
  onSearchDong,
  onToggleDongSelection,
  onRemoveSelectedDong,
  onRegisterSelected,
  onClearSelectedDongs,
  onRetryFailedRegistrations,
  onChangeActiveFilter,
  onSearchAreas,
  onResetAreas,
  onDeactivateArea,
  onReactivateArea,
  onDeleteInactiveArea,
  formatAreaLabel,
  formatDateTime,
}: ServiceAreaManagementContentSectionProps) {
  return (
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
            onChangeText={onChangeCitySearchInput}
            placeholder="시/도 검색어 (예: 서울)"
            placeholderTextColor={ui.colors.placeholder}
            returnKeyType="search"
            onSubmitEditing={() => onSearchCity()}
          />
          <Pressable
            style={[styles.inlineButton, isCityLoading && styles.buttonDisabled]}
            onPress={onSearchCity}
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
              onPress={() => onSelectCity(city)}
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
            onChangeText={onChangeDistrictSearchInput}
            placeholder={selectedCity ? '시/군/구 검색어 (예: 마포)' : '먼저 시/도를 선택해 주세요.'}
            placeholderTextColor={ui.colors.placeholder}
            editable={!!selectedCity}
            returnKeyType="search"
            onSubmitEditing={() => onSearchDistrict()}
          />
          <Pressable
            style={[styles.inlineButton, (!selectedCity || isDistrictLoading) && styles.buttonDisabled]}
            onPress={onSearchDistrict}
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
              onPress={() => onSelectDistrict(district)}
            >
              <Text style={[styles.chipText, selectedDistrict === district && styles.chipTextActive]}>{district}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[
            styles.bulkButton,
            (!selectedDistrict || isBulkSelecting || isSubmitting) && styles.buttonDisabled,
          ]}
          onPress={onAddDistrictAllDongs}
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
            onChangeText={onChangeDongSearchInput}
            placeholder={selectedDistrict ? '동 검색어 (예: 서교)' : '먼저 시/군/구를 선택해 주세요.'}
            placeholderTextColor={ui.colors.placeholder}
            editable={!!selectedDistrict}
            returnKeyType="search"
            onSubmitEditing={() => onSearchDong()}
          />
          <Pressable
            style={[styles.inlineButton, (!selectedDistrict || isDongLoading || isSubmitting) && styles.buttonDisabled]}
            onPress={onSearchDong}
            disabled={!selectedDistrict || isDongLoading || isSubmitting}
          >
            <Text style={styles.inlineButtonText}>{isDongLoading ? '조회 중' : '조회'}</Text>
          </Pressable>
        </View>

        {isDongLoading && (
          <View style={styles.loadingGroup}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={primaryColor} />
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
                  onPress={() => onToggleDongSelection(item)}
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
              onPress={() => onRemoveSelectedDong(item.code)}
            >
              <Text style={styles.selectedChipText}>{formatAreaLabel(item)} (해제)</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, (isSubmitting || isBulkSelecting) && styles.buttonDisabled]}
            onPress={onRegisterSelected}
            disabled={isSubmitting || isBulkSelecting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? '등록 중...' : `선택 지역 등록 (${selectedDongList.length})`}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onClearSelectedDongs}
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
            <Pressable style={styles.retryButton} onPress={onRetryFailedRegistrations}>
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
          onChangeText={onChangeQueryInput}
          placeholder="검색어(시/구/동)"
          placeholderTextColor={ui.colors.placeholder}
          returnKeyType="search"
          onSubmitEditing={onSearchAreas}
        />

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => onChangeActiveFilter('ALL')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>전체</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, activeFilter === 'ACTIVE' && styles.filterChipActive]}
            onPress={() => onChangeActiveFilter('ACTIVE')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ACTIVE' && styles.filterChipTextActive]}>활성</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, activeFilter === 'INACTIVE' && styles.filterChipActive]}
            onPress={() => onChangeActiveFilter('INACTIVE')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'INACTIVE' && styles.filterChipTextActive]}>
              비활성
            </Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={onSearchAreas}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>검색</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
            onPress={onResetAreas}
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
              <ActivityIndicator size="small" color={primaryColor} />
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
                    onPress={() => onDeactivateArea(area.id)}
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
                      onPress={() => onReactivateArea(area.id)}
                      disabled={updatingAreaId !== null || deletingAreaId !== null}
                    >
                      <Text style={styles.reactivateButtonText}>
                        {updatingAreaId === area.id ? '처리 중...' : '재활성화'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.dangerButton, deletingAreaId === area.id && styles.buttonDisabled]}
                      onPress={() => onDeleteInactiveArea(area.id)}
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
  );
}


