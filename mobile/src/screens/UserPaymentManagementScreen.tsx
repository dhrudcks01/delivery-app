import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getMyPaymentMethodStatus, startPaymentMethodRegistration } from '../api/paymentApi';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { PaymentMethodStatusResponse, PaymentMethodType } from '../types/payment';
import { ui } from '../theme/ui';
import { toApiErrorMessage } from '../utils/errorMessage';
import { getStatusBadgePalette, type StatusBadgeTone } from '../utils/statusBadge';
import { useUserPaymentManagementDerived } from './hooks/useUserPaymentManagementDerived';
import { UserPaymentManagementIntroSection } from './sections/UserPaymentManagementSections';

type CardOwnerType = 'PERSONAL' | 'BUSINESS';

const METHOD_OPTIONS: Array<{ type: PaymentMethodType; title: string; subtitle: string }> = [
  { type: 'CARD', title: '카드 직접 등록', subtitle: '소유한 카드를 직접 연결합니다.' },
  { type: 'TRANSFER_TOSS', title: '계좌이체(토스)', subtitle: '토스 페이지에서 계좌를 연결합니다.' },
  { type: 'KAKAOPAY', title: '카카오페이', subtitle: '카카오페이 간편결제로 연결합니다.' },
];

const ERROR_MESSAGE_OPTIONS = {
  defaultMessage: '결제수단 처리 중 오류가 발생했습니다.',
  timeoutMessage: '결제수단 처리 중 오류가 발생했습니다.',
  networkMessage: '결제수단 처리 중 오류가 발생했습니다.',
};

function formatDate(dateTime: string): string {
  return new Date(dateTime).toLocaleString();
}

function toMethodLabel(methodType: PaymentMethodType): string {
  if (methodType === 'TRANSFER_TOSS') {
    return '계좌이체(토스)';
  }
  if (methodType === 'KAKAOPAY') {
    return '카카오페이';
  }
  return '카드 직접 등록';
}

function normalizeCardNumber(input: string): string {
  return input.replace(/[^0-9]/g, '').slice(0, 16);
}

