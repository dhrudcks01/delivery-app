import { httpClient } from './httpClient';
import { ServiceAreaPage, ServiceAreaSearchParams } from '../types/serviceArea';

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
