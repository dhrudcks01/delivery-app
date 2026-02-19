import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../auth/AuthContext';

export function LoginScreen() {
  const { signIn, isLoading, errorMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setFormError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setFormError(null);
    await signIn({
      email: email.trim(),
      password,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery MVP 로그인</Text>
      <Text style={styles.description}>T-0503: 이메일 로그인 + /me 역할 분기</Text>
      <Text style={styles.meta}>API: {API_BASE_URL}</Text>

      <View style={styles.form}>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@example.com"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="비밀번호"
          placeholderTextColor="#94a3b8"
        />

        {(formError || errorMessage) && <Text style={styles.error}>{formError ?? errorMessage}</Text>}

        <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin}>
          <Text style={styles.buttonText}>{isLoading ? '로그인 중...' : '로그인'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
  meta: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  error: {
    marginBottom: 12,
    color: '#dc2626',
    fontSize: 13,
  },
  button: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
