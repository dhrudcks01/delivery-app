import { StyleSheet, Text, View } from 'react-native';

export function SysAdminHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SYS_ADMIN 홈</Text>
      <Text style={styles.description}>T-0511 이후 시스템 관리 기능이 연결됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
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
});
