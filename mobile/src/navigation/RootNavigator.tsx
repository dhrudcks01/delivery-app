import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { DriverAssignedRequestDetailScreen } from '../screens/DriverAssignedRequestDetailScreen';
import { DriverHomeScreen } from '../screens/DriverHomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OpsAdminHomeScreen } from '../screens/OpsAdminHomeScreen';
import { OpsWasteRequestDetailScreen } from '../screens/OpsWasteRequestDetailScreen';
import { PhoneVerificationScreen } from '../screens/PhoneVerificationScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { RoleCenterScreen } from '../screens/RoleCenterScreen';
import { ServiceAreaBrowseScreen } from '../screens/ServiceAreaBrowseScreen';
import { ServiceAreaManagementScreen } from '../screens/ServiceAreaManagementScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { SysAdminHomeScreen } from '../screens/SysAdminHomeScreen';
import { TabHomeScreen } from '../screens/TabHomeScreen';
import { TabProfileScreen } from '../screens/TabProfileScreen';
import { UserAddressManagementScreen } from '../screens/UserAddressManagementScreen';
import { UserWasteRequestCreateScreen } from '../screens/UserWasteRequestCreateScreen';
import { UserHomeScreen } from '../screens/UserHomeScreen';
import { UserPaymentManagementScreen } from '../screens/UserPaymentManagementScreen';
import { UserWasteRequestDetailScreen } from '../screens/UserWasteRequestDetailScreen';
import { ui } from '../theme/ui';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';
type AppTabName = 'HomeTab' | 'RequestTab' | 'HistoryTab' | 'ProfileTab';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  PhoneVerification: undefined;
  AppTabs: undefined;
  RoleCenter: { activeRole: AppRole };
  DriverHome: undefined;
  OpsAdminHome: undefined;
  OpsWasteRequestDetail: { requestId: number };
  SysAdminHome: undefined;
  DriverAssignedRequestDetail: { requestId: number };
  UserAddressManagement: undefined;
  ServiceAreaBrowse: undefined;
  ServiceAreaManagement: undefined;
  UserPaymentManagement: undefined;
  WasteRequestDetail: { requestId: number; orderNo?: string };
  ProfileSettings: undefined;
};

type AppTabParamList = Record<AppTabName, undefined>;

const ROLE_DISPLAY_ORDER: AppRole[] = ['USER', 'DRIVER', 'OPS_ADMIN', 'SYS_ADMIN'];
const ROLE_PRIORITY_ORDER: AppRole[] = ['SYS_ADMIN', 'OPS_ADMIN', 'DRIVER', 'USER'];

const TAB_TO_LABEL: Record<AppTabName, string> = {
  HomeTab: '홈',
  RequestTab: '신청',
  HistoryTab: '이용내역',
  ProfileTab: '내정보',
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

function toKnownRoles(roles: string[] | undefined): AppRole[] {
  const roleSet = new Set(roles);
  const known = ROLE_DISPLAY_ORDER.filter((role) => roleSet.has(role));
  return known.length > 0 ? known : ['USER'];
}

function getHighestRole(roles: AppRole[]): AppRole {
  return ROLE_PRIORITY_ORDER.find((role) => roles.includes(role)) ?? 'USER';
}

function renderOperationalScreen(role: AppRole) {
  if (role === 'DRIVER') {
    return <DriverHomeScreen />;
  }
  if (role === 'OPS_ADMIN') {
    return <OpsAdminHomeScreen />;
  }
  if (role === 'SYS_ADMIN') {
    return <SysAdminHomeScreen />;
  }
  return <UserHomeScreen section="history" />;
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={ui.colors.textStrong} />
      <Text style={styles.loadingText}>인증 상태를 확인하고 있습니다.</Text>
    </View>
  );
}

function UserRoleGuideScreen({ title, description }: { title: string; description: string }) {
  return (
    <ScrollView contentContainerStyle={styles.tabContainer}>
      <Text style={styles.tabTitle}>{title}</Text>
      <Text style={styles.tabMeta}>{description}</Text>
    </ScrollView>
  );
}

function HeaderlessScreenContainer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerlessScreenContainer, { paddingTop: insets.top }]}>
      {children}
    </View>
  );
}


type TabBarIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

