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
  page?: number;
  size?: number;
};

export type ServiceAreaPage = PageResponse<ServiceArea>;
