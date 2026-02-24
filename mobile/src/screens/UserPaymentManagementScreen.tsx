import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getMyPaymentMethodStatus, startPaymentMethodRegistration } from '../api/paymentApi';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';
import { PaymentMethodStatusResponse, PaymentMethodType } from '../types/payment';
import { ApiErrorResponse } from '../types/waste';

type CardOwnerType = 'PERSONAL' | 'BUSINESS';

const METHOD_OPTIONS: Array<{ type: PaymentMethodType; title: string; subtitle: string }> = [
  { type: 'CARD', title: '카드 직접 등록', subtitle: '소유한 카드 직접 등록' },
  { type: 'TRANSFER_TOSS', title: '계좌이체', subtitle: '토스로 간편 계좌 등록' },
  { type: 'KAKAOPAY', title: '카카오페이', subtitle: '카카오페이로 간편 카드 등록' },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '결제수단 처리 중 오류가 발생했습니다.';
  }
  return '결제수단 처리 중 오류가 발생했습니다.';
}

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

export function UserPaymentManagementScreen() {
  const { me } = useAuth();

  const [status, setStatus] = useState<PaymentMethodStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [isMethodModalVisible, setIsMethodModalVisible] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<PaymentMethodType>('CARD');
  const [isCardFormVisible, setIsCardFormVisible] = useState(false);

  const [cardOwnerType, setCardOwnerType] = useState<CardOwnerType>('PERSONAL');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [passwordTwoDigits, setPasswordTwoDigits] = useState('');
  const [ownerIdentity, setOwnerIdentity] = useState('');

  const hasPaymentMethods = (status?.paymentMethods.length ?? 0) > 0;
  const canRegisterMethod = !hasPaymentMethods || Boolean(status?.canReregister);

  const cardNumberDisplay = useMemo(() => formatCardNumberForDisplay(cardNumber), [cardNumber]);

  const loadStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getMyPaymentMethodStatus();
      setStatus(response);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

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
    setIsMethodModalVisible(true);
  };

  const handleSubmitMethodSelection = async () => {
    if (!canRegisterMethod || isSubmitting) {
      return;
    }

    if (selectedMethodType === 'CARD') {
      setIsMethodModalVisible(false);
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
      setIsMethodModalVisible(false);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
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
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>결제수단 관리</Text>
        <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>

        {isLoading && <Text style={styles.meta}>결제수단 상태를 조회하는 중입니다.</Text>}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {resultMessage && <Text style={styles.success}>{resultMessage}</Text>}

        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>자동결제 정책</Text>
          <Text style={styles.policyText}>자동결제는 카드 직접 등록 수단만 지원합니다.</Text>
          <Text style={styles.policyText}>계좌이체(토스), 카카오페이는 등록 후 수동 결제로 사용합니다.</Text>
        </View>

        {!hasPaymentMethods && !isLoading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>등록된 결제수단이 없어요</Text>
            <Text style={styles.emptyDescription}>결제시 사용할 결제수단을 등록해 주세요</Text>
            <Pressable
              style={[styles.primaryButton, (!canRegisterMethod || isSubmitting) && styles.buttonDisabled]}
              onPress={handleOpenMethodModal}
              disabled={!canRegisterMethod || isSubmitting}
            >
              <Text style={styles.primaryButtonText}>+ 결제수단 등록하기</Text>
            </Pressable>
          </View>
        )}

        {hasPaymentMethods && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>등록된 결제수단</Text>
              <Pressable style={styles.ghostButton} onPress={loadStatus}>
                <Text style={styles.ghostButtonText}>상태 새로고침</Text>
              </Pressable>
            </View>
            {status?.paymentMethods.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{toMethodLabel(item.methodType)}</Text>
                <Text style={styles.listSub}>타입: {item.methodType}</Text>
                <Text style={styles.listSub}>제공사: {item.provider}</Text>
                <Text style={styles.listSub}>상태: {item.status}</Text>
                <Text style={styles.listSub}>등록일: {formatDate(item.createdAt)}</Text>
                <Text style={styles.listSub}>갱신일: {formatDate(item.updatedAt)}</Text>
              </View>
            ))}
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

        {!canRegisterMethod && (
          <Text style={styles.meta}>
            현재 상태에서는 결제수단 재등록이 제한됩니다. 결제 실패 상태 또는 운영 정책을 확인해 주세요.
          </Text>
        )}

        {isCardFormVisible && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>카드 추가</Text>

            <View style={styles.cardPreview}>
              <Text style={styles.cardPreviewNumber}>
                {cardNumberDisplay || '**** **** **** ****'}
              </Text>
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

            <TextInput
              style={styles.input}
              value={cardNumberDisplay}
              onChangeText={(value) => setCardNumber(normalizeCardNumber(value))}
              keyboardType="number-pad"
              placeholder="카드번호"
              placeholderTextColor="#94a3b8"
              maxLength={19}
            />
            <View style={styles.rowGap8}>
              <TextInput
                style={[styles.input, styles.flexInput]}
                value={expiry}
                onChangeText={(value) => setExpiry(normalizeExpiry(value))}
                keyboardType="number-pad"
                placeholder="MM/YY"
                placeholderTextColor="#94a3b8"
                maxLength={5}
              />
              <TextInput
                style={[styles.input, styles.flexInput]}
                value={passwordTwoDigits}
                onChangeText={(value) => setPasswordTwoDigits(value.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                secureTextEntry
                placeholder="비밀번호 앞 2자리"
                placeholderTextColor="#94a3b8"
                maxLength={2}
              />
            </View>
            <TextInput
              style={styles.input}
              value={ownerIdentity}
              onChangeText={(value) => setOwnerIdentity(value.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder={cardOwnerType === 'BUSINESS' ? '사업자번호 앞 6자리' : '주민등록번호 앞 6자리'}
              placeholderTextColor="#94a3b8"
              maxLength={6}
            />

            <View style={styles.rowGap8}>
              <Pressable
                style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
                onPress={() => {
                  setIsCardFormVisible(false);
                  resetCardForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, styles.flexInput, isSubmitting && styles.buttonDisabled]}
                onPress={() => void handleSubmitCardForm()}
                disabled={isSubmitting}
              >
                <Text style={styles.primaryButtonText}>{isSubmitting ? '등록 중..' : '카드 추가'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isMethodModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMethodModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>결제수단 등록</Text>
              <Pressable onPress={() => setIsMethodModalVisible(false)}>
                <Text style={styles.modalClose}>닫기</Text>
              </Pressable>
            </View>

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
                  <View style={[styles.radio, selected && styles.radioSelected]} />
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.modalSubmitButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => void handleSubmitMethodSelection()}
              disabled={isSubmitting}
            >
              <Text style={styles.modalSubmitButtonText}>{isSubmitting ? '처리 중..' : '선택하기'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
  success: {
    color: ui.colors.success,
    fontSize: 13,
  },
  policyCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: ui.radius.card,
    padding: 12,
    gap: 4,
  },
  policyTitle: {
    color: '#9a3412',
    fontWeight: '700',
    fontSize: 13,
  },
  policyText: {
    color: '#9a3412',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  emptyDescription: {
    color: ui.colors.text,
    fontSize: 14,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
    gap: 2,
  },
  listTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
  },
  listSub: {
    color: ui.colors.text,
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  cardPreview: {
    height: 96,
    backgroundColor: '#0b0b0f',
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
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  ownerTypeButtonSelected: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  ownerTypeText: {
    color: ui.colors.text,
    fontWeight: '600',
  },
  ownerTypeTextSelected: {
    color: '#c2410c',
    fontWeight: '700',
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
  rowGap8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flexInput: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: ui.colors.textStrong,
  },
  modalClose: {
    color: ui.colors.textMuted,
    fontWeight: '700',
  },
  methodOptionCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  methodOptionCardSelected: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  methodOptionTextWrap: {
    gap: 2,
    flex: 1,
  },
  methodOptionTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
    fontSize: 16,
  },
  methodOptionSubtitle: {
    color: ui.colors.textMuted,
    fontSize: 13,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  radioSelected: {
    borderColor: '#f97316',
    backgroundColor: '#f97316',
  },
  modalSubmitButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
