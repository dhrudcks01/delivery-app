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
} & Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;

export function KeyboardAwareScrollScreen({
  children,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
  ...rest
}: KeyboardAwareScrollScreenProps) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        contentContainerStyle={[{ paddingBottom: Math.max(insets.bottom, 16) + 8 }, contentContainerStyle]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentInsetAdjustmentBehavior="always"
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
