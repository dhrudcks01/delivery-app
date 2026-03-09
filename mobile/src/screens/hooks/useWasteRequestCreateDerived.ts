import { useMemo } from 'react';

type DisposalCode = 'GENERAL' | 'BOX';

type UseWasteRequestCreateDerivedInput = {
  counts: Record<DisposalCode, number>;
  options: string[];
  disposalItemLabel: Record<DisposalCode, string>;
  addressResolvable: boolean;
  isServiceAreaAvailable: boolean | null;
  isCheckingServiceArea: boolean;
  serviceAreaError: string | null;
};

export function useWasteRequestCreateDerived({
  counts,
  options,
  disposalItemLabel,
  addressResolvable,
  isServiceAreaAvailable,
  isCheckingServiceArea,
  serviceAreaError,
}: UseWasteRequestCreateDerivedInput) {
  const selectedDisposalCodes = useMemo(
    () => (Object.entries(counts).filter(([, value]) => value > 0).map(([key]) => key) as DisposalCode[]),
    [counts],
  );

  const selectedDisposalItemSummaries = useMemo(
    () => selectedDisposalCodes.map((code) => `${disposalItemLabel[code]} ${counts[code]}개`),
    [selectedDisposalCodes, disposalItemLabel, counts],
  );

  const selectedSpecialOptionSummaries = useMemo(
    () => (options.length > 0 ? options : ['선택 없음']),
    [options],
  );

  const requiresServiceAreaCheck = addressResolvable;
  const canStartRequest = !requiresServiceAreaCheck
    || (isServiceAreaAvailable === true && !isCheckingServiceArea && !serviceAreaError);
  const isServiceAreaBlocked = isServiceAreaAvailable === false;

  return {
    selectedDisposalCodes,
    selectedDisposalItemSummaries,
    selectedSpecialOptionSummaries,
    requiresServiceAreaCheck,
    canStartRequest,
    isServiceAreaBlocked,
  };
}
