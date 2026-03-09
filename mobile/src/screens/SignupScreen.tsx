import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: SignupScreenProps) {
  const { signUp, isLoading, errorMessage } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const displayNameInputRef = useRef<TextInput | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);

  const handleSignup = async () => {
    const trimmedIdentifier = identifier.trim();
    const trimmedDisplayName = displayName.trim();
    const trimmedPassword = password.trim();

    if (!trimmedIdentifier || !trimmedDisplayName || !trimmedPassword) {
      setFormError('아이디, 이름, 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (trimmedPassword.length < 8) {
      setFormError('비밀번호는 8자 이상 입력해 주세요.');
      return;
    }

    setFormError(null);
    await signUp({
      id: trimmedIdentifier,
      displayName: trimmedDisplayName,
      password: trimmedPassword,
    });
  };

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.screenContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.badge}>아이디 회원가입</Text>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.description}>기본 정보 입력 후 바로 서비스를 시작할 수 있어요.</Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>가입 정보</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="default"
              placeholder="아이디를 입력해 주세요"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              onSubmitEditing={() => displayNameInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              ref={displayNameInputRef}
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="이름을 입력해 주세요"
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
              placeholder="비밀번호(8자 이상)"
              placeholderTextColor="#94a3b8"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
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
            onPress={handleSignup}
          >
            {isLoading && <ActivityIndicator size="small" color="#ffffff" />}
            <Text style={styles.primaryButtonText}>{isLoading ? '가입 중...' : '회원가입'}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryButtonText}>기존 계정으로 로그인</Text>
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
