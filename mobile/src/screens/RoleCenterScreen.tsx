import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createDriverApplication, getMyDriverApplications } from '../api/driverApplicationApi';
import { createSysAdminApplication } from '../api/roleApplicationApi';
import { ui } from '../theme/ui';
import { DriverApplication } from '../types/driverApplication';
import { ApiErrorResponse } from '../types/waste';

type AppRole = 'USER' | 'DRIVER' | 'OPS_ADMIN' | 'SYS_ADMIN';

type RoleCenterScreenProps = {
  activeRole: AppRole;
  onOpenSysAdminApproval: () => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    return apiError?.message ?? '요청 처리 중 오류가 발생했습니다.';
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

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

  const [sysAdminReason, setSysAdminReason] = useState('');
  const [isSubmittingSysAdminApplication, setIsSubmittingSysAdminApplication] = useState(false);
  const [sysAdminApplicationError, setSysAdminApplicationError] = useState<string | null>(null);
  const [sysAdminApplicationResult, setSysAdminApplicationResult] = useState<string | null>(null);

  const loadDriverApplications = async () => {
    setIsLoadingDriverApplications(true);
    setDriverApplicationError(null);
    try {
      const data = await getMyDriverApplications();
      setDriverApplications(data);
    } catch (error) {
      setDriverApplicationError(toErrorMessage(error));
    } finally {
      setIsLoadingDriverApplications(false);
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
      setDriverApplicationError(toErrorMessage(error));
    } finally {
      setIsSubmittingDriverApplication(false);
    }
  };

  const handleSubmitSysAdminApplication = async () => {
    const reason = sysAdminReason.trim();
    if (!reason) {
      setSysAdminApplicationError('신청 사유를 입력해 주세요.');
      return;
    }

    setIsSubmittingSysAdminApplication(true);
    setSysAdminApplicationError(null);
    setSysAdminApplicationResult(null);

    try {
      const response = await createSysAdminApplication(reason);
      setSysAdminReason('');
      setSysAdminApplicationResult(`SYS_ADMIN 권한 신청이 접수되었습니다. (신청 #${response.id}, 상태: ${response.status})`);
    } catch (error) {
      setSysAdminApplicationError(toErrorMessage(error));
    } finally {
      setIsSubmittingSysAdminApplication(false);
    }
  };

  useEffect(() => {
    if (activeRole === 'USER') {
      void loadDriverApplications();
    }
  }, [activeRole]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>권한 신청/승인</Text>
      <Text style={styles.meta}>현재 역할 뷰: {activeRole}</Text>

      {activeRole === 'USER' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DRIVER 권한 신청</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={driverReason}
            onChangeText={setDriverReason}
            multiline
            placeholder="DRIVER 신청 사유"
            placeholderTextColor="#94a3b8"
            editable={!isSubmittingDriverApplication}
          />
          {driverApplicationResult && <Text style={styles.success}>{driverApplicationResult}</Text>}
          {driverApplicationError && <Text style={styles.error}>{driverApplicationError}</Text>}
          <Pressable
            style={[styles.button, isSubmittingDriverApplication && styles.buttonDisabled]}
            onPress={handleSubmitDriverApplication}
            disabled={isSubmittingDriverApplication}
          >
            <Text style={styles.buttonText}>{isSubmittingDriverApplication ? '신청 중..' : 'DRIVER 권한 신청'}</Text>
          </Pressable>
        </View>
      )}

      {activeRole === 'USER' && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>내 DRIVER 신청 내역</Text>
            <Pressable style={styles.ghostButton} onPress={() => void loadDriverApplications()}>
              <Text style={styles.ghostButtonText}>새로고침</Text>
            </Pressable>
          </View>
          {isLoadingDriverApplications && <Text style={styles.meta}>신청 내역 로딩 중..</Text>}
          {driverApplications.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.listTitle}>신청 #{item.id} ({item.status})</Text>
              <Text style={styles.listSub}>신청일: {formatDate(item.createdAt)}</Text>
              <Text style={styles.listSub}>처리일: {formatDate(item.processedAt)}</Text>
            </View>
          ))}
          {!isLoadingDriverApplications && driverApplications.length === 0 && (
            <Text style={styles.meta}>DRIVER 신청 내역이 없습니다.</Text>
          )}
        </View>
      )}

      {activeRole === 'OPS_ADMIN' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SYS_ADMIN 권한 신청</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={sysAdminReason}
            onChangeText={setSysAdminReason}
            multiline
            placeholder="SYS_ADMIN 신청 사유"
            placeholderTextColor="#94a3b8"
            editable={!isSubmittingSysAdminApplication}
          />
          {sysAdminApplicationResult && <Text style={styles.success}>{sysAdminApplicationResult}</Text>}
          {sysAdminApplicationError && <Text style={styles.error}>{sysAdminApplicationError}</Text>}
          <Pressable
            style={[styles.button, isSubmittingSysAdminApplication && styles.buttonDisabled]}
            onPress={handleSubmitSysAdminApplication}
            disabled={isSubmittingSysAdminApplication}
          >
            <Text style={styles.buttonText}>{isSubmittingSysAdminApplication ? '신청 중..' : 'SYS_ADMIN 권한 신청'}</Text>
          </Pressable>
        </View>
      )}

      {activeRole === 'SYS_ADMIN' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>권한 승인 메뉴</Text>
          <Text style={styles.meta}>OPS_ADMIN/SYS_ADMIN 권한 신청 승인 화면으로 이동합니다.</Text>
          <Pressable style={styles.button} onPress={onOpenSysAdminApproval}>
            <Text style={styles.buttonText}>권한 승인/부여 화면 열기</Text>
          </Pressable>
        </View>
      )}

      {activeRole === 'DRIVER' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>권한 메뉴 안내</Text>
          <Text style={styles.meta}>현재 역할에서는 권한 신청 메뉴가 제공되지 않습니다.</Text>
          <Text style={styles.meta}>OPS_ADMIN 권한 신청 메뉴는 노출되지 않습니다.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: ui.colors.screen,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  meta: {
    fontSize: 13,
    color: ui.colors.text,
  },
  card: {
    backgroundColor: ui.colors.card,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c2d7d2',
    borderRadius: ui.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.textStrong,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.control,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#9fc2b9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostButtonText: {
    color: ui.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  success: {
    color: ui.colors.success,
    fontSize: 13,
  },
  error: {
    color: ui.colors.error,
    fontSize: 13,
  },
  listItem: {
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  listTitle: {
    color: ui.colors.textStrong,
    fontWeight: '700',
  },
  listSub: {
    color: ui.colors.text,
    fontSize: 12,
  },
});
