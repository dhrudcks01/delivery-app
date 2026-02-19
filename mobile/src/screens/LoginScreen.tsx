import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { initializeAuth } from '../auth/authClient';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [hasStoredToken, setHasStoredToken] = useState<boolean | null>(null);

  useEffect(() => {
    initializeAuth()
      .then(setHasStoredToken)
      .catch(() => setHasStoredToken(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery MVP</Text>
      <Text style={styles.description}>T-0502: API 클라이언트 + 토큰 저장 + 자동 refresh 구성</Text>
      <Text style={styles.meta}>API: {API_BASE_URL}</Text>
      <Text style={styles.meta}>
        저장 토큰: {hasStoredToken === null ? '확인 중...' : hasStoredToken ? '있음' : '없음'}
      </Text>
      <Pressable style={styles.button} onPress={() => navigation.navigate('MainTabs')}>
        <Text style={styles.buttonText}>샘플 진입</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
  meta: {
    marginTop: 8,
    fontSize: 13,
    color: '#334155',
  },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
