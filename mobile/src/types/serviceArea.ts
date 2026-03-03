import { PageResponse } from './opsAdmin';

export type ServiceArea = {
  id: number;
  city: string;
  district: string;
  dong: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAreaSearchParams = {
  query?: string;
  active?: boolean;
  page?: number;
  size?: number;
};

export type CreateServiceAreaRequest = {
  city: string;
  district: string;
  dong: string;
};

export type ServiceAreaPage = PageResponse<ServiceArea>;

export type ServiceAreaAvailabilityResponse = {
  available: boolean;
  reasonCode: string | null;
  message: string | null;
  city: string | null;
  district: string | null;
  dong: string | null;
};

export type ServiceAreaMasterDong = {
  code: string;
  city: string;
  district: string;
  dong: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAreaMasterDongSearchParams = {
  query?: string;
  city?: string;
  district?: string;
  active?: boolean;
  page?: number;
  size?: number;
};

export type RegisterServiceAreaByCodeRequest = {
  code: string;
};

export type ServiceAreaMasterDongPage = PageResponse<ServiceAreaMasterDong>;
