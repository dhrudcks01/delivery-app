import { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { DriverHomeScreen } from '../screens/DriverHomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OpsAdminHomeScreen } from '../screens/OpsAdminHomeScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { SysAdminHomeScreen } from '../screens/SysAdminHomeScreen';
import { UserHomeScreen } from '../screens/UserHomeScreen';
import { ui } from '../theme/ui';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';
type AppTabName = 'HomeTab' | 'RequestTab' | 'HistoryTab' | 'ProfileTab';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  AppTabs: undefined;
  UserHome: undefined;
  DriverHome: undefined;
  OpsAdminHome: undefined;
  SysAdminHome: undefined;
};

type AppTabParamList = Record<AppTabName, undefined>;

const ROLE_ORDER: AppRole[] = ['USER', 'DRIVER', 'OPS_ADMIN', 'SYS_ADMIN'];

const ROLE_TO_LABEL: Record<AppRole, string> = {
  USER: 'USER',
  DRIVER: 'DRIVER',
  OPS_ADMIN: 'OPS_ADMIN',
  SYS_ADMIN: 'SYS_ADMIN',
};

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
  const known = ROLE_ORDER.filter((role) => roleSet.has(role));
  return known.length > 0 ? known : ['USER'];
}

function renderRoleScreen(role: AppRole) {
  if (role === 'DRIVER') {
    return <DriverHomeScreen />;
  }
  if (role === 'OPS_ADMIN') {
    return <OpsAdminHomeScreen />;
  }
  if (role === 'SYS_ADMIN') {
    return <SysAdminHomeScreen />;
  }
  return <UserHomeScreen />;
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0f172a" />
      <Text style={styles.loadingText}>인증 상태를 확인하고 있습니다.</Text>
    </View>
  );
}

