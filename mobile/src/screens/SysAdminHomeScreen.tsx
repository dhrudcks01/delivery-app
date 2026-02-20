import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { grantOpsAdminRole, revokeOpsAdminRole } from '../api/sysAdminRoleApi';
import { useAuth } from '../auth/AuthContext';
import { ApiErrorResponse } from '../types/waste';

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '요청 처리 중 오류가 발생했습니다.';
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

export function SysAdminHomeScreen() {
  const { me, signOut } = useAuth();
  const [userIdInput, setUserIdInput] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedUserId = useMemo(() => {
    const parsed = Number(userIdInput.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [userIdInput]);

  const handleGrant = async () => {
    if (!parsedUserId) {
      setErrorMessage('권한 부여할 사용자 ID를 숫자로 입력해 주세요.');
      return;
    }

    setIsGranting(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      await grantOpsAdminRole(parsedUserId);
      setResultMessage(`사용자 #${parsedUserId} 에게 OPS_ADMIN 권한을 부여했습니다.`);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevoke = async () => {
    if (!parsedUserId) {
      setErrorMessage('권한 회수할 사용자 ID를 숫자로 입력해 주세요.');
      return;
    }

    setIsRevoking(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      await revokeOpsAdminRole(parsedUserId);
      setResultMessage(`사용자 #${parsedUserId} 의 OPS_ADMIN 권한을 회수했습니다.`);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>SYS_ADMIN 홈</Text>
      <Text style={styles.description}>OPS_ADMIN 권한 부여/회수</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>대상 사용자 ID</Text>
        <TextInput
          style={styles.input}
          value={userIdInput}
          onChangeText={setUserIdInput}
          placeholder="예: 12"
          keyboardType="numeric"
          placeholderTextColor="#94a3b8"
        />

        {resultMessage && <Text style={styles.success}>{resultMessage}</Text>}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, isGranting && styles.buttonDisabled]}
            onPress={handleGrant}
            disabled={isGranting || isRevoking}
          >
            <Text style={styles.buttonText}>{isGranting ? '부여 중...' : '권한 부여'}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.revokeButton, isRevoking && styles.buttonDisabled]}
            onPress={handleRevoke}
            disabled={isGranting || isRevoking}
          >
            <Text style={styles.buttonText}>{isRevoking ? '회수 중...' : '권한 회수'}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
  },
  meta: {
    fontSize: 13,
    color: '#334155',
  },
  card: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  success: {
    fontSize: 13,
    color: '#15803d',
  },
  error: {
    fontSize: 13,
    color: '#dc2626',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  revokeButton: {
    backgroundColor: '#7f1d1d',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
