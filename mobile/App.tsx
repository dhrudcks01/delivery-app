import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/RootNavigator';
import { subscribeNotificationTapRouting } from './src/notifications/notificationTapRouting';
import type { NotificationTapRoute } from './src/notifications/notificationTapRouting';

function AppNavigation() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { isAuthenticated, phoneVerificationRequired } = useAuth();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<NotificationTapRoute | null>(null);

  useEffect(() => {
    return subscribeNotificationTapRouting((route) => {
      setPendingRoute(route);
    });
  }, []);

  useEffect(() => {
    if (!pendingRoute) {
      return;
    }
    if (!isNavigationReady || !navigationRef.isReady()) {
      return;
    }
    if (!isAuthenticated || phoneVerificationRequired) {
      return;
    }

    if (pendingRoute.name === 'WasteRequestDetail') {
      navigationRef.navigate('WasteRequestDetail', pendingRoute.params);
    } else {
      navigationRef.navigate('NotificationInbox');
    }
    setPendingRoute(null);
  }, [
    isAuthenticated,
    isNavigationReady,
    navigationRef,
    pendingRoute,
    phoneVerificationRequired,
  ]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setIsNavigationReady(true);
      }}
    >
      <StatusBar style="dark" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
