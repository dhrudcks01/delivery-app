import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchRoadAddresses } from '../api/addressApi';
import {
  createUserAddress,
  deleteUserAddress,
  getUserAddresses,
  setPrimaryUserAddress,
  updateUserAddress,
} from '../api/userAddressApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { clearLegacyUserAddresses, loadLegacyUserAddresses } from '../storage/userAddressStorage';
import { AddressItem } from '../types/address';
import { UserAddress, UserAddressUpsertPayload } from '../types/userAddress';
import { buildWasteRequestAddress } from '../utils/wasteRequestAddress';
import { ui } from '../theme/ui';
import { toApiErrorMessage } from '../utils/errorMessage';
import { useUserAddressManagementDerived } from './hooks/useUserAddressManagementDerived';
import { UserAddressManagementHeaderSection } from './sections/UserAddressManagementSections';

const ERROR_MESSAGE_OPTIONS = {
  defaultMessage: '주소 처리 중 오류가 발생했습니다.',
  timeoutMessage: '주소 처리 중 오류가 발생했습니다.',
  networkMessage: '주소 처리 중 오류가 발생했습니다.',
};

function formatAddress(item: UserAddress): string {
  const result = buildWasteRequestAddress(item);
  if (result.ok) {
    return result.address;
  }
  return item.roadAddress || item.jibunAddress || '-';
}

