import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn, isLoading, errorMessage } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (errorMessage) {
      setPassword('');
    }
  }, [errorMessage]);

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      setFormError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setFormError(null);
    await signIn({
      id: loginId.trim(),
      password,
    });
  };

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.screenContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.badge}>오늘수거 MVP</Text>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.description}>아이디로 로그인하고 수거 서비스를 이용해 보세요.</Text>
          <Text style={styles.meta}>연결 서버: {API_BASE_URL}</Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>계정 정보</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              style={styles.input}
              value={loginId}
              onChangeText={setLoginId}
              autoCapitalize="none"
              keyboardType="default"
              placeholder="아이디를 입력해 주세요"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="비밀번호를 입력해 주세요"
              placeholderTextColor="#94a3b8"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {(formError || errorMessage) && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{formError ?? errorMessage}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            disabled={isLoading}
            onPress={handleLogin}
          >
            {isLoading && <ActivityIndicator size="small" color="#ffffff" />}
            <Text style={styles.primaryButtonText}>{isLoading ? '로그인 중...' : '로그인'}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.secondaryButtonText}>회원가입</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
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
    color: '#0f172a',
  },
  description: {
    fontSize: 14,
    color: '#334155',
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#2563eb',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    gap: 12,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
});
