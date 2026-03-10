import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { ui } from '../theme/ui';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const buttonLabel = loading ? (loadingLabel ?? label) : label;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={[styles.text, textStyle]}>{buttonLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: ui.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonPressed: {
    backgroundColor: ui.colors.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  text: {
    color: ui.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
});

