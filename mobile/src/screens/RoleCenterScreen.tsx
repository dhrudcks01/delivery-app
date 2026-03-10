import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createDriverApplication, getMyDriverApplications } from '../api/driverApplicationApi';
import { getOpsAdminGrantCandidates, grantOpsAdminRole } from '../api/sysAdminRoleApi';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { useRoleCenterDerived } from './hooks/useRoleCenterDerived';
import { RoleCenterHeaderSection } from './sections/RoleCenterSections';
import { DriverApplication } from '../types/driverApplication';
import { OpsAdminGrantCandidate } from '../types/opsAdmin';
import { ui } from '../theme/ui';
import { toApiErrorMessage } from '../utils/errorMessage';
import { getStatusBadgePalette, resolveApplicationStatusBadgeTone } from '../utils/statusBadge';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';

type RoleCenterScreenProps = {
  activeRole: AppRole;
  onOpenSysAdminApproval: () => void;
};

const ERROR_MESSAGE_OPTIONS = {
  defaultMessage: '요청 처리 중 오류가 발생했습니다.',
  timeoutMessage: '요청 처리 중 오류가 발생했습니다.',
  networkMessage: '요청 처리 중 오류가 발생했습니다.',
};

function formatDate(dateTime: string | null): string {
  if (!dateTime) {
    return '-';
  }
  return new Date(dateTime).toLocaleString();
}