function formatCardNumberForDisplay(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function normalizeExpiry(input: string): string {
  const digits = input.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidExpiry(rawInput: string): boolean {
  const digits = rawInput.replace(/[^0-9]/g, '');
  if (digits.length !== 4) {
    return false;
  }
  const month = Number(digits.slice(0, 2));
  return month >= 1 && month <= 12;
}

function resolveMethodStatusBadgeTone(status: string): StatusBadgeTone {
  if (status.includes('ACTIVE') || status.includes('REGISTERED')) {
    return 'success';
  }
  if (status.includes('FAILED') || status.includes('ERROR')) {
    return 'error';
  }
  return 'warning';
}

export function UserPaymentManagementScreen() {
  const { me } = useAuth();

  const [status, setStatus] = useState<PaymentMethodStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [isMethodPickerVisible, setIsMethodPickerVisible] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<PaymentMethodType>('CARD');
  const [isCardFormVisible, setIsCardFormVisible] = useState(false);

  const [cardOwnerType, setCardOwnerType] = useState<CardOwnerType>('PERSONAL');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [passwordTwoDigits, setPasswordTwoDigits] = useState('');
  const [ownerIdentity, setOwnerIdentity] = useState('');
  const { hasPaymentMethods, canRegisterMethod, cardNumberDisplay } = useUserPaymentManagementDerived({
    status,
    cardNumber,
    formatCardNumberForDisplay,
  });


  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getMyPaymentMethodStatus();
      setStatus(response);
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const resetCardForm = () => {
    setCardOwnerType('PERSONAL');
    setCardNumber('');
    setExpiry('');
    setPasswordTwoDigits('');
    setOwnerIdentity('');
  };

  const openRegistrationPage = async (methodType: PaymentMethodType) => {
    const response = await startPaymentMethodRegistration(methodType);
    await Linking.openURL(response.registrationUrl);

    if (methodType === 'CARD') {
      setResultMessage('카드 등록 페이지를 열었습니다. 등록 완료 후 상태 새로고침을 눌러 주세요.');
      return;
    }
    if (methodType === 'TRANSFER_TOSS') {
      setResultMessage('토스 계좌이체 등록 페이지를 열었습니다. 등록 완료 후 상태 새로고침을 눌러 주세요.');
      return;
    }
    setResultMessage('카카오페이 등록 페이지를 열었습니다. 등록 완료 후 상태 새로고침을 눌러 주세요.');
  };

  const handleOpenMethodModal = () => {
    if (!canRegisterMethod || isSubmitting) {
      return;
    }
    setSelectedMethodType('CARD');
    setIsMethodPickerVisible(true);
  };

  const handleSubmitMethodSelection = async () => {
    if (!canRegisterMethod || isSubmitting) {
      return;
    }

    if (selectedMethodType === 'CARD') {
      setIsMethodPickerVisible(false);
      setIsCardFormVisible(true);
      setErrorMessage(null);
      setResultMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      await openRegistrationPage(selectedMethodType);
      setIsMethodPickerVisible(false);
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCardForm = async () => {
    if (!canRegisterMethod || isSubmitting) {
      return;
    }

    if (cardNumber.length < 15) {
      setErrorMessage('카드번호를 정확히 입력해 주세요.');
      return;
    }
    if (!isValidExpiry(expiry)) {
      setErrorMessage('유효기간(MM/YY)을 정확히 입력해 주세요.');
      return;
    }
    if (!/^\d{2}$/.test(passwordTwoDigits)) {
      setErrorMessage('비밀번호 앞 2자리를 입력해 주세요.');
      return;
    }
    if (!/^\d{6}$/.test(ownerIdentity)) {
      setErrorMessage('주민등록번호/사업자번호 앞 6자리를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      await openRegistrationPage('CARD');
      setIsCardFormVisible(false);
      resetCardForm();
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <UserPaymentManagementIntroSection styles={styles} loginId={me?.loginId ?? me?.email ?? '-'} />

      {isLoading && !status && (
        <View style={styles.loadingGroup}>
          <View style={styles.loadingCard}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineLong} />
          </View>
          <View style={styles.loadingCard}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineLong} />
          </View>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {errorMessage && (
        <Pressable style={styles.secondaryButton} onPress={() => void loadStatus()}>
          <Text style={styles.secondaryButtonText}>다시 시도</Text>
        </Pressable>
      )}

      {resultMessage && (
        <View style={styles.successCard}>
          <Text style={styles.successText}>{resultMessage}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>등록된 결제수단</Text>
          <Pressable
            style={[styles.secondaryButtonCompact, (isLoading || isSubmitting) && styles.buttonDisabled]}
            onPress={() => void loadStatus()}
            disabled={isLoading || isSubmitting}
          >
            <Text style={styles.secondaryButtonCompactText}>{isLoading ? '불러오는 중...' : '새로고침'}</Text>
          </Pressable>
        </View>

        {!hasPaymentMethods && !isLoading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>[]</Text>
            <Text style={styles.emptyTitle}>등록된 결제수단이 없습니다</Text>
            <Text style={styles.emptyDescription}>결제 시 사용할 결제수단을 먼저 등록해 주세요.</Text>
            <Pressable
              style={[styles.primaryButton, (!canRegisterMethod || isSubmitting) && styles.buttonDisabled]}
              onPress={handleOpenMethodModal}
              disabled={!canRegisterMethod || isSubmitting}
            >
              <Text style={styles.primaryButtonText}>결제수단 등록하기</Text>
            </Pressable>
          </View>
        )}

        {hasPaymentMethods && (
          <View style={styles.methodList}>
            {status?.paymentMethods.map((item, index) => {
              const badgePalette = getStatusBadgePalette(resolveMethodStatusBadgeTone(item.status));
              return (
                <View
                  key={item.id}
                  style={[styles.methodCard, index === 0 && styles.primaryMethodCard]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.methodTitle}>{toMethodLabel(item.methodType)}</Text>
                    <View style={styles.badgeRow}>
                      {index === 0 && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>기본</Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: badgePalette.backgroundColor }]}>
                        <Text style={[styles.statusBadgeText, { color: badgePalette.textColor }]}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.methodMeta}>타입: {item.methodType}</Text>
                  <Text style={styles.methodMeta}>제공사: {item.provider}</Text>
                  <Text style={styles.methodMeta}>등록일: {formatDate(item.createdAt)}</Text>
                  <Text style={styles.methodMeta}>갱신일: {formatDate(item.updatedAt)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {hasPaymentMethods && (
          <Pressable
            style={[styles.primaryButton, (!canRegisterMethod || isSubmitting) && styles.buttonDisabled]}
            onPress={handleOpenMethodModal}
            disabled={!canRegisterMethod || isSubmitting}
          >
            <Text style={styles.primaryButtonText}>결제수단 등록/변경</Text>
          </Pressable>
        )}
      </View>

      {!canRegisterMethod && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>재등록 제한</Text>
          <Text style={styles.warningText}>현재 상태에서는 결제수단 재등록이 제한됩니다. 결제 실패 상태 또는 운영 정책을 확인해 주세요.</Text>
        </View>
      )}

      {isMethodPickerVisible && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>결제수단 선택</Text>
          <Text style={styles.caption}>등록할 수단을 선택한 뒤 다음 단계로 진행하세요.</Text>

          {METHOD_OPTIONS.map((option) => {
            const selected = option.type === selectedMethodType;
            return (
              <Pressable
                key={option.type}
                style={[styles.methodOptionCard, selected && styles.methodOptionCardSelected]}
                onPress={() => setSelectedMethodType(option.type)}
              >
                <View style={styles.methodOptionTextWrap}>
                  <Text style={styles.methodOptionTitle}>{option.title}</Text>
                  <Text style={styles.methodOptionSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  <Text style={[styles.radioMark, selected && styles.radioMarkSelected]}>{selected ? '✓' : ''}</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.secondaryButton, styles.flexButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => setIsMethodPickerVisible(false)}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonText}>닫기</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.flexButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => void handleSubmitMethodSelection()}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>{isSubmitting ? '처리 중...' : '선택하기'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isCardFormVisible && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>카드 추가</Text>
          <Text style={styles.caption}>카드 정보를 입력하면 등록 페이지로 이동합니다.</Text>

          <View style={styles.cardPreview}>
            <Text style={styles.cardPreviewNumber}>{cardNumberDisplay || '**** **** **** ****'}</Text>
          </View>

          <View style={styles.ownerTypeRow}>
            <Pressable
              style={[styles.ownerTypeButton, cardOwnerType === 'PERSONAL' && styles.ownerTypeButtonSelected]}
              onPress={() => setCardOwnerType('PERSONAL')}
            >
              <Text style={[styles.ownerTypeText, cardOwnerType === 'PERSONAL' && styles.ownerTypeTextSelected]}>
                개인카드
              </Text>
            </Pressable>
            <Pressable
              style={[styles.ownerTypeButton, cardOwnerType === 'BUSINESS' && styles.ownerTypeButtonSelected]}
              onPress={() => setCardOwnerType('BUSINESS')}
            >
              <Text style={[styles.ownerTypeText, cardOwnerType === 'BUSINESS' && styles.ownerTypeTextSelected]}>
                법인카드
              </Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>카드번호</Text>
          <TextInput
            style={styles.input}
            value={cardNumberDisplay}
            onChangeText={(value) => setCardNumber(normalizeCardNumber(value))}
            keyboardType="number-pad"
            placeholder="카드번호"
            placeholderTextColor="#94a3b8"
            maxLength={19}
            returnKeyType="next"
          />

          <View style={styles.rowGap8}>
            <View style={styles.flexButton}>
              <Text style={styles.fieldLabel}>유효기간</Text>
              <TextInput
                style={styles.input}
                value={expiry}
                onChangeText={(value) => setExpiry(normalizeExpiry(value))}
                keyboardType="number-pad"
                placeholder="MM/YY"
                placeholderTextColor="#94a3b8"
                maxLength={5}
                returnKeyType="next"
              />
            </View>
            <View style={styles.flexButton}>
              <Text style={styles.fieldLabel}>비밀번호 앞 2자리</Text>
              <TextInput
                style={styles.input}
                value={passwordTwoDigits}
                onChangeText={(value) => setPasswordTwoDigits(value.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                secureTextEntry
                placeholder="두 자리"
                placeholderTextColor="#94a3b8"
                maxLength={2}
                returnKeyType="next"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>{cardOwnerType === 'BUSINESS' ? '사업자번호 앞 6자리' : '주민등록번호 앞 6자리'}</Text>
          <TextInput
            style={styles.input}
            value={ownerIdentity}
            onChangeText={(value) => setOwnerIdentity(value.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder={cardOwnerType === 'BUSINESS' ? '사업자번호 앞 6자리' : '주민등록번호 앞 6자리'}
            placeholderTextColor="#94a3b8"
            maxLength={6}
            returnKeyType="done"
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.secondaryButton, styles.flexButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => {
                setIsCardFormVisible(false);
                resetCardForm();
              }}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.flexButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => void handleSubmitCardForm()}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>{isSubmitting ? '등록 중...' : '카드 추가'}</Text>
            </Pressable>
          </View>
        </View>
      )}
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
    lineHeight: 18,
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
  policyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    padding: 12,
    gap: 4,
  },
  policyTitle: {
    color: '#92400e',
    fontWeight: '700',
    fontSize: 14,
  },
  policyText: {
    color: '#92400e',
    fontSize: 12,
    lineHeight: 18,
  },
  loadingGroup: {
    gap: 10,
  },
  loadingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  skeletonLineShort: {
    height: 10,
    width: '42%',
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
    marginBottom: 6,
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    padding: 12,
    gap: 4,
  },
  warningTitle: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '700',
  },
  warningText: {
    color: '#b45309',
    fontSize: 12,
    lineHeight: 18,
  },
  methodList: {
    gap: 8,
  },
  methodCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: '#ffffff',
  },
  primaryMethodCard: {
    borderColor: '#93c5fd',
    backgroundColor: '#f8fbff',
  },
  methodTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  methodMeta: {
    color: ui.colors.caption,
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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
  methodOptionCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  methodOptionCardSelected: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  methodOptionTextWrap: {
    gap: 3,
    flex: 1,
  },
  methodOptionTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
    fontSize: 14,
  },
  methodOptionSubtitle: {
    color: ui.colors.caption,
    fontSize: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#60a5fa',
    backgroundColor: '#dbeafe',
  },
  radioMark: {
    color: 'transparent',
    fontSize: 12,
    fontWeight: '700',
  },
  radioMarkSelected: {
    color: '#1d4ed8',
  },
  cardPreview: {
    height: 96,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cardPreviewNumber: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  ownerTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ownerTypeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  ownerTypeButtonSelected: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  ownerTypeText: {
    color: ui.colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  ownerTypeTextSelected: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  fieldLabel: {
    color: ui.colors.textStrong,
    fontSize: 13,
    fontWeight: '600',
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
  rowGap8: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
});



