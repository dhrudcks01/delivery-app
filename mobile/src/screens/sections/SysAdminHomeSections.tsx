import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { SectionHeader } from '../../components/SectionHeader';
import type { OpsAdminGrantCandidate, SysAdminGrantCandidate } from '../../types/opsAdmin';
import type { RoleApplication } from '../../types/roleApplication';
import { ui } from '../../theme/ui';

type ApplicationStatusFilter = 'PENDING' | 'ALL';
type ScreenStyles = Record<string, any>;

type SysAdminHomeContentSectionProps = {
  styles: ScreenStyles;
  primaryColor: string;
  loginId: string;
  rolesLabel: string;
  applicationStatusFilter: ApplicationStatusFilter;
  onChangeApplicationStatusFilter: (filter: ApplicationStatusFilter) => void;
  opsAdminApplications: RoleApplication[];
  sysAdminApplications: RoleApplication[];
  pendingOpsCount: number;
  pendingSysCount: number;
  isLoadingOpsAdminApplications: boolean;
  opsAdminApplicationListError: string | null;
  selectedOpsAdminApplicationId: number | null;
  selectedOpsAdminApplication: RoleApplication | null;
  isProcessingOpsAdminApplication: boolean;
  opsAdminApplicationActionError: string | null;
  opsAdminApplicationActionResult: string | null;
  isLoadingSysAdminApplications: boolean;
  sysAdminApplicationListError: string | null;
  selectedSysAdminApplicationId: number | null;
  selectedSysAdminApplication: RoleApplication | null;
  isProcessingSysAdminApplication: boolean;
  sysAdminApplicationActionError: string | null;
  sysAdminApplicationActionResult: string | null;
  sysAdminGrantQuery: string;
  onChangeSysAdminGrantQuery: (value: string) => void;
  isLoadingSysAdminGrantCandidates: boolean;
  sysAdminGrantCandidateError: string | null;
  sysAdminGrantCandidates: SysAdminGrantCandidate[];
  selectedSysAdminGrantCandidateId: number | null;
  selectedSysAdminGrantCandidate: SysAdminGrantCandidate | null;
  isGrantingSysAdminRole: boolean;
  opsAdminGrantQuery: string;
  onChangeOpsAdminGrantQuery: (value: string) => void;
  isLoadingGrantCandidates: boolean;
  grantCandidateError: string | null;
  opsAdminGrantCandidates: OpsAdminGrantCandidate[];
  selectedGrantCandidateId: number | null;
  selectedGrantCandidate: OpsAdminGrantCandidate | null;
  userIdInput: string;
  onChangeUserIdInput: (value: string) => void;
  roleResultMessage: string | null;
  roleErrorMessage: string | null;
  isGranting: boolean;
  isRevoking: boolean;
  onRefreshOpsAdminApplications: () => void;
  onRefreshSysAdminApplications: () => void;
  onApproveOpsAdminApplication: () => void;
  onRejectOpsAdminApplication: () => void;
  onApproveSysAdminApplication: () => void;
  onRejectSysAdminApplication: () => void;
  onSearchSysAdminGrantCandidates: () => void;
  onSelectSysAdminGrantCandidate: (userId: number) => void;
  onGrantSysAdminRole: () => void;
  onSearchOpsAdminGrantCandidates: () => void;
  onSelectOpsAdminGrantCandidate: (userId: number) => void;
  onGrantOpsAdminRole: () => void;
  onRevokeOpsAdminRole: () => void;
  onSelectOpsAdminApplication: (id: number) => void;
  onSelectSysAdminApplication: (id: number) => void;
  getRoleApplicationSummary: (application: RoleApplication) => string;
  getApplicationStatusBadgeStyle: (status: string) => { container: any; text: any };
  formatDate: (dateTime: string | null) => string;
  resolveLoginId: (loginId?: string | null, email?: string | null) => string;
};

