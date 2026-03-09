import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { ui } from '../theme/ui';

type TabHeaderCardProps = {
  badge: string;
  title: string;
  description: string;
  meta?: ReactNode;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
};

export function TabHeaderCard({
  badge,
  title,
  description,
  meta,
  rightSlot,
  style,
  descriptionStyle,
}: TabHeaderCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text style={styles.badge}>{badge}</Text>
        {rightSlot}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.description, descriptionStyle]}>{description}</Text>
      {meta ? <View style={styles.metaContainer}>{meta}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: ui.colors.text,
  },
  metaContainer: {
    gap: 4,
  },
});
