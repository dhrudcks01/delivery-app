import { StyleSheet, Text, View } from 'react-native';

export function UserHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>USER 홈</Text>
      <Text style={styles.description}>T-0504 이후 사용자 기능이 연결됩니다.</Text>
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
