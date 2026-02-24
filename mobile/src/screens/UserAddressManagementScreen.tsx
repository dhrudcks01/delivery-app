import { AxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchRoadAddresses } from '../api/addressApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { loadUserAddresses, saveUserAddresses } from '../storage/userAddressStorage';
import { ui } from '../theme/ui';
import { AddressItem } from '../types/address';
import { UserAddress } from '../types/userAddress';
import { ApiErrorResponse } from '../types/waste';

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '주소 처리 중 오류가 발생했습니다.';
  }
  return '주소 처리 중 오류가 발생했습니다.';
}

function formatAddress(item: UserAddress): string {
  const detail = item.detailAddress.trim();
  return detail ? `${item.roadAddress} ${detail}` : item.roadAddress;
}

function createAddressId(): string {
  return `addr-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [roadAddress, setRoadAddress] = useState('');
  const [jibunAddress, setJibunAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [isPrimaryDraft, setIsPrimaryDraft] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!me?.id) {
      setAddresses([]);
      return;
    }

    setIsLoadingAddresses(true);
    setErrorMessage(null);

    try {
      const stored = await loadUserAddresses(me.id);
      setAddresses(stored);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [me?.id]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const resetForm = () => {
    setEditingAddressId(null);
    setRoadAddress('');
    setJibunAddress('');
    setZipCode('');
    setDetailAddress('');
    setIsPrimaryDraft(addresses.length === 0);
    setAddressQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const persistAddresses = async (nextAddresses: UserAddress[]) => {
    if (!me?.id) {
      return;
    }
    await saveUserAddresses(me.id, nextAddresses);
    setAddresses(nextAddresses);
  };

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
      setSearchError(toErrorMessage(error));
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

    if (!roadAddress.trim()) {
      setErrorMessage('도로명 주소를 검색 후 선택해 주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setResultMessage(null);

    const now = new Date().toISOString();

    try {
      const nextAddresses = editingAddressId
        ? addresses.map((item) => {
            if (item.id !== editingAddressId) {
              return isPrimaryDraft ? { ...item, isPrimary: false } : item;
            }
            return {
              ...item,
              roadAddress: roadAddress.trim(),
              jibunAddress: jibunAddress.trim(),
              zipCode: zipCode.trim(),
              detailAddress: detailAddress.trim(),
              isPrimary: isPrimaryDraft,
              updatedAt: now,
            };
          })
        : [
            ...addresses.map((item) => ({
              ...item,
              isPrimary: isPrimaryDraft || addresses.length === 0 ? false : item.isPrimary,
            })),
            {
              id: createAddressId(),
              roadAddress: roadAddress.trim(),
              jibunAddress: jibunAddress.trim(),
              zipCode: zipCode.trim(),
              detailAddress: detailAddress.trim(),
              isPrimary: isPrimaryDraft || addresses.length === 0,
              createdAt: now,
              updatedAt: now,
            },
          ];

      const hasPrimary = nextAddresses.some((item) => item.isPrimary);
      const normalized = hasPrimary
        ? nextAddresses
        : nextAddresses.map((item, index) => ({ ...item, isPrimary: index === 0 }));

      await persistAddresses(normalized);
      setResultMessage(editingAddressId ? '주소를 수정했습니다.' : '주소를 등록했습니다.');
      resetForm();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPrimaryAddress = async (addressId: string) => {
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const nextAddresses = addresses.map((item) => ({
        ...item,
        isPrimary: item.id === addressId,
        updatedAt: item.id === addressId ? new Date().toISOString() : item.updatedAt,
      }));
      await persistAddresses(nextAddresses);
      setResultMessage('대표 주소지를 변경했습니다.');
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const filtered = addresses.filter((item) => item.id !== addressId);
      const hasPrimary = filtered.some((item) => item.isPrimary);
      const normalized = hasPrimary
        ? filtered
        : filtered.map((item, index) => ({ ...item, isPrimary: index === 0 }));
      await persistAddresses(normalized);
      if (editingAddressId === addressId) {
        resetForm();
      }
      setResultMessage('주소를 삭제했습니다.');
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  };

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>주소관리</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>등록된 주소</Text>
          <Pressable style={styles.ghostButton} onPress={loadAddresses}>
            <Text style={styles.ghostButtonText}>목록 새로고침</Text>
          </Pressable>
        </View>

        {isLoadingAddresses && <Text style={styles.meta}>주소 목록을 불러오는 중입니다.</Text>}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {resultMessage && <Text style={styles.success}>{resultMessage}</Text>}

        {addresses.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.rowBetween}>
              <Text style={styles.listTitle}>{formatAddress(item)}</Text>
              {item.isPrimary && <Text style={styles.primaryBadge}>대표</Text>}
            </View>
            <Text style={styles.listSub}>우편번호: {item.zipCode || '-'}</Text>
            <Text style={styles.listSub}>지번: {item.jibunAddress || '-'}</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, item.isPrimary && styles.actionButtonDisabled]}
                onPress={() => void handleSetPrimaryAddress(item.id)}
                disabled={item.isPrimary}
              >
                <Text style={styles.actionButtonText}>대표로 설정</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => handleStartEdit(item)}>
                <Text style={styles.actionButtonText}>수정</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => void handleDeleteAddress(item.id)}>
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {!isLoadingAddresses && addresses.length === 0 && (
          <Text style={styles.meta}>등록된 주소가 없습니다. 아래에서 주소를 등록해 주세요.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingAddressId ? '주소 수정' : '새 주소 등록'}</Text>

        <Text style={styles.label}>주소 검색</Text>
        <View style={styles.rowGap8}>
          <TextInput
            style={[styles.input, styles.flexInput]}
            value={addressQuery}
            onChangeText={setAddressQuery}
            placeholder="도로명 주소 검색어 입력"
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            onSubmitEditing={() => void handleSearchAddress()}
          />
          <Pressable
            style={[styles.ghostButton, isSearching && styles.actionButtonDisabled]}
            onPress={handleSearchAddress}
            disabled={isSearching}
          >
            <Text style={styles.ghostButtonText}>{isSearching ? '검색 중..' : '주소 검색'}</Text>
          </Pressable>
        </View>

        {searchError && <Text style={styles.error}>{searchError}</Text>}
        {searchResults.length > 0 && (
          <View style={styles.resultList}>
            {searchResults.map((item) => {
              const key = `${item.roadAddress}-${item.zipCode}`;
              const selected = item.roadAddress === roadAddress;
              return (
                <Pressable
                  key={key}
                  style={[styles.resultItem, selected && styles.resultItemSelected]}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <Text style={styles.listTitle}>{item.roadAddress}</Text>
                  <Text style={styles.listSub}>[{item.zipCode}] {item.jibunAddress || '-'}</Text>
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
          style={[styles.switchButton, isPrimaryDraft && styles.switchButtonActive]}
          onPress={() => setIsPrimaryDraft((prev) => !prev)}
        >
          <Text style={[styles.switchButtonText, isPrimaryDraft && styles.switchButtonTextActive]}>
            {isPrimaryDraft ? '대표 주소지로 저장됨' : '대표 주소지로 저장'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, isSaving && styles.actionButtonDisabled]}
          onPress={handleSaveAddress}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? '저장 중..' : editingAddressId ? '수정 저장' : '주소 등록'}</Text>
        </Pressable>

        {editingAddressId && (
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
  label: {
    fontSize: 13,
    color: ui.colors.textStrong,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.textStrong,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowGap8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flexInput: {
    flex: 1,
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
    gap: 4,
  },
  listTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
    fontSize: 13,
  },
  listSub: {
    color: ui.colors.text,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#9fc2b9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  actionButtonText: {
    color: ui.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  primaryBadge: {
    color: '#065f46',
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    borderColor: '#ef4444',
    backgroundColor: '#fff1f2',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  resultList: {
    gap: 6,
  },
  resultItem: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  resultItemSelected: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  switchButton: {
    borderWidth: 1,
    borderColor: '#9fc2b9',
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchButtonActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  switchButtonText: {
    color: ui.colors.text,
    fontWeight: '600',
  },
  switchButtonTextActive: {
    color: ui.colors.primary,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: ui.radius.control,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '600',
  },
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
  success: {
    color: ui.colors.success,
    fontSize: 13,
  },
});
