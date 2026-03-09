import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ui } from '../theme/ui';
import { Card } from './Card';
import { SecondaryButton } from './SecondaryButton';

type ScreenStateVariant = 'loading' | 'empty' | 'error';

type ScreenStateProps = {
  variant: ScreenStateVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

const STATE_ICON: Record<Exclude<ScreenStateVariant, 'loading'>, string> = {
  empty: '[]',
  error: '!',
};

export function ScreenState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: ScreenStateProps) {
  if (variant === 'loading') {
    return (
      <Card style={[styles.loadingCard, style]} padding={12}>
        <ActivityIndicator size="small" color={ui.colors.primary} />
        <View style={styles.textWrap}>
          <Text style={styles.loadingTitle}>{title}</Text>
          {description ? <Text style={styles.loadingDescription}>{description}</Text> : null}
        </View>
      </Card>
    );
  }

  return (
    <Card style={[styles.stateCard, style]}>
      <Text style={styles.icon}>{STATE_ICON[variant]}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <SecondaryButton
          label={actionLabel}
          onPress={onAction}
          tone={variant === 'error' ? 'danger' : 'neutral'}
          style={styles.actionButton}
          minHeight={44}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  loadingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  loadingDescription: {
    fontSize: 12,
    color: ui.colors.text,
    lineHeight: 18,
  },
  stateCard: {
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
    color: ui.colors.caption,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.textStrong,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: ui.colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButton: {
    width: '100%',
  },
});
