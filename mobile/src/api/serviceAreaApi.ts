import { httpClient } from './httpClient';
import { CreateServiceAreaRequest, ServiceArea, ServiceAreaPage, ServiceAreaSearchParams } from '../types/serviceArea';

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

export async function deactivateOpsServiceArea(serviceAreaId: number): Promise<ServiceArea> {
  const response = await httpClient.patch<ServiceArea>(
    `/ops-admin/service-areas/${serviceAreaId}/deactivate`,
  );
  return response.data;
}
