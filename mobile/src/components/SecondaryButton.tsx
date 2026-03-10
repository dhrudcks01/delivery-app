import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { ui } from '../theme/ui';

type SecondaryButtonTone = 'primary' | 'neutral' | 'danger';

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  tone?: SecondaryButtonTone;
  minHeight?: number;
};

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
  tone = 'primary',
  minHeight = 48,
}: SecondaryButtonProps) {
  const textToneStyle =
    tone === 'danger'
      ? styles.textDanger
      : tone === 'neutral'
        ? styles.textNeutral
        : styles.textPrimary;
  const borderToneStyle =
    tone === 'danger'
      ? styles.buttonDanger
      : tone === 'neutral'
        ? styles.buttonNeutral
        : styles.buttonPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { minHeight },
        borderToneStyle,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={[styles.text, textToneStyle, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: ui.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    borderColor: ui.colors.border,
  },
  buttonNeutral: {
    borderColor: ui.colors.border,
  },
  buttonDanger: {
    borderColor: ui.colors.errorSoftBorder,
    backgroundColor: ui.colors.errorSoftBackground,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  textPrimary: {
    color: ui.colors.primary,
  },
  textNeutral: {
    color: ui.colors.textStrong,
  },
  textDanger: {
    color: ui.colors.errorStrong,
  },
});

