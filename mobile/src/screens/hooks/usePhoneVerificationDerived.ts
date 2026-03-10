type UsePhoneVerificationDerivedInput = {
  session: unknown | null;
  isStarting: boolean;
  isCompleting: boolean;
};

export function usePhoneVerificationDerived({
  session,
  isStarting,
  isCompleting,
}: UsePhoneVerificationDerivedInput) {
  const hasSession = Boolean(session);
  const showStartSection = !hasSession;
  const showProgressSection = hasSession;
  const showStartPreparingBadge = isStarting;
  const progressStatusLabel = isCompleting ? '확인 중' : '진행 중';
  const progressStatusTone = isCompleting ? 'warning' : 'success';

  return {
    hasSession,
    showStartSection,
    showProgressSection,
    showStartPreparingBadge,
    progressStatusLabel,
    progressStatusTone,
  };
}
