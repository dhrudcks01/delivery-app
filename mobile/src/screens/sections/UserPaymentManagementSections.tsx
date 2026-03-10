import { Text, View } from 'react-native';

type ScreenStyles = Record<string, any>;

type UserPaymentManagementIntroSectionProps = {
  styles: ScreenStyles;
  loginId: string;
};

export function UserPaymentManagementIntroSection({
  styles,
  loginId,
}: UserPaymentManagementIntroSectionProps) {
  return (
    <>
      <View style={styles.headerCard}>
        <Text style={styles.badge}>결제관리</Text>
        <Text style={styles.title}>결제수단 관리</Text>
        <Text style={styles.description}>등록된 결제수단을 확인하고 기본 결제수단을 관리할 수 있습니다.</Text>
        <Text style={styles.caption}>로그인 아이디: {loginId}</Text>
      </View>

      <View style={styles.policyCard}>
        <Text style={styles.policyTitle}>자동결제 정책</Text>
        <Text style={styles.policyText}>자동결제는 카드 직접 등록 수단만 지원합니다.</Text>
        <Text style={styles.policyText}>계좌이체(토스), 카카오페이는 등록 후 수동 결제로 사용합니다.</Text>
      </View>
    </>
  );
}
