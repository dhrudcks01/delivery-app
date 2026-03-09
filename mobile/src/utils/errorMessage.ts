import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/waste';

type ErrorMessageOptions = {
  defaultMessage?: string;
  timeoutMessage?: string;
  networkMessage?: string;
  statusMessages?: Partial<Record<number, string>>;
};

const DEFAULT_MESSAGE = '요청 처리 중 오류가 발생했습니다.';
const DEFAULT_TIMEOUT_MESSAGE = '요청 시간이 초과되었습니다. 다시 시도해 주세요.';
const DEFAULT_NETWORK_MESSAGE = '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';

export function toApiErrorMessage(error: unknown, options?: ErrorMessageOptions): string {
  const defaultMessage = options?.defaultMessage ?? DEFAULT_MESSAGE;
  const timeoutMessage = options?.timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE;
  const networkMessage = options?.networkMessage ?? DEFAULT_NETWORK_MESSAGE;

  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return timeoutMessage;
    }
    if (!error.response) {
      return networkMessage;
    }

    const statusMessage = options?.statusMessages?.[error.response.status];
    if (statusMessage) {
      return statusMessage;
    }

    const apiError = error.response.data as ApiErrorResponse | undefined;
    return apiError?.message ?? defaultMessage;
  }

  return defaultMessage;
}
