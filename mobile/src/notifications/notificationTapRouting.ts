import * as Notifications from 'expo-notifications';
import { NotificationType } from '../types/notification';

export type NotificationTapRoute =
  | {
    name: 'WasteRequestDetail';
    params: {
      requestId: number;
      orderNo?: string;
    };
  }
  | {
    name: 'NotificationInbox';
    params: undefined;
  };

type NotificationPayload = Record<string, unknown>;

const REQUEST_RELATED_TYPES = new Set<NotificationType>([
  'WASTE_REQUEST_CREATED',
  'WASTE_REQUEST_MEASURED',
  'PAYMENT_COMPLETED',
]);

function toObject(value: unknown): NotificationPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as NotificationPayload;
}

function parseJsonObject(value: unknown): NotificationPayload | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return toObject(JSON.parse(value));
  } catch {
    return null;
  }
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function toNonBlankString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeType(value: unknown): NotificationType | null {
  if (typeof value !== 'string') {
    return null;
  }
  const candidate = value.trim().toUpperCase();
  if (
    candidate === 'WASTE_REQUEST_CREATED'
    || candidate === 'WASTE_REQUEST_MEASURED'
    || candidate === 'PAYMENT_COMPLETED'
    || candidate === 'COUPON_EXPIRING'
    || candidate === 'ADMIN_BROADCAST'
  ) {
    return candidate;
  }
  return null;
}

function resolveRouteFromData(data: NotificationPayload | null): NotificationTapRoute {
  if (!data) {
    return { name: 'NotificationInbox', params: undefined };
  }

  const payloadFromData = parseJsonObject(data.payloadJson) ?? parseJsonObject(data.payload);
  const mergedPayload = payloadFromData ? { ...data, ...payloadFromData } : data;

  const type = normalizeType(mergedPayload.type ?? mergedPayload.notificationType);
  const requestId = toPositiveInteger(mergedPayload.wasteRequestId ?? mergedPayload.requestId);
  const orderNo = toNonBlankString(mergedPayload.orderNo);

  if (type === 'ADMIN_BROADCAST') {
    return { name: 'NotificationInbox', params: undefined };
  }

  if (type && REQUEST_RELATED_TYPES.has(type) && requestId) {
    return {
      name: 'WasteRequestDetail',
      params: {
        requestId,
        orderNo,
      },
    };
  }

  if (requestId) {
    return {
      name: 'WasteRequestDetail',
      params: {
        requestId,
        orderNo,
      },
    };
  }

  return { name: 'NotificationInbox', params: undefined };
}

export function subscribeNotificationTapRouting(
  onRouteResolved: (route: NotificationTapRoute) => void,
): () => void {
  const handledResponseKeys = new Set<string>();

  const handleResponse = (response: Notifications.NotificationResponse | null) => {
    if (!response) {
      return;
    }

    const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (handledResponseKeys.has(key)) {
      return;
    }
    handledResponseKeys.add(key);
    if (handledResponseKeys.size > 100) {
      handledResponseKeys.clear();
      handledResponseKeys.add(key);
    }

    const rawData = toObject(response.notification.request.content.data);
    onRouteResolved(resolveRouteFromData(rawData));
  };

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleResponse(response);
  });

  void Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      handleResponse(response);
    })
    .catch(() => {
      // Ignore startup notification parsing failures.
    });

  return () => {
    subscription.remove();
  };
}
