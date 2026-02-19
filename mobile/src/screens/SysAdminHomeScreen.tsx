import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export function SysAdminHomeScreen() {
  const { me, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SYS_ADMIN 홈</Text>
      <Text style={styles.description}>T-0511 이후 시스템 관리 기능이 연결됩니다.</Text>
      <Text style={styles.meta}>로그인: {me?.email ?? '-'}</Text>
      <Text style={styles.meta}>역할: {me?.roles.join(', ') ?? '-'}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
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
    marginTop: 8,
    fontSize: 13,
    color: '#334155',
  },
  button: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
