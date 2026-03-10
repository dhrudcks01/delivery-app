import { Pressable, Text, View } from 'react-native';

type ScreenStyles = Record<string, any>;

type UserWasteRequestDetailHeaderSectionProps = {
  styles: ScreenStyles;
  requestId: number;
  displayOrderNo: string;
  isLoading: boolean;
  onRefresh: () => void;
};

export function UserWasteRequestDetailHeaderSection({
  styles,
  requestId,
  displayOrderNo,
  isLoading,
  onRefresh,
}: UserWasteRequestDetailHeaderSectionProps) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerTextWrap}>
        <Text style={styles.title}>수거요청 상세</Text>
        <Text style={styles.caption}>요청 ID: {requestId}</Text>
        <Text style={styles.caption}>주문번호: {displayOrderNo}</Text>
      </View>
      <Pressable
        style={[styles.secondaryButtonCompact, isLoading && styles.buttonDisabled]}
        onPress={onRefresh}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonCompactText}>{isLoading ? '불러오는 중...' : '새로고침'}</Text>
      </Pressable>
    </View>
  );
}
