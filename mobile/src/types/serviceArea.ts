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