export function RoleCenterScreen({ activeRole, onOpenSysAdminApproval }: RoleCenterScreenProps) {
  const [driverReason, setDriverReason] = useState('');
  const [driverApplications, setDriverApplications] = useState<DriverApplication[]>([]);
  const [isSubmittingDriverApplication, setIsSubmittingDriverApplication] = useState(false);
  const [isLoadingDriverApplications, setIsLoadingDriverApplications] = useState(false);
  const [driverApplicationError, setDriverApplicationError] = useState<string | null>(null);
  const [driverApplicationResult, setDriverApplicationResult] = useState<string | null>(null);

  const [opsAdminGrantQuery, setOpsAdminGrantQuery] = useState('');
  const [opsAdminGrantCandidates, setOpsAdminGrantCandidates] = useState<OpsAdminGrantCandidate[]>([]);
  const [selectedGrantCandidateId, setSelectedGrantCandidateId] = useState<number | null>(null);
  const [isLoadingGrantCandidates, setIsLoadingGrantCandidates] = useState(false);
  const [isGrantingOpsAdmin, setIsGrantingOpsAdmin] = useState(false);
  const [opsAdminGrantError, setOpsAdminGrantError] = useState<string | null>(null);
  const [opsAdminGrantResult, setOpsAdminGrantResult] = useState<string | null>(null);
  const {
    roleBadgeText,
    isUserRole,
    isOpsAdminRole,
    isSysAdminRole,
    isDriverRole,
    selectedGrantCandidate,
  } = useRoleCenterDerived({
    activeRole,
    opsAdminGrantCandidates,
    selectedGrantCandidateId,
  });

  const loadDriverApplications = async () => {
    setIsLoadingDriverApplications(true);
    setDriverApplicationError(null);
    try {
      const data = await getMyDriverApplications();
      setDriverApplications(data);
    } catch (error) {
      setDriverApplicationError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsLoadingDriverApplications(false);
    }
  };

  const loadOpsAdminGrantCandidates = async () => {
    setIsLoadingGrantCandidates(true);
    setOpsAdminGrantError(null);
    try {
      const response = await getOpsAdminGrantCandidates({
        query: opsAdminGrantQuery.trim() || undefined,
        page: 0,
        size: 20,
      });
      setOpsAdminGrantCandidates(response.content);
      setSelectedGrantCandidateId((current) => {
        if (current && response.content.some((item) => item.userId === current)) {
          return current;
        }
        return response.content[0]?.userId ?? null;
      });
    } catch (error) {
      setOpsAdminGrantCandidates([]);
      setSelectedGrantCandidateId(null);
      setOpsAdminGrantError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsLoadingGrantCandidates(false);
    }
  };

  const handleSubmitDriverApplication = async () => {
    const reason = driverReason.trim();
    if (!reason) {
      setDriverApplicationError('신청 사유를 입력해 주세요.');
      return;
    }

    setIsSubmittingDriverApplication(true);
    setDriverApplicationError(null);
    setDriverApplicationResult(null);

    try {
      const response = await createDriverApplication(reason);
      setDriverReason('');
      setDriverApplicationResult(`DRIVER 권한 신청이 접수되었습니다. (신청 #${response.id}, 상태: ${response.status})`);
      await loadDriverApplications();
    } catch (error) {
      setDriverApplicationError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsSubmittingDriverApplication(false);
    }
  };

  const handleGrantOpsAdmin = async () => {
    const candidate = selectedGrantCandidate;
    if (!candidate) {
      setOpsAdminGrantError('부여할 사용자를 선택해 주세요.');
      return;
    }

    setIsGrantingOpsAdmin(true);
    setOpsAdminGrantError(null);
    setOpsAdminGrantResult(null);

    try {
      await grantOpsAdminRole(candidate.userId);
      setOpsAdminGrantResult(`${candidate.name} (${candidate.loginId}) 계정에 OPS_ADMIN 권한을 부여했습니다.`);
      await loadOpsAdminGrantCandidates();
    } catch (error) {
      setOpsAdminGrantError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      setIsGrantingOpsAdmin(false);
    }
  };

  useEffect(() => {
    if (isUserRole) {
      void loadDriverApplications();
    }
    if (isOpsAdminRole) {
      void loadOpsAdminGrantCandidates();
    }
  }, [isUserRole, isOpsAdminRole]);

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <RoleCenterHeaderSection styles={styles} roleBadgeText={roleBadgeText} />

      {isUserRole && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DRIVER 권한 신청</Text>
          <Text style={styles.caption}>신청 사유를 입력하면 운영자가 검토 후 승인/반려합니다.</Text>

          <Text style={styles.fieldLabel}>신청 사유</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={driverReason}
            onChangeText={setDriverReason}
            multiline
            placeholder="DRIVER 신청 사유를 입력해 주세요"
            placeholderTextColor={ui.colors.placeholder}
            editable={!isSubmittingDriverApplication}
          />

          {driverApplicationResult && (
            <View style={styles.successCard}>
              <Text style={styles.successText}>{driverApplicationResult}</Text>
            </View>
          )}
          {driverApplicationError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{driverApplicationError}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, isSubmittingDriverApplication && styles.buttonDisabled]}
            onPress={() => void handleSubmitDriverApplication()}
            disabled={isSubmittingDriverApplication}
          >
            <Text style={styles.primaryButtonText}>{isSubmittingDriverApplication ? '신청 중...' : 'DRIVER 권한 신청'}</Text>
          </Pressable>
        </View>
      )}

      {isUserRole && (
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>내 DRIVER 신청 내역</Text>
            <Pressable
              style={[styles.secondaryButtonCompact, isLoadingDriverApplications && styles.buttonDisabled]}
              onPress={() => void loadDriverApplications()}
              disabled={isLoadingDriverApplications}
            >
              <Text style={styles.secondaryButtonCompactText}>{isLoadingDriverApplications ? '불러오는 중...' : '새로고침'}</Text>
            </Pressable>
          </View>

          {isLoadingDriverApplications && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
              <View style={styles.loadingCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
            </View>
          )}

          {!isLoadingDriverApplications && driverApplications.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>DRIVER 신청 내역이 없습니다</Text>
              <Text style={styles.emptyDescription}>상단에서 권한 신청을 진행하면 이곳에 표시됩니다.</Text>
            </View>
          )}

          {driverApplications.map((item) => {
            const badgePalette = getStatusBadgePalette(resolveApplicationStatusBadgeTone(item.status));
            return (
              <View key={item.id} style={styles.listCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.listTitle}>신청 #{item.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badgePalette.backgroundColor }]}>
                    <Text style={[styles.statusBadgeText, { color: badgePalette.textColor }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.listMeta}>신청일: {formatDate(item.createdAt)}</Text>
                <Text style={styles.listMeta}>처리일: {formatDate(item.processedAt)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {isOpsAdminRole && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>OPS_ADMIN 권한 부여</Text>
          <Text style={styles.caption}>신청이 아닌 운영 부여 동선입니다. (대상: DRIVER + OPS_ADMIN 미보유)</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.queryInput]}
              value={opsAdminGrantQuery}
              onChangeText={setOpsAdminGrantQuery}
              placeholder="검색어(아이디/이름)"
              placeholderTextColor={ui.colors.placeholder}
              editable={!isLoadingGrantCandidates}
            />
            <Pressable
              style={[styles.secondaryButtonCompact, isLoadingGrantCandidates && styles.buttonDisabled]}
              onPress={() => void loadOpsAdminGrantCandidates()}
              disabled={isLoadingGrantCandidates}
            >
              <Text style={styles.secondaryButtonCompactText}>검색</Text>
            </Pressable>
          </View>

          {isLoadingGrantCandidates && (
            <View style={styles.loadingGroup}>
              <View style={styles.loadingCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
              <View style={styles.loadingCard}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
              </View>
            </View>
          )}

          {!isLoadingGrantCandidates && opsAdminGrantCandidates.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>[]</Text>
              <Text style={styles.emptyTitle}>부여 대상이 없습니다</Text>
              <Text style={styles.emptyDescription}>검색 조건에 맞는 사용자(드라이버)가 없습니다.</Text>
            </View>
          )}

          {opsAdminGrantCandidates.map((item) => {
            const selected = selectedGrantCandidateId === item.userId;
            return (
              <Pressable
                key={item.userId}
                style={[styles.listCard, selected && styles.listCardSelected]}
                onPress={() => setSelectedGrantCandidateId(item.userId)}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  {selected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>선택됨</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.listMeta}>아이디: {item.loginId}</Text>
                <Text style={styles.listMeta}>사용자 번호: {item.userId}</Text>
              </Pressable>
            );
          })}

          {opsAdminGrantResult && (
            <View style={styles.successCard}>
              <Text style={styles.successText}>{opsAdminGrantResult}</Text>
            </View>
          )}
          {opsAdminGrantError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{opsAdminGrantError}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, isGrantingOpsAdmin && styles.buttonDisabled]}
            onPress={() => void handleGrantOpsAdmin()}
            disabled={isGrantingOpsAdmin}
          >
            <Text style={styles.primaryButtonText}>{isGrantingOpsAdmin ? '권한 부여 중...' : '선택 사용자 권한 부여'}</Text>
          </Pressable>
        </View>
      )}

      {isSysAdminRole && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>권한 승인 메뉴</Text>
          <Text style={styles.caption}>OPS_ADMIN/SYS_ADMIN 권한 신청 승인 화면으로 이동합니다.</Text>
          <Pressable style={styles.primaryButton} onPress={onOpenSysAdminApproval}>
            <Text style={styles.primaryButtonText}>권한 승인/부여 화면 열기</Text>
          </Pressable>
        </View>
      )}

      {isDriverRole && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>권한 메뉴 안내</Text>
          <Text style={styles.caption}>현재 역할에서는 권한 신청/부여 메뉴가 제공되지 않습니다.</Text>
          <Text style={styles.caption}>OPS_ADMIN 신청/부여 메뉴는 노출되지 않습니다.</Text>
        </View>
      )}
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: ui.colors.background,
    gap: 24,
  },
  headerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    padding: 16,
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: ui.colors.primarySoftBackground,
    color: ui.colors.primaryPressed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  description: {
    fontSize: 14,
    color: ui.colors.text,
    lineHeight: 20,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: ui.colors.infoSoftBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: ui.colors.primaryPressed,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.textStrong,
  },
  caption: {
    fontSize: 12,
    color: ui.colors.caption,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.colors.textStrong,
  },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: ui.colors.textStrong,
    backgroundColor: ui.colors.card,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  queryInput: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingGroup: {
    gap: 10,
  },
  loadingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    padding: 12,
    gap: 8,
  },
  skeletonLineShort: {
    height: 10,
    width: '45%',
    borderRadius: 999,
    backgroundColor: ui.colors.skeleton,
  },
  skeletonLineLong: {
    height: 10,
    width: '78%',
    borderRadius: 999,
    backgroundColor: ui.colors.skeleton,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: {
    color: ui.colors.caption,
    fontSize: 16,
  },
  emptyTitle: {
    color: ui.colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDescription: {
    color: ui.colors.caption,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  listCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: ui.colors.card,
  },
  listCardSelected: {
    borderColor: ui.colors.primarySoftBorder,
    backgroundColor: ui.colors.infoSoftBackground,
  },
  listTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  listMeta: {
    color: ui.colors.caption,
    fontSize: 12,
  },
  selectedBadge: {
    borderRadius: 999,
    backgroundColor: ui.colors.primarySoftBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    color: ui.colors.primaryPressed,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: ui.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: ui.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonCompact: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonCompactText: {
    color: ui.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  successCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.successBorder,
    backgroundColor: ui.colors.successSoftBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: {
    color: ui.colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.errorSoftBorder,
    backgroundColor: ui.colors.errorSoftBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: ui.colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
});



