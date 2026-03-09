import type { ReactNode } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

function formatDateTime(dateTime: string | null): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
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
  loginId,
  roles,
  primaryRole,
}: {
  loginId: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
}) {
  return (
    <ScrollView contentContainerStyle={styles.homeContainer}>
      <View style={styles.homeHeaderCard}>
        <Text style={styles.homeBadge}>USER</Text>
        <Text style={styles.homeTitle}>공통 홈</Text>
        <Text style={styles.homeCaption}>USER 권한 기준으로 신청/이력/내정보 동선을 확인합니다.</Text>
      </View>

      <View style={styles.homeSummaryCard}>
        <Text style={styles.homeSectionTitle}>계정 요약</Text>
        <View style={styles.homeInfoRow}>
          <Text style={styles.homeInfoLabel}>로그인 아이디</Text>
          <Text style={styles.homeInfoValue}>{loginId ?? '-'}</Text>
        </View>
        <View style={styles.homeInfoRow}>
          <Text style={styles.homeInfoLabel}>보유 권한</Text>
          <Text style={styles.homeInfoValue}>{roles.join(', ')}</Text>
        </View>
        <View style={styles.homeInfoRow}>
          <Text style={styles.homeInfoLabel}>적용 권한(최고 권한)</Text>
          <Text style={styles.homeInfoValue}>{primaryRole}</Text>
        </View>
      </View>

      <View style={styles.homeGuideCard}>
        <Text style={styles.homeSectionTitle}>탭 정책</Text>
        <Text style={styles.homeGuideText}>신청: 수거 신청 생성 전용</Text>
        <Text style={styles.homeGuideText}>이용내역: 신청/처리 이력 확인</Text>
        <Text style={styles.homeGuideText}>내정보: 주소관리/결제수단/설정(로그아웃)</Text>
      </View>
    </ScrollView>
  );
}

function TabProfileScreen({
  loginId,
  roles,
  primaryRole,
  phoneNumber,
  phoneVerifiedAt,
  phoneVerificationProvider,
  hasUserRole,
  onOpenAddressManagement,
  onOpenPaymentManagement,
  onOpenRoleCenter,
  onOpenSettings,
}: {
  loginId: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  phoneVerificationProvider: string | null;
  hasUserRole: boolean;
  onOpenAddressManagement: () => void;
  onOpenPaymentManagement: () => void;
  onOpenRoleCenter: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.profileContainer}>
      <View style={styles.profileHeaderCard}>
        <Text style={styles.profileBadge}>내정보</Text>
        <Text style={styles.profileTitle}>계정 및 설정</Text>
        <Text style={styles.profileDescription}>계정 상태를 확인하고 주요 설정 메뉴로 이동할 수 있습니다.</Text>
      </View>

      <View style={styles.profileSectionCard}>
        <Text style={styles.profileSectionTitle}>로그인 정보</Text>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>로그인 아이디</Text>
          <Text style={styles.profileInfoValue}>{loginId ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.profileSectionCard}>
        <Text style={styles.profileSectionTitle}>권한 정보</Text>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>보유 권한</Text>
          <Text style={styles.profileInfoValue}>{roles.length > 0 ? roles.join(', ') : '-'}</Text>
        </View>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>적용 권한(최고 권한)</Text>
          <Text style={styles.profileInfoValue}>{primaryRole}</Text>
        </View>
      </View>

      <View style={styles.profileSectionCard}>
        <Text style={styles.profileSectionTitle}>휴대폰 인증정보</Text>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>휴대폰 번호</Text>
          <Text style={styles.profileInfoValue}>{phoneNumber ?? '-'}</Text>
        </View>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>인증 일시</Text>
          <Text style={styles.profileInfoValue}>{formatDateTime(phoneVerifiedAt)}</Text>
        </View>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>인증 수단</Text>
          <Text style={styles.profileInfoValue}>{phoneVerificationProvider ?? '-'}</Text>
        </View>
        <View style={[styles.profileStatusBadge, !phoneVerifiedAt && styles.profileStatusBadgeWarning]}>
          <Text style={[styles.profileStatusText, !phoneVerifiedAt && styles.profileStatusTextWarning]}>
            {phoneVerifiedAt ? '인증 완료' : '인증 필요'}
          </Text>
        </View>
      </View>

      <View style={styles.profileSectionCard}>
        <Text style={styles.profileSectionTitle}>메뉴</Text>
        {hasUserRole && (
          <Pressable
            style={({ pressed }) => [
              styles.profileSecondaryButton,
              pressed && styles.profileButtonPressed,
            ]}
            onPress={onOpenAddressManagement}
          >
            <Text style={styles.profileSecondaryButtonText}>주소관리</Text>
          </Pressable>
        )}
        {hasUserRole && (
          <Pressable
            style={({ pressed }) => [
              styles.profileSecondaryButton,
              pressed && styles.profileButtonPressed,
            ]}
            onPress={onOpenPaymentManagement}
          >
            <Text style={styles.profileSecondaryButtonText}>결제수단 관리</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.profileSecondaryButton,
            pressed && styles.profileButtonPressed,
          ]}
          onPress={onOpenRoleCenter}
        >
          <Text style={styles.profileSecondaryButtonText}>권한 신청/승인</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.profilePrimaryButton,
            pressed && styles.profilePrimaryButtonPressed,
          ]}
          onPress={onOpenSettings}
        >
          <Text style={styles.profilePrimaryButtonText}>설정</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

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
    tabBarShowIcon: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: '#2563EB',
    tabBarInactiveTintColor: '#64748B',
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
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
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
        options={{ title: TAB_TO_LABEL.RequestTab, headerShown: false }}
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
  homeContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 16,
  },
  homeHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  homeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  homeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  homeCaption: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  homeSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  homeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  homeInfoRow: {
    gap: 4,
  },
  homeInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  homeInfoValue: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  homeGuideCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  homeGuideText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  profileContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 16,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileDescription: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  profileSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  profileInfoRow: {
    gap: 4,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  profileInfoValue: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  profileStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  profileStatusBadgeWarning: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  profileStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  profileStatusTextWarning: {
    color: '#B45309',
  },
  profileSecondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  profileSecondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  profilePrimaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  profilePrimaryButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  profilePrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileButtonPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
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
