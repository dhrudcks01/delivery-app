import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ui } from '../theme/ui';

export function ProfileSettingsScreen() {
  const { me, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roles = me?.roles ?? [];
  const canManageServiceArea = roles.includes('OPS_ADMIN') || roles.includes('SYS_ADMIN');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>설정</Text>
      <Text style={styles.meta}>로그인 아이디: {me?.loginId ?? me?.email ?? '-'}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>계정</Text>
        <Text style={styles.detailText}>로그아웃은 설정 메뉴에서만 제공합니다.</Text>
        <Pressable
          style={styles.logoutButton}
          onPress={() => {
            void signOut();
          }}
        >
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </Pressable>
      </View>

      {canManageServiceArea && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>운영 설정</Text>
          <Text style={styles.detailText}>서비스 신청지역 등록/조회/비활성화를 관리합니다.</Text>
          <Pressable
            style={styles.manageButton}
            onPress={() => navigation.navigate('ServiceAreaManagement')}
          >
            <Text style={styles.manageButtonText}>서비스 신청지역</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: ui.colors.screen,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  meta: {
    fontSize: 13,
    color: ui.colors.text,
  },
  card: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  detailText: {
    color: ui.colors.text,
    fontSize: 13,
  },
  logoutButton: {
    borderRadius: ui.radius.control,
    borderWidth: 1,
    borderColor: '#b91c1c',
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#fff1f2',
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  manageButton: {
    borderRadius: ui.radius.control,
    borderWidth: 1,
    borderColor: ui.colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#eef8f6',
  },
  manageButtonText: {
    color: ui.colors.primary,
    fontWeight: '700',
  },
});
