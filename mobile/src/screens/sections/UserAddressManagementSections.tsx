import { Text, View } from 'react-native';

type ScreenStyles = Record<string, any>;

type UserAddressManagementHeaderSectionProps = {
  styles: ScreenStyles;
  loginId: string;
};

export function UserAddressManagementHeaderSection({
  styles,
  loginId,
}: UserAddressManagementHeaderSectionProps) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.badge}>내정보</Text>
      <Text style={styles.title}>주소 관리</Text>
      <Text style={styles.description}>대표 주소 설정과 주소 등록/수정을 한 화면에서 관리할 수 있습니다.</Text>
      <Text style={styles.caption}>로그인 아이디: {loginId}</Text>
    </View>
  );
}
