import { httpClient } from './httpClient';
import {
  CreateServiceAreaRequest,
  RegisterServiceAreaByCodeRequest,
  ServiceAreaAvailabilityResponse,
  ServiceArea,
  ServiceAreaMasterDongPage,
  ServiceAreaMasterDongSearchParams,
  ServiceAreaPage,
  ServiceAreaSearchParams,
} from '../types/serviceArea';

export async function getUserServiceAreas(
  params: ServiceAreaSearchParams = {},
): Promise<ServiceAreaPage> {
  const normalizedQuery = params.query?.trim();
  const response = await httpClient.get<ServiceAreaPage>('/user/service-areas', {
    params: {
      query: normalizedQuery ? normalizedQuery : undefined,
      page: params.page ?? 0,
      size: params.size ?? 50,
    },
  });
  return response.data;
}

export async function getOpsServiceAreas(
  params: ServiceAreaSearchParams = {},
): Promise<ServiceAreaPage> {
  const normalizedQuery = params.query?.trim();
  const response = await httpClient.get<ServiceAreaPage>('/ops-admin/service-areas', {
    params: {
      query: normalizedQuery ? normalizedQuery : undefined,
      active: params.active,
      page: params.page ?? 0,
      size: params.size ?? 50,
    },
  });
  return response.data;
}

export async function createOpsServiceArea(payload: CreateServiceAreaRequest): Promise<ServiceArea> {
  const response = await httpClient.post<ServiceArea>('/ops-admin/service-areas', payload);
  return response.data;
}

export async function createOpsServiceAreaByCode(
  payload: RegisterServiceAreaByCodeRequest,
): Promise<ServiceArea> {
  const response = await httpClient.post<ServiceArea>('/ops-admin/service-areas/by-code', payload);
  return response.data;
}

export async function getOpsServiceAreaMasterDongs(
  params: ServiceAreaMasterDongSearchParams = {},
): Promise<ServiceAreaMasterDongPage> {
  const normalizedQuery = params.query?.trim();
  const normalizedCity = params.city?.trim();
  const normalizedDistrict = params.district?.trim();
  const response = await httpClient.get<ServiceAreaMasterDongPage>('/ops-admin/service-areas/master-dongs', {
    params: {
      query: normalizedQuery ? normalizedQuery : undefined,
      city: normalizedCity ? normalizedCity : undefined,
      district: normalizedDistrict ? normalizedDistrict : undefined,
      active: params.active,
      page: params.page ?? 0,
      size: params.size ?? 200,
    },
  });
  return response.data;
}

export async function deactivateOpsServiceArea(serviceAreaId: number): Promise<ServiceArea> {
  const response = await httpClient.patch<ServiceArea>(
    `/ops-admin/service-areas/${serviceAreaId}/deactivate`,
  );
  return response.data;
}

export async function getUserServiceAreaAvailability(
  address: string,
): Promise<ServiceAreaAvailabilityResponse> {
  const response = await httpClient.get<ServiceAreaAvailabilityResponse>('/user/service-areas/availability', {
    params: { address },
  });
  return response.data;
}

export async function reactivateOpsServiceArea(serviceAreaId: number): Promise<ServiceArea> {
  const response = await httpClient.patch<ServiceArea>(
    `/ops-admin/service-areas/${serviceAreaId}/reactivate`,
  );
  return response.data;
}

export async function deleteOpsServiceArea(serviceAreaId: number): Promise<void> {
  await httpClient.delete(`/ops-admin/service-areas/${serviceAreaId}`);
}
