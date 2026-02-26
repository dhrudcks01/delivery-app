import type { ReactNode } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { DriverHomeScreen } from '../screens/DriverHomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OpsAdminHomeScreen } from '../screens/OpsAdminHomeScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { RoleCenterScreen } from '../screens/RoleCenterScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { SysAdminHomeScreen } from '../screens/SysAdminHomeScreen';
import { UserAddressManagementScreen } from '../screens/UserAddressManagementScreen';
import { UserHomeScreen } from '../screens/UserHomeScreen';
import { UserPaymentManagementScreen } from '../screens/UserPaymentManagementScreen';
import { UserWasteRequestDetailScreen } from '../screens/UserWasteRequestDetailScreen';
import { ui } from '../theme/ui';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';
type AppTabName = 'HomeTab' | 'RequestTab' | 'HistoryTab' | 'ProfileTab';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  AppTabs: undefined;
  RoleCenter: { activeRole: AppRole };
  DriverHome: undefined;
  OpsAdminHome: undefined;
  SysAdminHome: undefined;
  UserAddressManagement: undefined;
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
      <ActivityIndicator size="large" color="#0f172a" />
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

function TabHomeScreen({
  email,
  roles,
  primaryRole,
}: {
  email: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
}) {
  return (
    <ScrollView contentContainerStyle={styles.tabContainer}>
      <Text style={styles.tabTitle}>공통 홈</Text>
      <Text style={styles.tabMeta}>로그인: {email ?? '-'}</Text>
      <Text style={styles.tabMeta}>보유 권한: {roles.join(', ')}</Text>
      <Text style={styles.tabMeta}>적용 권한(최고 권한): {primaryRole}</Text>
      <View style={styles.tabCard}>
        <Text style={styles.tabCardTitle}>탭 정책</Text>
        <Text style={styles.tabCardText}>신청: 수거 신청 생성 전용</Text>
        <Text style={styles.tabCardText}>이용내역: 신청/처리 이력 확인</Text>
        <Text style={styles.tabCardText}>내정보: 주소관리/결제수단/설정(로그아웃)</Text>
      </View>
    </ScrollView>
  );
}

function TabProfileScreen({
  email,
  roles,
  primaryRole,
  hasUserRole,
  onOpenAddressManagement,
  onOpenPaymentManagement,
  onOpenRoleCenter,
  onOpenSettings,
}: {
  email: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
  hasUserRole: boolean;
  onOpenAddressManagement: () => void;
  onOpenPaymentManagement: () => void;
  onOpenRoleCenter: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.tabContainer}>
      <Text style={styles.tabTitle}>내정보</Text>
      <Text style={styles.tabMeta}>로그인: {email ?? '-'}</Text>
      <Text style={styles.tabMeta}>보유 권한: {roles.join(', ')}</Text>
      <Text style={styles.tabMeta}>적용 권한(최고 권한): {primaryRole}</Text>

      {hasUserRole && (
        <Pressable style={styles.menuButton} onPress={onOpenAddressManagement}>
          <Text style={styles.menuButtonText}>주소관리</Text>
        </Pressable>
      )}
      {hasUserRole && (
        <Pressable style={styles.menuButton} onPress={onOpenPaymentManagement}>
          <Text style={styles.menuButtonText}>결제수단 관리</Text>
        </Pressable>
      )}

      <Pressable style={styles.menuButton} onPress={onOpenRoleCenter}>
        <Text style={styles.menuButtonText}>권한 신청/승인</Text>
      </Pressable>

      <Pressable style={styles.menuButton} onPress={onOpenSettings}>
        <Text style={styles.menuButtonText}>설정</Text>
      </Pressable>
    </ScrollView>
  );
}

function AppTabsScreen() {
  const { me } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roles = toKnownRoles(me?.roles);
  const primaryRole = getHighestRole(roles);
  const hasUserRole = roles.includes('USER');
  const isPrimaryUser = primaryRole === 'USER';

  const sharedTabOptions = {
    headerTitleAlign: 'center' as const,
    tabBarActiveTintColor: ui.colors.primary,
    tabBarInactiveTintColor: ui.colors.textMuted,
    tabBarLabelStyle: { fontWeight: '700' as const, fontSize: 12 },
  };

  return (
    <AppTabs.Navigator screenOptions={sharedTabOptions}>
      <AppTabs.Screen
        name="HomeTab"
        options={{ title: TAB_TO_LABEL.HomeTab, headerShown: isPrimaryUser }}
        children={() =>
          isPrimaryUser
            ? (
              <TabHomeScreen
                email={me?.email ?? null}
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
        options={{ title: TAB_TO_LABEL.RequestTab, headerShown: false }}
        children={() =>
          hasUserRole
            ? <UserHomeScreen section="request-form" includeTopInset />
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
        options={{ title: TAB_TO_LABEL.HistoryTab, headerShown: false }}
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
        options={{ title: TAB_TO_LABEL.ProfileTab }}
        children={() => (
          <TabProfileScreen
            email={me?.email ?? null}
            roles={roles}
            primaryRole={primaryRole}
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
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator
      key={isAuthenticated ? 'auth' : 'guest'}
      initialRouteName={!isAuthenticated ? 'Login' : 'AppTabs'}
      screenOptions={{ headerTitleAlign: 'center' }}
    >
      {!isAuthenticated && <RootStack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />}
      {!isAuthenticated && <RootStack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />}

      {isAuthenticated && (
        <RootStack.Screen name="AppTabs" component={AppTabsScreen} options={{ headerShown: false }} />
      )}

      {isAuthenticated && (
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
      {isAuthenticated && <RootStack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'DRIVER' }} />}
      {isAuthenticated && <RootStack.Screen name="OpsAdminHome" component={OpsAdminHomeScreen} options={{ title: 'OPS_ADMIN' }} />}
      {isAuthenticated && <RootStack.Screen name="SysAdminHome" component={SysAdminHomeScreen} options={{ title: 'SYS_ADMIN' }} />}
      {isAuthenticated && (
        <RootStack.Screen
          name="UserAddressManagement"
          component={UserAddressManagementScreen}
          options={{ title: '주소관리' }}
        />
      )}
      {isAuthenticated && (
        <RootStack.Screen
          name="UserPaymentManagement"
          component={UserPaymentManagementScreen}
          options={{ title: '결제수단 관리' }}
        />
      )}
      {isAuthenticated && (
        <RootStack.Screen
          name="WasteRequestDetail"
          component={UserWasteRequestDetailScreen}
          options={{ title: '수거요청 상세' }}
        />
      )}
      {isAuthenticated && (
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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#334155',
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
  menuButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#eef8f6',
  },
  menuButtonText: {
    color: ui.colors.primary,
    fontWeight: '700',
  },
});
