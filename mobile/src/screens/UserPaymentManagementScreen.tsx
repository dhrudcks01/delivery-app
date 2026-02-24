import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMyPaymentMethodStatus, startPaymentMethodRegistration } from '../api/paymentApi';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';
import { ApiErrorResponse } from '../types/waste';
import { PaymentMethodStatusResponse } from '../types/payment';

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

export function UserPaymentManagementScreen() {
  const { me } = useAuth();

  const [status, setStatus] = useState<PaymentMethodStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

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

  const handleRegisterCard = async () => {
    setIsRegistering(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const response = await startPaymentMethodRegistration();
      await Linking.openURL(response.registrationUrl);
      setResultMessage('카드 등록 페이지를 열었습니다. 등록 완료 후 상태 새로고침을 눌러 주세요.');
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const hasPaymentMethods = (status?.paymentMethods.length ?? 0) > 0;
  const canRegisterCard = !hasPaymentMethods || Boolean(status?.canReregister);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>결제수단 관리</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>등록 상태</Text>
          <Pressable style={styles.ghostButton} onPress={loadStatus}>
            <Text style={styles.ghostButtonText}>상태 새로고침</Text>
          </Pressable>
        </View>

        {isLoading && <Text style={styles.meta}>결제수단 상태를 조회하는 중입니다.</Text>}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {resultMessage && <Text style={styles.success}>{resultMessage}</Text>}

        <Text style={styles.detailText}>재등록 가능 여부: {status?.canReregister ? '가능' : '불가/미확인'}</Text>
        <Text style={styles.detailText}>등록된 결제수단 수: {status?.paymentMethods.length ?? 0}</Text>

        {status?.paymentMethods.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>결제수단 #{item.id}</Text>
            <Text style={styles.listSub}>제공사: {item.provider}</Text>
            <Text style={styles.listSub}>상태: {item.status}</Text>
            <Text style={styles.listSub}>등록일: {formatDate(item.createdAt)}</Text>
            <Text style={styles.listSub}>갱신일: {formatDate(item.updatedAt)}</Text>
          </View>
        ))}

        {!isLoading && (status?.paymentMethods.length ?? 0) === 0 && (
          <Text style={styles.meta}>등록된 결제카드가 없습니다.</Text>
        )}
      </View>

      <Pressable
        style={[styles.button, (!canRegisterCard || isRegistering) && styles.buttonDisabled]}
        onPress={handleRegisterCard}
        disabled={!canRegisterCard || isRegistering}
      >
        <Text style={styles.buttonText}>{isRegistering ? '등록 페이지 여는 중..' : '카드 등록/변경'}</Text>
      </Pressable>

      {!canRegisterCard && (
        <Text style={styles.meta}>
          현재 상태에서는 카드 재등록이 제한됩니다. 결제 실패 상태 또는 운영 정책을 확인해 주세요.
        </Text>
      )}
    </ScrollView>
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
  detailText: {
    color: ui.colors.textStrong,
    fontSize: 13,
  },
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
  success: {
    color: ui.colors.success,
    fontSize: 13,
  },
  button: {
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: ui.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
