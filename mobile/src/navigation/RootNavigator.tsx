import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { DriverHomeScreen } from '../screens/DriverHomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OpsAdminHomeScreen } from '../screens/OpsAdminHomeScreen';
import { SysAdminHomeScreen } from '../screens/SysAdminHomeScreen';
import { UserHomeScreen } from '../screens/UserHomeScreen';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  UserHome: undefined;
  DriverHome: undefined;
  OpsAdminHome: undefined;
  SysAdminHome: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const TAB_ORDER: Array<keyof MainTabParamList> = ['UserHome', 'DriverHome', 'OpsAdminHome', 'SysAdminHome'];

function roleToTab(role: string): keyof MainTabParamList | null {
  if (role === 'USER') return 'UserHome';
  if (role === 'DRIVER') return 'DriverHome';
  if (role === 'OPS_ADMIN') return 'OpsAdminHome';
  if (role === 'SYS_ADMIN') return 'SysAdminHome';
  return null;
}

function resolveTabs(roles: string[]): Array<keyof MainTabParamList> {
  const tabs = roles
    .map(roleToTab)
    .filter((tab): tab is keyof MainTabParamList => tab !== null);

  const uniqueTabs = Array.from(new Set(tabs));
  return TAB_ORDER.filter((tab) => uniqueTabs.includes(tab));
}

function resolveInitialTab(roles: string[]): keyof MainTabParamList {
  if (roles.includes('SYS_ADMIN')) return 'SysAdminHome';
  if (roles.includes('OPS_ADMIN')) return 'OpsAdminHome';
  if (roles.includes('DRIVER')) return 'DriverHome';
  return 'UserHome';
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0f172a" />
      <Text style={styles.loadingText}>인증 상태를 확인하고 있습니다.</Text>
    </View>
  );
}

function MainTabs() {
  const { me } = useAuth();
  const roles = me?.roles ?? [];
  const availableTabs = resolveTabs(roles.length > 0 ? roles : ['USER']);
  const initialTab = resolveInitialTab(roles);

  return (
    <MainTab.Navigator initialRouteName={initialTab} screenOptions={{ headerTitleAlign: 'center' }}>
      {availableTabs.includes('UserHome') && (
        <MainTab.Screen name="UserHome" component={UserHomeScreen} options={{ title: 'USER' }} />
      )}
      {availableTabs.includes('DriverHome') && (
        <MainTab.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'DRIVER' }} />
      )}
      {availableTabs.includes('OpsAdminHome') && (
        <MainTab.Screen
          name="OpsAdminHome"
          component={OpsAdminHomeScreen}
          options={{ title: 'OPS_ADMIN' }}
        />
      )}
      {availableTabs.includes('SysAdminHome') && (
        <MainTab.Screen
          name="SysAdminHome"
          component={SysAdminHomeScreen}
          options={{ title: 'SYS_ADMIN' }}
        />
      )}
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator
      initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
      screenOptions={{ headerTitleAlign: 'center' }}
    >
      {!isAuthenticated ? (
        <RootStack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
      ) : (
        <RootStack.Screen name="MainTabs" component={MainTabs} options={{ title: '역할별 홈' }} />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#334155',
  },
});
