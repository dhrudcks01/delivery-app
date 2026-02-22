import { useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: SignupScreenProps) {
  const { signUp, isLoading, errorMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    const trimmedDisplayName = displayName.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedDisplayName || !trimmedPassword) {
      setFormError('이메일, 이름, 비밀번호를 모두 입력해 주세요.');
      return;
    }
    if (trimmedPassword.length < 8) {
      setFormError('비밀번호는 8자 이상 입력해 주세요.');
      return;
    }

    setFormError(null);
    await signUp({
      email: trimmedEmail,
      displayName: trimmedDisplayName,
      password: trimmedPassword,
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
            <Text style={styles.badge}>이메일 회원가입</Text>
            <Text style={styles.title}>가입 후 바로 시작하세요</Text>
            <Text style={styles.description}>회원가입 성공 시 자동 로그인되어 역할 화면으로 이동합니다.</Text>
          </View>

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

            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="홍길동"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="비밀번호(8자 이상)"
              placeholderTextColor="#94a3b8"
              onSubmitEditing={handleSignup}
            />

            {(formError || errorMessage) && <Text style={styles.error}>{formError ?? errorMessage}</Text>}

            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleSignup}>
              <Text style={styles.buttonText}>{isLoading ? '가입 중...' : '회원가입'}</Text>
            </Pressable>

            <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>이미 계정이 있나요? 로그인으로 이동</Text>
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
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: ui.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
