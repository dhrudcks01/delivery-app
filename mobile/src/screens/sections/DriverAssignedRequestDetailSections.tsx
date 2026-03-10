import { Text, View } from 'react-native';

type ScreenStyles = Record<string, any>;

type DriverAssignedRequestDetailHeaderSectionProps = {
  styles: ScreenStyles;
  selectedTitle: string;
};

export function DriverAssignedRequestDetailHeaderSection({
  styles,
  selectedTitle,
}: DriverAssignedRequestDetailHeaderSectionProps) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.badge}>DRIVER 상세</Text>
      <Text style={styles.title}>배정 상세</Text>
      <Text style={styles.description}>{selectedTitle}</Text>
    </View>
  );
}
