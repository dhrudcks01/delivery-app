import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { ui } from '../theme/ui';

type SectionHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
};

export function SectionHeader({
  title,
  description,
  badge,
  action,
  style,
  titleStyle,
  descriptionStyle,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      <View style={styles.titleRow}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {action}
      </View>
      {description ? <Text style={[styles.description, descriptionStyle]}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.textStrong,
    flexShrink: 1,
  },
  description: {
    fontSize: 14,
    color: ui.colors.text,
    lineHeight: 20,
  },
});