type TabIconName =
  | 'home'
  | 'home-outline'
  | 'add-circle'
  | 'add-circle-outline'
  | 'list'
  | 'list-outline'
  | 'person-circle'
  | 'person-circle-outline';

const TAB_ICON_NAMES: Record<AppTabName, { active: TabIconName; inactive: TabIconName }> = {
  HomeTab: { active: 'home', inactive: 'home-outline' },
  RequestTab: { active: 'add-circle', inactive: 'add-circle-outline' },
  HistoryTab: { active: 'list', inactive: 'list-outline' },
  ProfileTab: { active: 'person-circle', inactive: 'person-circle-outline' },
};

function renderTabIcon(tabName: AppTabName) {
  const names = TAB_ICON_NAMES[tabName];
  return ({ color, size, focused }: TabBarIconProps) => (
    <Ionicons
      name={focused ? names.active : names.inactive}
      size={Math.max(size, 19)}
      color={color}
      style={styles.tabBarIcon}
    />
  );
}

const renderHomeTabIcon = renderTabIcon('HomeTab');
const renderRequestTabIcon = renderTabIcon('RequestTab');
const renderHistoryTabIcon = renderTabIcon('HistoryTab');
const renderProfileTabIcon = renderTabIcon('ProfileTab');

function AppTabsScreen() {
  const { me } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const roles = toKnownRoles(me?.roles);
  const primaryRole = getHighestRole(roles);
  const hasUserRole = roles.includes('USER');
  const isPrimaryUser = primaryRole === 'USER';
  const tabBarBottomInset = Math.max(insets.bottom, 8);

  const sharedTabOptions = {
    headerTitleAlign: 'center' as const,
    tabBarShowIcon: true,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: ui.colors.primary,
    tabBarInactiveTintColor: ui.colors.caption,
    tabBarLabelStyle: {
      fontWeight: '700' as const,
      fontSize: 12,
      lineHeight: 16,
      paddingBottom: 2,
    },
    tabBarItemStyle: {
      minHeight: 44,
      justifyContent: 'center' as const,
      borderRadius: 12,
      marginHorizontal: 2,
    },
    tabBarStyle: {
      height: 64 + tabBarBottomInset,
      paddingTop: 8,
      paddingBottom: tabBarBottomInset,
      backgroundColor: ui.colors.card,
      borderTopWidth: 1,
      borderTopColor: ui.colors.border,
    },
  };

  return (
    <AppTabs.Navigator screenOptions={sharedTabOptions}>
      <AppTabs.Screen
        name="HomeTab"
        options={{
          title: TAB_TO_LABEL.HomeTab,
          headerShown: isPrimaryUser,
          tabBarIcon: renderHomeTabIcon,
        }}
        children={() =>
          isPrimaryUser
            ? (
              <TabHomeScreen
                loginId={me?.loginId ?? me?.email ?? null}
                roles={roles}
                primaryRole={primaryRole}
              />
              )
            : (
              <HeaderlessScreenContainer>
                {renderOperationalScreen(primaryRole)}
              </HeaderlessScreenContainer>
              )
        }
      />
      <AppTabs.Screen
        name="RequestTab"
        options={{
          title: TAB_TO_LABEL.RequestTab,
          headerShown: false,
          tabBarIcon: renderRequestTabIcon,
        }}
        children={() =>
          hasUserRole
            ? <UserWasteRequestCreateScreen includeTopInset />
            : (
              <HeaderlessScreenContainer>
                <UserRoleGuideScreen
                  title="신청 안내"
                  description="신청 탭은 USER 권한 계정에서 수거 신청 생성 용도로만 제공됩니다."
                />
              </HeaderlessScreenContainer>
              )
        }
      />
      <AppTabs.Screen
        name="HistoryTab"
        options={{
          title: TAB_TO_LABEL.HistoryTab,
          headerShown: false,
          tabBarIcon: renderHistoryTabIcon,
        }}
        children={() =>
          hasUserRole
            ? <UserHomeScreen section="history" includeTopInset />
            : (
              <HeaderlessScreenContainer>
                <UserRoleGuideScreen
                  title="이용내역 안내"
                  description="이용내역은 USER 권한 계정의 신청/처리 이력을 조회하는 메뉴입니다."
                />
              </HeaderlessScreenContainer>
              )
        }
      />
      <AppTabs.Screen
        name="ProfileTab"
        options={{
          title: TAB_TO_LABEL.ProfileTab,
          tabBarIcon: renderProfileTabIcon,
        }}
        children={() => (
          <TabProfileScreen
            loginId={me?.loginId ?? me?.email ?? null}
            roles={roles}
            primaryRole={primaryRole}
            phoneNumber={me?.phoneNumber ?? null}
            phoneVerifiedAt={me?.phoneVerifiedAt ?? null}
            phoneVerificationProvider={me?.phoneVerificationProvider ?? null}
            hasUserRole={hasUserRole}
            onOpenAddressManagement={() => navigation.navigate('UserAddressManagement')}
            onOpenPaymentManagement={() => navigation.navigate('UserPaymentManagement')}
            onOpenRoleCenter={() => navigation.navigate('RoleCenter', { activeRole: primaryRole })}
            onOpenSettings={() => navigation.navigate('ProfileSettings')}
          />
        )}
      />
    </AppTabs.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, isAuthenticated, phoneVerificationRequired } = useAuth();
  const isPhoneVerificationPending = isAuthenticated && phoneVerificationRequired;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator
      key={!isAuthenticated ? 'guest' : isPhoneVerificationPending ? 'phone-verification' : 'auth'}
      initialRouteName={!isAuthenticated ? 'Login' : isPhoneVerificationPending ? 'PhoneVerification' : 'AppTabs'}
      screenOptions={{ headerTitleAlign: 'center' }}
    >
      {!isAuthenticated && <RootStack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />}
      {!isAuthenticated && <RootStack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />}

      {isPhoneVerificationPending && (
        <RootStack.Screen
          name="PhoneVerification"
          component={PhoneVerificationScreen}
          options={{ title: '휴대폰 본인인증', headerShown: false }}
        />
      )}

      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen name="AppTabs" component={AppTabsScreen} options={{ headerShown: false }} />
      )}

      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="RoleCenter"
          options={{ title: '권한 신청/승인', headerShown: true }}
          children={({ route, navigation: stackNav }) => (
            <RoleCenterScreen
              activeRole={route.params.activeRole}
              onOpenSysAdminApproval={() => stackNav.navigate('SysAdminHome')}
            />
          )}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && <RootStack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'DRIVER' }} />}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="DriverAssignedRequestDetail"
          component={DriverAssignedRequestDetailScreen}
          options={{ title: '배정 상세' }}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && <RootStack.Screen name="OpsAdminHome" component={OpsAdminHomeScreen} options={{ title: 'OPS_ADMIN' }} />}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="OpsWasteRequestDetail"
          component={OpsWasteRequestDetailScreen}
          options={{ title: '수거 요청 상세' }}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && <RootStack.Screen name="SysAdminHome" component={SysAdminHomeScreen} options={{ title: 'SYS_ADMIN' }} />}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="UserAddressManagement"
          component={UserAddressManagementScreen}
          options={{ title: '주소관리' }}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="ServiceAreaBrowse"
          component={ServiceAreaBrowseScreen}
          options={{ title: '서비스 가능 지역' }}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="ServiceAreaManagement"
          component={ServiceAreaManagementScreen}
          options={{ title: '서비스 신청지역' }}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="UserPaymentManagement"
          component={UserPaymentManagementScreen}
          options={{ title: '결제수단 관리' }}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="WasteRequestDetail"
          component={UserWasteRequestDetailScreen}
          options={{ title: '수거요청 상세' }}
        />
      )}
      {isAuthenticated && !isPhoneVerificationPending && (
        <RootStack.Screen
          name="ProfileSettings"
          component={ProfileSettingsScreen}
          options={{ title: '설정' }}
        />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.colors.surfaceMuted,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: ui.colors.text,
  },
  headerlessScreenContainer: {
    flex: 1,
    backgroundColor: ui.colors.screen,
  },
  tabContainer: {
    padding: 16,
    backgroundColor: ui.colors.screen,
    gap: 12,
  },
  tabTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  tabMeta: {
    color: ui.colors.text,
    fontSize: 13,
  },
  tabCard: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 14,
    gap: 6,
  },
  tabCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  tabCardText: {
    fontSize: 13,
    color: ui.colors.text,
  },
  tabBarIcon: {
    textAlign: 'center',
  },
});


