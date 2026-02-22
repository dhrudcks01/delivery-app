import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { DriverHomeScreen } from '../screens/DriverHomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OpsAdminHomeScreen } from '../screens/OpsAdminHomeScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { SysAdminHomeScreen } from '../screens/SysAdminHomeScreen';
import { UserHomeScreen } from '../screens/UserHomeScreen';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';
type HomeScreenName = 'UserHome' | 'DriverHome' | 'OpsAdminHome' | 'SysAdminHome';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  RoleHub: undefined;
  UserHome: undefined;
  DriverHome: undefined;
  OpsAdminHome: undefined;
  SysAdminHome: undefined;
};

const ROLE_ORDER: AppRole[] = ['DRIVER', 'OPS_ADMIN', 'SYS_ADMIN', 'USER'];

const ROLE_TO_HOME_SCREEN: Record<AppRole, HomeScreenName> = {
  USER: 'UserHome',
  DRIVER: 'DriverHome',
  OPS_ADMIN: 'OpsAdminHome',
  SYS_ADMIN: 'SysAdminHome',
};

const ROLE_TO_LABEL: Record<AppRole, string> = {
  USER: 'USER 화면',
  DRIVER: 'DRIVER 배정 화면',
  OPS_ADMIN: 'OPS_ADMIN 화면',
  SYS_ADMIN: 'SYS_ADMIN 화면',
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

function toKnownRoles(roles: string[] | undefined): AppRole[] {
  const roleSet = new Set(roles);
  const known = ROLE_ORDER.filter((role) => roleSet.has(role));
  return known.length > 0 ? known : ['USER'];
}

function resolveSingleRoleHome(roles: AppRole[]): HomeScreenName {
  const highest = roles[0] ?? 'USER';
  return ROLE_TO_HOME_SCREEN[highest];
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0f172a" />
      <Text style={styles.loadingText}>인증 상태를 확인하고 있습니다.</Text>
    </View>
  );
}

function RoleHubScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'RoleHub'>) {
  const { me, signOut } = useAuth();
  const roles = toKnownRoles(me?.roles);

  return (
    <View style={styles.hubContainer}>
      <Text style={styles.hubTitle}>역할 선택</Text>
      <Text style={styles.hubDescription}>사용할 역할 화면을 선택해 주세요.</Text>
      <Text style={styles.hubMeta}>로그인: {me?.email ?? '-'}</Text>

      {roles.map((role) => {
        const screenName = ROLE_TO_HOME_SCREEN[role];
        return (
          <Pressable key={role} style={styles.roleButton} onPress={() => navigation.navigate(screenName)}>
            <Text style={styles.roleButtonText}>{ROLE_TO_LABEL[role]}</Text>
          </Pressable>
        );
      })}

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutButtonText}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

export function RootNavigator() {
  const { isLoading, isAuthenticated, me } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const roles = toKnownRoles(me?.roles);
  const isMultiRole = roles.length > 1;
  const singleRoleHome = resolveSingleRoleHome(roles);

  return (
    <RootStack.Navigator
      key={isAuthenticated ? (isMultiRole ? 'auth-multi' : 'auth-single') : 'guest'}
      initialRouteName={
        !isAuthenticated
          ? 'Login'
          : isMultiRole
            ? 'RoleHub'
            : singleRoleHome
      }
      screenOptions={{ headerTitleAlign: 'center' }}
    >
      {!isAuthenticated && <RootStack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />}
      {!isAuthenticated && (
        <RootStack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />
      )}

      {isAuthenticated && isMultiRole && (
        <RootStack.Screen name="RoleHub" component={RoleHubScreen} options={{ title: '역할 선택' }} />
      )}

      {isAuthenticated && roles.includes('USER') && (
        <RootStack.Screen name="UserHome" component={UserHomeScreen} options={{ title: 'USER' }} />
      )}
      {isAuthenticated && roles.includes('DRIVER') && (
        <RootStack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'DRIVER' }} />
      )}
      {isAuthenticated && roles.includes('OPS_ADMIN') && (
        <RootStack.Screen
          name="OpsAdminHome"
          component={OpsAdminHomeScreen}
          options={{ title: 'OPS_ADMIN' }}
        />
      )}
      {isAuthenticated && roles.includes('SYS_ADMIN') && (
        <RootStack.Screen
          name="SysAdminHome"
          component={SysAdminHomeScreen}
          options={{ title: 'SYS_ADMIN' }}
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
  hubContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  hubTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  hubDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },
  hubMeta: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 14,
  },
  roleButton: {
    borderRadius: 10,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleButtonText: {
    color: '#ffffff',
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
