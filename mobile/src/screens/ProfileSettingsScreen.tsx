import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { RootStackParamList } from '../navigation/RootNavigator';

const colors = {
  primary: '#2563EB',
  success: '#16A34A',
  error: '#DC2626',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  textStrong: '#0F172A',
  text: '#334155',
  caption: '#64748B',
};

function formatDateTime(dateTime: string | null | undefined): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

export function ProfileSettingsScreen() {
  const { me, signOut, isLoading, errorMessage } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roles = me?.roles ?? [];
  const canManageServiceArea = roles.includes('OPS_ADMIN') || roles.includes('SYS_ADMIN');
  const hasProfile = Boolean(me);
  const identityLabel = me?.loginId ?? me?.email ?? '-';
  const hasRoles = roles.length > 0;

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} includeTopInset>
      <View style={styles.screenContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.badge}>내정보</Text>
          <Text style={styles.title}>설정</Text>
          <Text style={styles.description}>계정 상태 확인과 설정 메뉴 이동을 한 화면에서 관리합니다.</Text>
        </View>

        {isLoading && !hasProfile && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>설정 정보를 불러오는 중입니다...</Text>
          </View>
        )}

        {!isLoading && errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {!isLoading && !hasProfile && !errorMessage && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>[]</Text>
            <Text style={styles.emptyTitle}>표시할 계정 정보가 없습니다</Text>
            <Text style={styles.emptyDescription}>로그인 세션을 확인한 뒤 다시 시도해 주세요.</Text>
          </View>
        )}

        {hasProfile && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>프로필 정보</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>로그인 아이디</Text>
              <Text style={styles.metaValue}>{identityLabel}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>표시 이름</Text>
              <Text style={styles.metaValue}>{me?.displayName ?? '-'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>이메일</Text>
              <Text style={styles.metaValue}>{me?.email ?? '-'}</Text>
            </View>

            <View style={styles.roleGroup}>
              <Text style={styles.metaLabel}>보유 권한</Text>
              <View style={styles.roleBadgeRow}>
                {hasRoles
                  ? roles.map((role) => (
                    <View key={role} style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{role}</Text>
                    </View>
                    ))
                  : (
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>USER</Text>
                    </View>
                    )}
              </View>
            </View>
          </View>
        )}

        {hasProfile && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>인증 정보</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>휴대폰 번호</Text>
              <Text style={styles.metaValue}>{me?.phoneNumber ?? '-'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>인증 일시</Text>
              <Text style={styles.metaValue}>{formatDateTime(me?.phoneVerifiedAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>인증 수단</Text>
              <Text style={styles.metaValue}>{me?.phoneVerificationProvider ?? '-'}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                !me?.phoneVerifiedAt && styles.statusBadgeWarning,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  !me?.phoneVerifiedAt && styles.statusBadgeWarningText,
                ]}
              >
                {me?.phoneVerifiedAt ? '인증 완료' : '인증 필요'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>계정</Text>
          <Text style={styles.descriptionText}>로그아웃은 설정 메뉴에서만 제공합니다.</Text>
          <Pressable
            style={styles.dangerButton}
            onPress={() => {
              void signOut();
            }}
          >
            <Text style={styles.dangerButtonText}>로그아웃</Text>
          </Pressable>
        </View>

        {canManageServiceArea && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>운영 설정</Text>
            <Text style={styles.descriptionText}>서비스 신청지역 등록/조회/비활성화를 관리합니다.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate('ServiceAreaManagement')}
            >
              <Text style={styles.primaryButtonText}>서비스 신청지역</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  screenContainer: {
    gap: 16,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
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
    color: colors.textStrong,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  metaRow: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.caption,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    color: colors.textStrong,
  },
  roleGroup: {
    gap: 8,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  statusBadgeWarning: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  statusBadgeWarningText: {
    color: '#b45309',
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  loadingCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 18,
    color: colors.caption,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  dangerButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
  },
});
