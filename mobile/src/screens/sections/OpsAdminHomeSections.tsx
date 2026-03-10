import { Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { SectionHeader } from '../../components/SectionHeader';

type ScreenStyles = Record<string, any>;

type OpsAdminHomeOverviewSectionProps = {
  styles: ScreenStyles;
  loginId: string;
  rolesLabel: string;
  applicationsCount: number;
  requestedCount: number;
  failedPaymentsCount: number;
};

export function OpsAdminHomeOverviewSection({
  styles,
  loginId,
  rolesLabel,
  applicationsCount,
  requestedCount,
  failedPaymentsCount,
}: OpsAdminHomeOverviewSectionProps) {
  return (
    <>
      <Card style={styles.headerCard}>
        <SectionHeader
          badge="OPS_ADMIN"
          title="운영 관리"
          description="기사 신청 승인, 수거 요청 조회, 결제 실패 재시도를 관리합니다."
          titleStyle={styles.title}
          descriptionStyle={styles.description}
        />
        <Text style={styles.caption}>로그인 아이디: {loginId}</Text>
        <Text style={styles.caption}>역할: {rolesLabel}</Text>
      </Card>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>기사 신청 대기</Text>
          <Text style={styles.summaryValue}>{applicationsCount}건</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>REQUESTED 요청</Text>
          <Text style={styles.summaryValue}>{requestedCount}건</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>결제 실패</Text>
          <Text style={styles.summaryValueError}>{failedPaymentsCount}건</Text>
        </View>
      </View>
    </>
  );
}
