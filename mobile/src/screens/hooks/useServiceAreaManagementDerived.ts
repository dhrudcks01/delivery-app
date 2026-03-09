import { useMemo } from 'react';
import type { ServiceAreaMasterDong } from '../../types/serviceArea';

type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

type UseServiceAreaManagementDerivedInput = {
  activeFilter: ActiveFilter;
  selectedDongMap: Map<string, ServiceAreaMasterDong>;
};

export function useServiceAreaManagementDerived({
  activeFilter,
  selectedDongMap,
}: UseServiceAreaManagementDerivedInput) {
  const activeParam = useMemo(() => {
    if (activeFilter === 'ALL') {
      return undefined;
    }
    return activeFilter === 'ACTIVE';
  }, [activeFilter]);

  const selectedDongList = useMemo(
    () => Array.from(selectedDongMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
    [selectedDongMap],
  );

  return {
    activeParam,
    selectedDongList,
  };
}
