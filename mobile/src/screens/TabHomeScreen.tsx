import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabHeaderCard } from '../components/TabHeaderCard';
import { ui } from '../theme/ui';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';

type TabHomeScreenProps = {
  loginId: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
};

export function TabHomeScreen({ loginId, roles, primaryRole }: TabHomeScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TabHeaderCard
        badge="홈"
        title="공통 홈"
        description="신청, 이용내역, 내정보의 주요 흐름을 한 번에 확인할 수 있어요."
        meta={(
          <>
            <Text style={styles.caption}>로그인 ID: {loginId ?? '-'}</Text>
            <Text style={styles.caption}>권한: {roles.join(', ')}</Text>
          </>
        )}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>계정 요약</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>로그인 아이디</Text>
          <Text style={styles.infoValue}>{loginId ?? '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>보유 권한</Text>
          <Text style={styles.infoValue}>{roles.join(', ')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>적용 권한(최고 권한)</Text>
          <Text style={styles.infoValue}>{primaryRole}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>탭 정책</Text>
        <Text style={styles.guideText}>신청: 수거 신청 생성 전용</Text>
        <Text style={styles.guideText}>이용내역: 신청 및 처리 이력 확인</Text>
        <Text style={styles.guideText}>내정보: 주소관리, 결제수단, 설정</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: ui.colors.screen,
    gap: 16,
  },
  caption: {
    fontSize: 12,
    color: ui.colors.caption,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  guideText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});
