import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type KeyboardAwareScrollScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  includeTopInset?: boolean;
  includeBottomInset?: boolean;
} & Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;

export function KeyboardAwareScrollScreen({
  children,
  contentContainerStyle,
  includeTopInset = false,
  includeBottomInset = true,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
  ...rest
}: KeyboardAwareScrollScreenProps) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight : 0;
  const topPadding = includeTopInset ? insets.top : 0;
  const bottomPadding = includeBottomInset ? Math.max(insets.bottom, 16) + 8 : 8;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        contentContainerStyle={[{ paddingTop: topPadding, paddingBottom: bottomPadding }, contentContainerStyle]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentInsetAdjustmentBehavior={includeTopInset ? 'never' : 'automatic'}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
