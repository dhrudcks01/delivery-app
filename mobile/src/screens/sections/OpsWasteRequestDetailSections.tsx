import { Text, View } from 'react-native';

type ScreenStyles = Record<string, any>;

type OpsWasteRequestDetailHeaderSectionProps = {
  styles: ScreenStyles;
  requestId: number;
};

export function OpsWasteRequestDetailHeaderSection({
  styles,
  requestId,
}: OpsWasteRequestDetailHeaderSectionProps) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.badge}>OPS_ADMIN 상세</Text>
      <Text style={styles.title}>수거 요청 상세</Text>
      <Text style={styles.description}>요청 #{requestId}의 배정/재배정 상태를 관리합니다.</Text>
    </View>
  );
}
