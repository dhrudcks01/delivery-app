import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabHeaderCard } from '../components/TabHeaderCard';
import { ui } from '../theme/ui';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';

type TabProfileScreenProps = {
  loginId: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  phoneVerificationProvider: string | null;
  hasUserRole: boolean;
  onOpenAddressManagement: () => void;
  onOpenPaymentManagement: () => void;
  onOpenRoleCenter: () => void;
  onOpenSettings: () => void;
};

function formatDateTime(dateTime: string | null): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

export function TabProfileScreen({
  loginId,
  roles,
  primaryRole,
  phoneNumber,
  phoneVerifiedAt,
  phoneVerificationProvider,
  hasUserRole,
  onOpenAddressManagement,
  onOpenPaymentManagement,
  onOpenRoleCenter,
  onOpenSettings,
}: TabProfileScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TabHeaderCard
        badge="내정보"
        title="계정 및 설정"
        description="계정 상태를 확인하고 주요 설정 메뉴로 이동할 수 있어요."
        meta={(
          <>
            <Text style={styles.caption}>로그인 ID: {loginId ?? '-'}</Text>
            <Text style={styles.caption}>적용 권한: {primaryRole}</Text>
          </>
        )}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>로그인 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>로그인 아이디</Text>
          <Text style={styles.infoValue}>{loginId ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>권한 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>보유 권한</Text>
          <Text style={styles.infoValue}>{roles.length > 0 ? roles.join(', ') : '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>적용 권한(최고 권한)</Text>
          <Text style={styles.infoValue}>{primaryRole}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>휴대폰 인증정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>휴대폰 번호</Text>
          <Text style={styles.infoValue}>{phoneNumber ?? '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>인증 일시</Text>
          <Text style={styles.infoValue}>{formatDateTime(phoneVerifiedAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>인증 수단</Text>
          <Text style={styles.infoValue}>{phoneVerificationProvider ?? '-'}</Text>
        </View>
        <View style={[styles.statusBadge, !phoneVerifiedAt && styles.statusBadgeWarning]}>
          <Text style={[styles.statusText, !phoneVerifiedAt && styles.statusTextWarning]}>
            {phoneVerifiedAt ? '인증 완료' : '인증 필요'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>메뉴</Text>
        {hasUserRole && (
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={onOpenAddressManagement}
          >
            <Text style={styles.secondaryButtonText}>주소관리</Text>
          </Pressable>
        )}
        {hasUserRole && (
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={onOpenPaymentManagement}
          >
            <Text style={styles.secondaryButtonText}>결제수단 관리</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={onOpenRoleCenter}
        >
          <Text style={styles.secondaryButtonText}>권한 신청/승인</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={onOpenSettings}
        >
          <Text style={styles.primaryButtonText}>설정</Text>
        </Pressable>
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
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.textStrong,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: ui.colors.caption,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: ui.colors.textStrong,
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.successSoftBorder,
    backgroundColor: ui.colors.successSoftBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeWarning: {
    borderColor: ui.colors.warningBorderSoft,
    backgroundColor: ui.colors.warningBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.successStrong,
  },
  statusTextWarning: {
    color: ui.colors.warningTextStrong,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: ui.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: ui.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonPressed: {
    backgroundColor: ui.colors.primaryPressed,
  },
  primaryButtonText: {
    color: ui.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    backgroundColor: ui.colors.infoSoftBackground,
    borderColor: ui.colors.infoSoftBorder,
  },
});