export function SysAdminHomeContentSection({
  styles,
  primaryColor,
  loginId,
  rolesLabel,
  applicationStatusFilter,
  onChangeApplicationStatusFilter,
  opsAdminApplications,
  sysAdminApplications,
  pendingOpsCount,
  pendingSysCount,
  isLoadingOpsAdminApplications,
  opsAdminApplicationListError,
  selectedOpsAdminApplicationId,
  selectedOpsAdminApplication,
  isProcessingOpsAdminApplication,
  opsAdminApplicationActionError,
  opsAdminApplicationActionResult,
  isLoadingSysAdminApplications,
  sysAdminApplicationListError,
  selectedSysAdminApplicationId,
  selectedSysAdminApplication,
  isProcessingSysAdminApplication,
  sysAdminApplicationActionError,
  sysAdminApplicationActionResult,
  sysAdminGrantQuery,
  onChangeSysAdminGrantQuery,
  isLoadingSysAdminGrantCandidates,
  sysAdminGrantCandidateError,
  sysAdminGrantCandidates,
  selectedSysAdminGrantCandidateId,
  selectedSysAdminGrantCandidate,
  isGrantingSysAdminRole,
  opsAdminGrantQuery,
  onChangeOpsAdminGrantQuery,
  isLoadingGrantCandidates,
  grantCandidateError,
  opsAdminGrantCandidates,
  selectedGrantCandidateId,
  selectedGrantCandidate,
  userIdInput,
  onChangeUserIdInput,
  roleResultMessage,
  roleErrorMessage,
  isGranting,
  isRevoking,
  onRefreshOpsAdminApplications,
  onRefreshSysAdminApplications,
  onApproveOpsAdminApplication,
  onRejectOpsAdminApplication,
  onApproveSysAdminApplication,
  onRejectSysAdminApplication,
  onSearchSysAdminGrantCandidates,
  onSelectSysAdminGrantCandidate,
  onGrantSysAdminRole,
  onSearchOpsAdminGrantCandidates,
  onSelectOpsAdminGrantCandidate,
  onGrantOpsAdminRole,
  onRevokeOpsAdminRole,
  onSelectOpsAdminApplication,
  onSelectSysAdminApplication,
  getRoleApplicationSummary,
  getApplicationStatusBadgeStyle,
  formatDate,
  resolveLoginId,
}: SysAdminHomeContentSectionProps) {
  return (
    <View style={styles.screenContainer}>
      <Card style={styles.headerCard}>
        <SectionHeader
          badge="SYS_ADMIN"
          title="운영 권한 관리"
          description="신청 승인/반려와 역할 부여를 한 화면에서 처리합니다."
          titleStyle={styles.title}
          descriptionStyle={styles.description}
        />
        <Text style={styles.meta}>로그인 아이디: {loginId}</Text>
        <Text style={styles.meta}>역할: {rolesLabel}</Text>
      </Card>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>OPS 신청</Text>
          <Text style={styles.summaryValue}>{opsAdminApplications.length}건</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>SYS 신청</Text>
          <Text style={styles.summaryValue}>{sysAdminApplications.length}건</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>PENDING</Text>
          <Text style={styles.summaryValue}>{pendingOpsCount + pendingSysCount}건</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>상태 필터</Text>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, applicationStatusFilter === 'PENDING' && styles.filterChipActive]}
            onPress={() => onChangeApplicationStatusFilter('PENDING')}
          >
            <Text style={[styles.filterChipText, applicationStatusFilter === 'PENDING' && styles.filterChipTextActive]}>
              PENDING
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, applicationStatusFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => onChangeApplicationStatusFilter('ALL')}
          >
            <Text style={[styles.filterChipText, applicationStatusFilter === 'ALL' && styles.filterChipTextActive]}>
              전체
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>OPS_ADMIN 권한 신청 승인</Text>
          <Pressable
            style={[styles.ghostButton, isLoadingOpsAdminApplications && styles.buttonDisabled]}
            onPress={onRefreshOpsAdminApplications}
            disabled={isLoadingOpsAdminApplications}
          >
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>
        {isLoadingOpsAdminApplications && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={primaryColor} />
            <Text style={styles.loadingText}>OPS_ADMIN 신청 목록 로딩 중...</Text>
          </View>
        )}
        {opsAdminApplicationListError && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{opsAdminApplicationListError}</Text>
          </View>
        )}
        {!isLoadingOpsAdminApplications && !opsAdminApplicationListError && opsAdminApplications.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>[]</Text>
            <Text style={styles.emptyTitle}>조회된 OPS_ADMIN 신청이 없습니다.</Text>
            <Text style={styles.emptyDescription}>새 신청이 접수되면 여기에 표시됩니다.</Text>
          </View>
        )}
        {!isLoadingOpsAdminApplications && !opsAdminApplicationListError && opsAdminApplications.length > 0 && (
          <View style={styles.listWrap}>
            {opsAdminApplications.map((item) => {
              const badgeStyle = getApplicationStatusBadgeStyle(item.status);
              return (
                <Pressable
                  key={item.id}
                  style={[styles.listItem, selectedOpsAdminApplicationId === item.id && styles.listItemActive]}
                  onPress={() => onSelectOpsAdminApplication(item.id)}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.listTitle}>신청 #{item.id}</Text>
                    <View style={[styles.statusBadge, badgeStyle.container]}>
                      <Text style={[styles.statusBadgeText, badgeStyle.text]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.listSub}>{getRoleApplicationSummary(item)}</Text>
                  <Text style={styles.listSub}>신청일: {formatDate(item.createdAt)}</Text>
                  <Text style={styles.listSub}>처리자 아이디: {resolveLoginId(item.processedByLoginId, item.processedByEmail)}</Text>
                  <Text style={styles.listSub}>처리시각: {formatDate(item.processedAt)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {selectedOpsAdminApplication && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>신청자: {getRoleApplicationSummary(selectedOpsAdminApplication)}</Text>
            <Text style={styles.detailText}>사유: {selectedOpsAdminApplication.reason}</Text>
          </View>
        )}
        {opsAdminApplicationActionResult && (
          <View style={styles.successCard}>
            <Text style={styles.success}>{opsAdminApplicationActionResult}</Text>
          </View>
        )}
        {opsAdminApplicationActionError && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{opsAdminApplicationActionError}</Text>
          </View>
        )}
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, isProcessingOpsAdminApplication && styles.buttonDisabled]}
            onPress={onApproveOpsAdminApplication}
            disabled={isProcessingOpsAdminApplication || !selectedOpsAdminApplicationId}
          >
            <Text style={styles.buttonText}>승인</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.rejectButton, isProcessingOpsAdminApplication && styles.buttonDisabled]}
            onPress={onRejectOpsAdminApplication}
            disabled={isProcessingOpsAdminApplication || !selectedOpsAdminApplicationId}
          >
            <Text style={styles.buttonText}>반려</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>SYS_ADMIN 권한 신청 승인</Text>
          <Pressable
            style={[styles.ghostButton, isLoadingSysAdminApplications && styles.buttonDisabled]}
            onPress={onRefreshSysAdminApplications}
            disabled={isLoadingSysAdminApplications}
          >
            <Text style={styles.ghostButtonText}>새로고침</Text>
          </Pressable>
        </View>
        {isLoadingSysAdminApplications && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={primaryColor} />
            <Text style={styles.loadingText}>SYS_ADMIN 신청 목록 로딩 중...</Text>
          </View>
        )}
        {sysAdminApplicationListError && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{sysAdminApplicationListError}</Text>
          </View>
        )}
        {!isLoadingSysAdminApplications && !sysAdminApplicationListError && sysAdminApplications.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>[]</Text>
            <Text style={styles.emptyTitle}>조회된 SYS_ADMIN 신청이 없습니다.</Text>
            <Text style={styles.emptyDescription}>새 신청이 접수되면 여기에 표시됩니다.</Text>
          </View>
        )}
        {!isLoadingSysAdminApplications && !sysAdminApplicationListError && sysAdminApplications.length > 0 && (
          <View style={styles.listWrap}>
            {sysAdminApplications.map((item) => {
              const badgeStyle = getApplicationStatusBadgeStyle(item.status);
              return (
                <Pressable
                  key={item.id}
                  style={[styles.listItem, selectedSysAdminApplicationId === item.id && styles.listItemActive]}
                  onPress={() => onSelectSysAdminApplication(item.id)}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.listTitle}>신청 #{item.id}</Text>
                    <View style={[styles.statusBadge, badgeStyle.container]}>
                      <Text style={[styles.statusBadgeText, badgeStyle.text]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.listSub}>{getRoleApplicationSummary(item)}</Text>
                  <Text style={styles.listSub}>신청일: {formatDate(item.createdAt)}</Text>
                  <Text style={styles.listSub}>처리자 아이디: {resolveLoginId(item.processedByLoginId, item.processedByEmail)}</Text>
                  <Text style={styles.listSub}>처리시각: {formatDate(item.processedAt)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {selectedSysAdminApplication && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>신청자: {getRoleApplicationSummary(selectedSysAdminApplication)}</Text>
            <Text style={styles.detailText}>사유: {selectedSysAdminApplication.reason}</Text>
          </View>
        )}
        {sysAdminApplicationActionResult && (
          <View style={styles.successCard}>
            <Text style={styles.success}>{sysAdminApplicationActionResult}</Text>
          </View>
        )}
        {sysAdminApplicationActionError && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{sysAdminApplicationActionError}</Text>
          </View>
        )}
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, isProcessingSysAdminApplication && styles.buttonDisabled]}
            onPress={onApproveSysAdminApplication}
            disabled={isProcessingSysAdminApplication || !selectedSysAdminApplicationId}
          >
            <Text style={styles.buttonText}>승인</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.rejectButton, isProcessingSysAdminApplication && styles.buttonDisabled]}
            onPress={onRejectSysAdminApplication}
            disabled={isProcessingSysAdminApplication || !selectedSysAdminApplicationId}
          >
            <Text style={styles.buttonText}>반려</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SYS_ADMIN 권한 부여 대상 검색 (비 SYS_ADMIN)</Text>
        <Text style={styles.meta}>SYS_ADMIN 미보유 계정만 검색됩니다. 자기 자신의 권한은 변경할 수 없습니다.</Text>
        <Text style={styles.label}>검색어 (아이디/이름)</Text>
        <View style={styles.buttonRow}>
          <TextInput
            style={[styles.input, styles.flexInput]}
            value={sysAdminGrantQuery}
            onChangeText={onChangeSysAdminGrantQuery}
            placeholder="예: admin"
            placeholderTextColor={ui.colors.placeholder}
          />
          <Pressable style={styles.secondaryButton} onPress={onSearchSysAdminGrantCandidates}>
            <Text style={styles.secondaryButtonText}>검색</Text>
          </Pressable>
        </View>

        {isLoadingSysAdminGrantCandidates && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={primaryColor} />
            <Text style={styles.loadingText}>SYS_ADMIN 부여 대상 조회 중...</Text>
          </View>
        )}
        {sysAdminGrantCandidateError && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{sysAdminGrantCandidateError}</Text>
          </View>
        )}
        {sysAdminGrantCandidates.map((item) => (
          <Pressable
            key={item.userId}
            style={[styles.listItem, selectedSysAdminGrantCandidateId === item.userId && styles.listItemActive]}
            onPress={() => onSelectSysAdminGrantCandidate(item.userId)}
          >
            <Text style={styles.listTitle}>이름: {item.name}</Text>
            <Text style={styles.listSub}>아이디: {item.loginId}</Text>
            <Text style={styles.listSub}>사용자 번호: {item.userId}</Text>
          </Pressable>
        ))}
        {!isLoadingSysAdminGrantCandidates && sysAdminGrantCandidates.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>[]</Text>
            <Text style={styles.emptyTitle}>조회된 SYS_ADMIN 부여 대상이 없습니다.</Text>
            <Text style={styles.emptyDescription}>검색어를 변경해 다시 시도해 주세요.</Text>
          </View>
        )}

        {selectedSysAdminGrantCandidate && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>선택 이름: {selectedSysAdminGrantCandidate.name}</Text>
            <Text style={styles.detailText}>선택 아이디: {selectedSysAdminGrantCandidate.loginId}</Text>
            <Text style={styles.detailText}>사용자 번호: {selectedSysAdminGrantCandidate.userId}</Text>
          </View>
        )}

        <Pressable
          style={[styles.button, isGrantingSysAdminRole && styles.buttonDisabled]}
          onPress={onGrantSysAdminRole}
          disabled={isGrantingSysAdminRole || !selectedSysAdminGrantCandidateId}
        >
          <Text style={styles.buttonText}>
            {isGrantingSysAdminRole ? 'SYS_ADMIN 부여 중...' : '선택 대상 SYS_ADMIN 권한 부여'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>OPS_ADMIN 권한 부여 대상 검색 (DRIVER)</Text>
        <Text style={styles.meta}>DRIVER 권한 보유 + OPS_ADMIN 미보유 계정만 검색됩니다.</Text>
        <Text style={styles.label}>검색어 (아이디/이름)</Text>
        <View style={styles.buttonRow}>
          <TextInput
            style={[styles.input, styles.flexInput]}
            value={opsAdminGrantQuery}
            onChangeText={onChangeOpsAdminGrantQuery}
            placeholder="예: driver"
            placeholderTextColor={ui.colors.placeholder}
          />
          <Pressable style={styles.secondaryButton} onPress={onSearchOpsAdminGrantCandidates}>
            <Text style={styles.secondaryButtonText}>검색</Text>
          </Pressable>
        </View>

        {isLoadingGrantCandidates && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={primaryColor} />
            <Text style={styles.loadingText}>권한 부여 대상 조회 중...</Text>
          </View>
        )}
        {grantCandidateError && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{grantCandidateError}</Text>
          </View>
        )}
        {opsAdminGrantCandidates.map((item) => (
          <Pressable
            key={item.userId}
            style={[styles.listItem, selectedGrantCandidateId === item.userId && styles.listItemActive]}
            onPress={() => onSelectOpsAdminGrantCandidate(item.userId)}
          >
            <Text style={styles.listTitle}>이름: {item.name}</Text>
            <Text style={styles.listSub}>아이디: {item.loginId}</Text>
            <Text style={styles.listSub}>사용자 번호: {item.userId}</Text>
          </Pressable>
        ))}
        {!isLoadingGrantCandidates && opsAdminGrantCandidates.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>[]</Text>
            <Text style={styles.emptyTitle}>조회된 부여 대상이 없습니다.</Text>
            <Text style={styles.emptyDescription}>검색어를 변경해 다시 시도해 주세요.</Text>
          </View>
        )}

        {selectedGrantCandidate && (
          <View style={styles.resultBox}>
            <Text style={styles.detailText}>선택 이름: {selectedGrantCandidate.name}</Text>
            <Text style={styles.detailText}>선택 아이디: {selectedGrantCandidate.loginId}</Text>
            <Text style={styles.detailText}>사용자 번호: {selectedGrantCandidate.userId}</Text>
          </View>
        )}

        <Text style={styles.label}>권한 회수용 사용자 ID</Text>
        <TextInput
          style={styles.input}
          value={userIdInput}
          onChangeText={onChangeUserIdInput}
          placeholder="예: 12"
          keyboardType="numeric"
          placeholderTextColor={ui.colors.placeholder}
        />

        {roleResultMessage && (
          <View style={styles.successCard}>
            <Text style={styles.success}>{roleResultMessage}</Text>
          </View>
        )}
        {roleErrorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{roleErrorMessage}</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, isGranting && styles.buttonDisabled]}
            onPress={onGrantOpsAdminRole}
            disabled={isGranting || isRevoking}
          >
            <Text style={styles.buttonText}>{isGranting ? '부여 중...' : '선택 대상 권한 부여'}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.rejectButton, isRevoking && styles.buttonDisabled]}
            onPress={onRevokeOpsAdminRole}
            disabled={isGranting || isRevoking}
          >
            <Text style={styles.buttonText}>{isRevoking ? '회수 중...' : '권한 회수'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}


