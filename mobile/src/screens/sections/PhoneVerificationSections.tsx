import { Text, View } from 'react-native';

type ScreenStyles = Record<string, any>;

type PhoneVerificationHeaderSectionProps = {
  styles: ScreenStyles;
};

export function PhoneVerificationHeaderSection({ styles }: PhoneVerificationHeaderSectionProps) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.title}>휴대폰 본인인증</Text>
      <Text style={styles.description}>본인인증이 완료되어야 서비스를 계속 사용할 수 있습니다.</Text>
    </View>
  );
}
