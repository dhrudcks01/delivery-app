import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import { ui } from '../theme/ui';

export function LoginScreen() {
  const { signIn, isLoading, errorMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (errorMessage) {
      setPassword('');
    }
  }, [errorMessage]);

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
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="always"
        >
          <View style={styles.hero}>
            <Text style={styles.badge}>오늘수거 스타일 MVP</Text>
            <Text style={styles.title}>빠르게 로그인하고 수거를 시작하세요</Text>
            <Text style={styles.description}>계정 정보를 입력하면 역할에 맞는 화면으로 이동합니다.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.meta}>API: {API_BASE_URL}</Text>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email@example.com"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="비밀번호"
              placeholderTextColor="#94a3b8"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {(formError || errorMessage) && <Text style={styles.error}>{formError ?? errorMessage}</Text>}

            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin}>
              <Text style={styles.buttonText}>{isLoading ? '로그인 중...' : '로그인'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: ui.colors.screen,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 14,
  },
  hero: {
    backgroundColor: '#e6f4f2',
    borderRadius: ui.radius.card,
    borderWidth: 1,
    borderColor: '#b7dfd9',
    padding: 16,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ccfbf1',
    color: '#134e4a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  description: {
    fontSize: 14,
    color: ui.colors.text,
  },
  meta: {
    marginBottom: 8,
    fontSize: 12,
    color: ui.colors.textMuted,
  },
  form: {
    backgroundColor: ui.colors.card,
    borderRadius: ui.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
  },
  label: {
    fontSize: 14,
    color: ui.colors.textStrong,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.colors.textStrong,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  error: {
    marginBottom: 12,
    color: ui.colors.error,
    fontSize: 13,
  },
  button: {
    marginTop: 6,
    borderRadius: ui.radius.control,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: ui.colors.primary,
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