function RoleSwitcher({
  roles,
  activeRole,
  onSelectRole,
}: {
  roles: AppRole[];
  activeRole: AppRole;
  onSelectRole: (role: AppRole) => void;
}) {
  return (
    <View style={styles.roleSwitchRow}>
      {roles.map((role) => (
        <Pressable
          key={role}
          style={[styles.roleChip, activeRole === role && styles.roleChipActive]}
          onPress={() => onSelectRole(role)}
        >
          <Text style={[styles.roleChipText, activeRole === role && styles.roleChipTextActive]}>
            {ROLE_TO_LABEL[role]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TabHomeScreen({
  email,
  roles,
  activeRole,
  onSelectRole,
}: {
  email: string | null;
  roles: AppRole[];
  activeRole: AppRole;
  onSelectRole: (role: AppRole) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.tabContainer}>
      <Text style={styles.tabTitle}>공통 홈</Text>
      <Text style={styles.tabMeta}>로그인: {email ?? '-'}</Text>
      <Text style={styles.tabMeta}>현재 역할 뷰: {activeRole}</Text>
      <Text style={styles.tabHelp}>멀티 권한 계정은 역할 칩으로 화면 뷰를 전환할 수 있습니다.</Text>
      <RoleSwitcher roles={roles} activeRole={activeRole} onSelectRole={onSelectRole} />
      <View style={styles.tabCard}>
        <Text style={styles.tabCardTitle}>탭 정책</Text>
        <Text style={styles.tabCardText}>신청: 역할별 작업 화면</Text>
        <Text style={styles.tabCardText}>이용내역: 역할별 목록/상세 조회</Text>
        <Text style={styles.tabCardText}>내정보: 계정 정보/로그아웃</Text>
      </View>
    </ScrollView>
  );
}

function TabProfileScreen({
  email,
  roles,
  activeRole,
  onSelectRole,
  onOpenRequestForm,
  onSignOut,
}: {
  email: string | null;
  roles: AppRole[];
  activeRole: AppRole;
  onSelectRole: (role: AppRole) => void;
  onOpenRequestForm: () => void;
  onSignOut: () => void;
}) {
  const isUserRole = activeRole === 'USER';

  return (
    <ScrollView contentContainerStyle={styles.tabContainer}>
      <Text style={styles.tabTitle}>내정보</Text>
      <Text style={styles.tabMeta}>로그인: {email ?? '-'}</Text>
      <Text style={styles.tabMeta}>보유 역할: {roles.join(', ')}</Text>
      <RoleSwitcher roles={roles} activeRole={activeRole} onSelectRole={onSelectRole} />
      {isUserRole && (
        <Pressable style={styles.requestEntryButton} onPress={onOpenRequestForm}>
          <Text style={styles.requestEntryButtonText}>기사 신청하기</Text>
        </Pressable>
      )}
      <Pressable style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutButtonText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

function UserRequestTabGuideScreen() {
  return (
    <ScrollView contentContainerStyle={styles.tabContainer}>
      <Text style={styles.tabTitle}>신청 안내</Text>
      <Text style={styles.tabMeta}>USER 계정 정책</Text>
      <View style={styles.tabCard}>
        <Text style={styles.tabCardTitle}>기사 신청 진입 경로</Text>
        <Text style={styles.tabCardText}>내정보 탭에서 "기사 신청하기" 메뉴로 진입해 주세요.</Text>
      </View>
    </ScrollView>
  );
}

function AppTabsScreen() {
  const { me, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roles = toKnownRoles(me?.roles);
  const [activeRole, setActiveRole] = useState<AppRole>(roles[0] ?? 'USER');
  const isUserRole = activeRole === 'USER';

  useEffect(() => {
    if (!roles.includes(activeRole)) {
      setActiveRole(roles[0] ?? 'USER');
    }
  }, [activeRole, roles]);

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
        options={{ title: TAB_TO_LABEL.HomeTab }}
        children={() => (
          <TabHomeScreen
            email={me?.email ?? null}
            roles={roles}
            activeRole={activeRole}
            onSelectRole={setActiveRole}
          />
        )}
      />
      <AppTabs.Screen
        name="RequestTab"
        options={{ title: TAB_TO_LABEL.RequestTab, headerShown: false }}
        children={() => (isUserRole ? <UserRequestTabGuideScreen /> : renderRoleScreen(activeRole))}
      />
      <AppTabs.Screen
        name="HistoryTab"
        options={{ title: TAB_TO_LABEL.HistoryTab, headerShown: false }}
        children={() => (isUserRole ? <UserHomeScreen section="history" /> : renderRoleScreen(activeRole))}
      />
      <AppTabs.Screen
        name="ProfileTab"
        options={{ title: TAB_TO_LABEL.ProfileTab }}
        children={() => (
          <TabProfileScreen
            email={me?.email ?? null}
            roles={roles}
            activeRole={activeRole}
            onSelectRole={setActiveRole}
            onOpenRequestForm={() => navigation.navigate('UserHome')}
            onSignOut={() => {
              void signOut();
            }}
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
          name="UserHome"
          options={{ title: '기사 신청', headerShown: true }}
          children={() => <UserHomeScreen section="request-form" />}
        />
      )}
      {isAuthenticated && <RootStack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'DRIVER' }} />}
      {isAuthenticated && <RootStack.Screen name="OpsAdminHome" component={OpsAdminHomeScreen} options={{ title: 'OPS_ADMIN' }} />}
      {isAuthenticated && <RootStack.Screen name="SysAdminHome" component={SysAdminHomeScreen} options={{ title: 'SYS_ADMIN' }} />}
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
  tabHelp: {
    color: ui.colors.textMuted,
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
  roleSwitchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#9fc2b9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  roleChipActive: {
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.text,
  },
  roleChipTextActive: {
    color: ui.colors.primary,
  },
  requestEntryButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#eef8f6',
  },
  requestEntryButtonText: {
    color: ui.colors.primary,
    fontWeight: '700',
  },
  signOutButton: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#64748b',
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  signOutButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
});

