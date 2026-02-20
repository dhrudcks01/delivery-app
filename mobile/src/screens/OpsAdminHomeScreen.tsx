import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  approveDriverApplication,
  rejectDriverApplication,
} from '../api/opsAdminDriverApplicationApi';
import { useAuth } from '../auth/AuthContext';
import { DriverApplication } from '../types/driverApplication';
import { ApiErrorResponse } from '../types/waste';

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '요청 처리 중 오류가 발생했습니다.';
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function formatDate(dateTime: string | null): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

export function OpsAdminHomeScreen() {
  const { me, signOut } = useAuth();

  const [applicationIdInput, setApplicationIdInput] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<DriverApplication | null>(null);

  const parsedApplicationId = useMemo(() => {
    const parsed = Number(applicationIdInput.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [applicationIdInput]);

  const validateInput = (): number | null => {
    if (!parsedApplicationId) {
      setActionError('승인/반려할 신청 ID를 숫자로 입력해 주세요.');
      return null;
    }
    return parsedApplicationId;
  };

  const handleApprove = async () => {
    const applicationId = validateInput();
    if (!applicationId) {
      return;
    }

    setIsSubmittingApprove(true);
    setActionError(null);
    setResultMessage(null);

    try {
      const response = await approveDriverApplication(applicationId);
      setLatestResult(response);
      setResultMessage(`신청 #${response.id} 승인 완료`);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleReject = async () => {
    const applicationId = validateInput();
    if (!applicationId) {
      return;
    }

    setIsSubmittingReject(true);
    setActionError(null);
    setResultMessage(null);

    try {
      const response = await rejectDriverApplication(applicationId);
      setLatestResult(response);
      setResultMessage(`신청 #${response.id} 반려 완료`);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setIsSubmittingReject(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>OPS_ADMIN 기사 신청 처리</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>신청 승인/반려</Text>
        <Text style={styles.description}>
          현재 서버 API는 신청 ID 단건 승인/반려를 제공합니다. 기사 신청 ID를 입력한 뒤 처리해 주세요.
        </Text>

        <Text style={styles.label}>기사 신청 ID</Text>
        <TextInput
          style={styles.input}
          value={applicationIdInput}
          onChangeText={setApplicationIdInput}
          placeholder="예: 12"
          keyboardType="numeric"
          placeholderTextColor="#94a3b8"
        />

        {resultMessage && <Text style={styles.success}>{resultMessage}</Text>}
        {actionError && <Text style={styles.error}>{actionError}</Text>}

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, isSubmittingApprove && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={isSubmittingApprove || isSubmittingReject}
          >
            <Text style={styles.buttonText}>{isSubmittingApprove ? '승인 중..' : '승인'}</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.rejectButton, isSubmittingReject && styles.buttonDisabled]}
            onPress={handleReject}
            disabled={isSubmittingApprove || isSubmittingReject}
          >
            <Text style={styles.buttonText}>{isSubmittingReject ? '반려 중..' : '반려'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>최근 처리 결과</Text>
        {!latestResult && <Text style={styles.meta}>아직 처리된 결과가 없습니다.</Text>}
        {latestResult && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>신청 ID: {latestResult.id}</Text>
            <Text style={styles.detailText}>신청자 ID: {latestResult.userId}</Text>
            <Text style={styles.detailText}>상태: {latestResult.status}</Text>
            <Text style={styles.detailText}>처리자 ID: {latestResult.processedBy ?? '-'}</Text>
            <Text style={styles.detailText}>처리시각: {formatDate(latestResult.processedAt)}</Text>
            <Text style={styles.detailText}>신청시각: {formatDate(latestResult.createdAt)}</Text>
          </View>
        )}
      </View>

      <Pressable style={[styles.button, styles.logoutButton]} onPress={signOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    fontSize: 13,
    color: '#334155',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0f172a',
  },
  success: {
    color: '#15803d',
    fontSize: 13,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#7f1d1d',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resultBox: {
    gap: 4,
  },
  detailText: {
    color: '#0f172a',
    fontSize: 13,
  },
  logoutButton: {
    marginBottom: 20,
  },
});