export function UserAddressManagementScreen() {
  const { me } = useAuth();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [roadAddress, setRoadAddress] = useState('');
  const [jibunAddress, setJibunAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [isPrimaryDraft, setIsPrimaryDraft] = useState(false);

  const isEditing = editingAddressId !== null;

  const toUpsertPayload = useCallback((
    payload: {
      roadAddress: string;
      jibunAddress: string;
      zipCode: string;
      detailAddress: string;
      isPrimary: boolean;
    },
  ): UserAddressUpsertPayload => ({
    roadAddress: payload.roadAddress.trim(),
    jibunAddress: payload.jibunAddress.trim() || undefined,
    zipCode: payload.zipCode.trim() || undefined,
    detailAddress: payload.detailAddress.trim() || undefined,
    isPrimary: payload.isPrimary,
  }), []);

  const migrateLegacyAddresses = useCallback(async (): Promise<boolean> => {
    if (!me?.id) {
      return false;
    }

    const legacyAddresses = await loadLegacyUserAddresses(me.id);
    if (legacyAddresses.length === 0) {
      return false;
    }

    const sorted = [...legacyAddresses].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
    for (const legacy of sorted) {
      const payload: UserAddressUpsertPayload = {
        roadAddress: legacy.roadAddress.trim(),
        jibunAddress: legacy.jibunAddress.trim() || undefined,
        zipCode: legacy.zipCode.trim() || undefined,
        detailAddress: legacy.detailAddress.trim() || undefined,
        isPrimary: legacy.isPrimary,
      };
      await createUserAddress(payload);
    }
    await clearLegacyUserAddresses(me.id);
    return true;
  }, [me?.id]);

  const loadAddresses = useCallback(async () => {
    if (!me) {
      setAddresses([]);
      return;
    }

    setIsLoadingAddresses(true);
    setErrorMessage(null);

    try {
      let loaded = await getUserAddresses();
      if (loaded.length === 0) {
        const migrated = await migrateLegacyAddresses();
        if (migrated) {
          loaded = await getUserAddresses();
          setResultMessage('기기 로컬 주소를 서버로 이전했습니다.');
        }
      }
      if (loaded.length > 0 && me?.id) {
        await clearLegacyUserAddresses(me.id);
      }
      setAddresses(loaded);
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [me, migrateLegacyAddresses]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const resetForm = useCallback(() => {
    setEditingAddressId(null);
    setRoadAddress('');
    setJibunAddress('');
    setZipCode('');
    setDetailAddress('');
    setIsPrimaryDraft(addresses.length === 0);
    setAddressQuery('');
    setSearchResults([]);
    setSearchError(null);
  }, [addresses.length]);

  const handleSearchAddress = async () => {
    const query = addressQuery.trim();
    if (!query) {
      setSearchError('검색어를 입력해 주세요.');
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await searchRoadAddresses(query, 7);
      setSearchResults(response.results);
      if (response.results.length === 0) {
        setSearchError('검색 결과가 없습니다.');
      }
    } catch (error) {
      setSearchError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: AddressItem) => {
    setRoadAddress(item.roadAddress);
    setJibunAddress(item.jibunAddress);
    setZipCode(item.zipCode);
    setSearchError(null);
  };

  const handleStartEdit = (item: UserAddress) => {
    setEditingAddressId(item.id);
    setRoadAddress(item.roadAddress);
    setJibunAddress(item.jibunAddress);
    setZipCode(item.zipCode);
    setDetailAddress(item.detailAddress);
    setIsPrimaryDraft(item.isPrimary);
    setAddressQuery(item.roadAddress);
    setSearchResults([]);
    setSearchError(null);
    setErrorMessage(null);
    setResultMessage(null);
  };

  const handleSaveAddress = async () => {
    if (!me?.id) {
      setErrorMessage('사용자 정보를 확인할 수 없습니다.');
      return;
    }

    const addressBuildResult = buildWasteRequestAddress({
      roadAddress,
      jibunAddress,
      detailAddress,
    });
    if (!addressBuildResult.ok) {
      setErrorMessage(addressBuildResult.message);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const payload = toUpsertPayload({
        roadAddress,
        jibunAddress,
        zipCode,
        detailAddress,
        isPrimary: isPrimaryDraft,
      });
      if (editingAddressId) {
        await updateUserAddress(editingAddressId, payload);
      } else {
        await createUserAddress(payload);
      }
      await loadAddresses();
      setResultMessage(editingAddressId ? '주소를 수정했습니다.' : '주소를 등록했습니다.');
      resetForm();
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPrimaryAddress = async (addressId: number) => {
    setErrorMessage(null);
    setResultMessage(null);

    try {
      await setPrimaryUserAddress(addressId);
      await loadAddresses();
      setResultMessage('대표 주소지를 변경했습니다.');
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    setErrorMessage(null);
    setResultMessage(null);

    try {
      await deleteUserAddress(addressId);
      await loadAddresses();
      if (editingAddressId === addressId) {
        resetForm();
      }
      setResultMessage('주소를 삭제했습니다.');
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    }
  };

  const { primaryAddressId } = useUserAddressManagementDerived({ addresses });

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <UserAddressManagementHeaderSection styles={styles} loginId={me?.loginId ?? me?.email ?? '-'} />

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>등록된 주소</Text>
          <Pressable
            style={[styles.secondaryButtonCompact, isLoadingAddresses && styles.buttonDisabled]}
            onPress={() => void loadAddresses()}
            disabled={isLoadingAddresses}
          >
            <Text style={styles.secondaryButtonCompactText}>{isLoadingAddresses ? '불러오는 중...' : '새로고침'}</Text>
          </Pressable>
        </View>

        {isLoadingAddresses && (
          <View style={styles.skeletonGroup}>
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

        {errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {resultMessage && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>{resultMessage}</Text>
          </View>
        )}

        {!isLoadingAddresses && addresses.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>[]</Text>
            <Text style={styles.emptyTitle}>등록된 주소가 없습니다</Text>
            <Text style={styles.emptyDescription}>아래 입력 폼에서 주소를 검색하고 등록해 주세요.</Text>
          </View>
        )}

        {addresses.map((item) => {
          const isPrimary = item.id === primaryAddressId;
          return (
            <View key={item.id} style={styles.addressCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.addressTitle}>{formatAddress(item)}</Text>
                {isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>대표주소</Text>
                  </View>
                )}
              </View>

              <Text style={styles.addressMeta}>우편번호: {item.zipCode || '-'}</Text>
              <Text style={styles.addressMeta}>지번주소: {item.jibunAddress || '-'}</Text>
              <Text style={styles.addressMeta}>상세주소: {item.detailAddress || '-'}</Text>

              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.secondaryButtonSmall, isPrimary && styles.buttonDisabled]}
                  onPress={() => void handleSetPrimaryAddress(item.id)}
                  disabled={isPrimary}
                >
                  <Text style={styles.secondaryButtonSmallText}>대표로 설정</Text>
                </Pressable>
                <Pressable style={styles.secondaryButtonSmall} onPress={() => handleStartEdit(item)}>
                  <Text style={styles.secondaryButtonSmallText}>수정</Text>
                </Pressable>
                <Pressable style={styles.dangerButtonSmall} onPress={() => void handleDeleteAddress(item.id)}>
                  <Text style={styles.dangerButtonSmallText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{isEditing ? '주소 수정' : '새 주소 등록'}</Text>

        <Text style={styles.label}>주소 검색</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            value={addressQuery}
            onChangeText={setAddressQuery}
            placeholder="도로명 주소 검색어 입력"
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            onSubmitEditing={() => void handleSearchAddress()}
          />
          <Pressable
            style={[styles.secondaryButtonCompact, isSearching && styles.buttonDisabled]}
            onPress={() => void handleSearchAddress()}
            disabled={isSearching}
          >
            <Text style={styles.secondaryButtonCompactText}>{isSearching ? '검색 중...' : '주소 검색'}</Text>
          </Pressable>
        </View>

        {searchError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{searchError}</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.searchResultGroup}>
            {searchResults.map((item) => {
              const key = `${item.roadAddress}-${item.zipCode}`;
              const selected = item.roadAddress === roadAddress;
              return (
                <Pressable
                  key={key}
                  style={[styles.searchResultCard, selected && styles.searchResultCardSelected]}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <Text style={styles.searchResultTitle}>{item.roadAddress}</Text>
                  <Text style={styles.searchResultMeta}>[{item.zipCode}] {item.jibunAddress || '-'}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>선택 주소</Text>
        <TextInput
          style={styles.input}
          value={roadAddress}
          editable={false}
          placeholder="주소 검색 후 선택해 주세요"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>상세 주소</Text>
        <TextInput
          style={styles.input}
          value={detailAddress}
          onChangeText={setDetailAddress}
          placeholder="동/호수 등 상세 주소"
          placeholderTextColor="#94a3b8"
          returnKeyType="done"
        />

        <Pressable
          style={[styles.checkboxRow, isPrimaryDraft && styles.checkboxRowActive]}
          onPress={() => setIsPrimaryDraft((prev) => !prev)}
        >
          <View style={[styles.checkbox, isPrimaryDraft && styles.checkboxActive]}>
            <Text style={[styles.checkboxMark, isPrimaryDraft && styles.checkboxMarkActive]}>{isPrimaryDraft ? '✓' : ''}</Text>
          </View>
          <Text style={styles.checkboxLabel}>대표 주소지로 저장</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          onPress={() => void handleSaveAddress()}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? '저장 중...' : isEditing ? '수정 저장' : '주소 등록'}</Text>
        </Pressable>

        {isEditing && (
          <Pressable style={styles.secondaryButton} onPress={resetForm}>
            <Text style={styles.secondaryButtonText}>수정 취소</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: ui.colors.background,
    gap: 24,
  },
  headerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    padding: 16,
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
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
  caption: {
    fontSize: 12,
    color: ui.colors.caption,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.textStrong,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.colors.textStrong,
  },
  skeletonGroup: {
    gap: 10,
  },
  skeletonCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  skeletonLineShort: {
    height: 10,
    width: '46%',
    borderRadius: 999,
    backgroundColor: '#dbe2ea',
  },
  skeletonLineLong: {
    height: 10,
    width: '78%',
    borderRadius: 999,
    backgroundColor: '#dbe2ea',
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: ui.colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  successCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: {
    color: ui.colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#ffffff',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: {
    color: ui.colors.caption,
    fontSize: 16,
  },
  emptyTitle: {
    color: ui.colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDescription: {
    color: ui.colors.caption,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  addressCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6,
  },
  addressTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  addressMeta: {
    color: ui.colors.caption,
    fontSize: 12,
  },
  primaryBadge: {
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  primaryBadgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  secondaryButtonSmall: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonSmallText: {
    color: ui.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  dangerButtonSmall: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  dangerButtonSmallText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: ui.colors.textStrong,
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  searchResultGroup: {
    gap: 8,
  },
  searchResultCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    backgroundColor: '#ffffff',
  },
  searchResultCardSelected: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  searchResultTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
    fontSize: 13,
  },
  searchResultMeta: {
    color: ui.colors.caption,
    fontSize: 12,
  },
  checkboxRow: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxRowActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#dbeafe',
  },
  checkboxMark: {
    color: 'transparent',
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxMarkActive: {
    color: ui.colors.primary,
  },
  checkboxLabel: {
    color: ui.colors.textStrong,
    fontSize: 14,
    flex: 1,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: ui.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: ui.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonCompact: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonCompactText: {
    color: ui.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});



