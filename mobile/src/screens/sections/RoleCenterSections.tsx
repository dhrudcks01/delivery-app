import { Text, View } from 'react-native';

type ScreenStyles = Record<string, any>;

type RoleCenterHeaderSectionProps = {
  styles: ScreenStyles;
  roleBadgeText: string;
};

export function RoleCenterHeaderSection({
  styles,
  roleBadgeText,
}: RoleCenterHeaderSectionProps) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.badge}>권한센터</Text>
      <Text style={styles.title}>권한 신청/승인</Text>
      <Text style={styles.description}>현재 역할에 맞는 신청, 조회, 승인 메뉴를 제공합니다.</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>현재 역할: {roleBadgeText}</Text>
      </View>
    </View>
  );
}
