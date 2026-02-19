import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

function MainTabs() {
  return (
    <MainTab.Navigator initialRouteName="UserHome" screenOptions={{ headerTitleAlign: 'center' }}>
      <MainTab.Screen name="UserHome" component={UserHomeScreen} options={{ title: 'USER' }} />
      <MainTab.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'DRIVER' }} />
      <MainTab.Screen name="OpsAdminHome" component={OpsAdminHomeScreen} options={{ title: 'OPS_ADMIN' }} />
      <MainTab.Screen name="SysAdminHome" component={SysAdminHomeScreen} options={{ title: 'SYS_ADMIN' }} />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <RootStack.Navigator initialRouteName="Login" screenOptions={{ headerTitleAlign: 'center' }}>
      <RootStack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
      <RootStack.Screen name="MainTabs" component={MainTabs} options={{ title: '역할별 홈' }} />
    </RootStack.Navigator>
  );
}
