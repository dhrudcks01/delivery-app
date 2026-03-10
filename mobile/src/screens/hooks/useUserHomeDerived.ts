import { useMemo } from 'react';
import type { UserAddress } from '../../types/userAddress';
import { buildWasteRequestAddress } from '../../utils/wasteRequestAddress';

type UserHomeSection = 'all' | 'history' | 'request-form';

type UserHomeDerivedInput = {
  section: UserHomeSection;
  me: {
    phoneNumber?: string | null;
    phoneVerifiedAt?: string | null;
  } | null | undefined;
  primaryAddress: UserAddress | null;
  isLoadingPrimaryAddress: boolean;
  primaryAddressError: string | null;
  isServiceAreaAvailable: boolean | null;
  isCheckingServiceArea: boolean;
  serviceAreaCheckError: string | null;
  primaryAddressMissingMessage: string;
};

const SECTION_HEADER_COPY: Record<UserHomeSection, { badge: string; title: string; description: string }> = {
  all: {
    badge: '수거 요청',
    title: '수거 요청 홈',
    description: '요청 현황과 이용 내역을 한곳에서 확인할 수 있어요.',
  },
  history: {
    badge: '이용내역',
    title: '이용내역',
    description: '내 수거 요청의 상태와 처리 이력을 확인할 수 있어요.',
  },
  'request-form': {
    badge: '수거 요청',
    title: '수거 요청',
    description: '대표 주소를 기준으로 수거 신청을 진행할 수 있어요.',
  },
};

export function useUserHomeDerived({
  section,
  me,
  primaryAddress,
  isLoadingPrimaryAddress,
  primaryAddressError,
  isServiceAreaAvailable,
  isCheckingServiceArea,
  serviceAreaCheckError,
  primaryAddressMissingMessage,
}: UserHomeDerivedInput) {
  const headerCopy = useMemo(() => SECTION_HEADER_COPY[section], [section]);

  const showRequestForm = section === 'all' || section === 'request-form';
  const showHistory = section === 'all' || section === 'history';
  const isPhoneVerified = Boolean(me?.phoneNumber && me?.phoneVerifiedAt);

  const primaryAddressBuildResult = useMemo(() => {
    if (!primaryAddress) {
      return null;
    }
    return buildWasteRequestAddress(primaryAddress);
  }, [primaryAddress]);

  const canUsePrimaryAddress = primaryAddressBuildResult?.ok ?? false;
  const primaryRequestAddress = primaryAddressBuildResult?.ok ? primaryAddressBuildResult.address : null;
  const isPrimaryAddressMissing = !isLoadingPrimaryAddress && !primaryAddress && !primaryAddressError;
  const shouldShowAddressManagementCta = isPrimaryAddressMissing;
  const primaryAddressIssueMessage = isPrimaryAddressMissing
    ? primaryAddressMissingMessage
    : (primaryAddressError
      ?? (primaryAddress && primaryAddressBuildResult && !primaryAddressBuildResult.ok
        ? primaryAddressBuildResult.message
        : null));

  const isServiceAreaBlocked = isServiceAreaAvailable === false;
  const canSubmitRequest =
    canUsePrimaryAddress
    && isPhoneVerified
    && isServiceAreaAvailable === true
    && !isCheckingServiceArea
    && !serviceAreaCheckError;

  return {
    headerCopy,
    showRequestForm,
    showHistory,
    isPhoneVerified,
    primaryAddressBuildResult,
    canUsePrimaryAddress,
    primaryRequestAddress,
    isPrimaryAddressMissing,
    shouldShowAddressManagementCta,
    primaryAddressIssueMessage,
    isServiceAreaBlocked,
    canSubmitRequest,
  };
}
