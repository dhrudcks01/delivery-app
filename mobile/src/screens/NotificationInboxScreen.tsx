import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getUserNotificationUnreadCount, getUserNotifications, markUserNotificationRead } from '../api/userNotificationApi';
import { Card } from '../components/Card';
import { KeyboardAwareScrollScreen } from '../components/KeyboardAwareScrollScreen';
import { ScreenState } from '../components/ScreenState';
import { SectionHeader } from '../components/SectionHeader';
import { SecondaryButton } from '../components/SecondaryButton';
import { ui } from '../theme/ui';
import { UserNotification } from '../types/notification';
import { toApiErrorMessage } from '../utils/errorMessage';

const ERROR_MESSAGE_OPTIONS = {
  defaultMessage: '알림 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  statusMessages: {
    401: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
    403: '알림함에 접근할 권한이 없습니다.',
  },
};

function formatDateTime(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return '-';
  }
  return timestamp.toLocaleString();
}

function toNotificationTypeLabel(type: UserNotification['type']): string {
  if (type === 'WASTE_REQUEST_CREATED') {
    return '신청 접수';
  }
  if (type === 'WASTE_REQUEST_MEASURED') {
    return '수거 완료';
  }
  if (type === 'PAYMENT_COMPLETED') {
    return '결제 완료';
  }
  if (type === 'COUPON_EXPIRING') {
    return '쿠폰 알림';
  }
  return '운영 공지';
}

export function NotificationInboxScreen() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [markingNotificationId, setMarkingNotificationId] = useState<number | null>(null);

  const loadNotifications = useCallback(async (isManualRefresh: boolean) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadingError(null);

    try {
      const [nextNotifications, nextUnreadCount] = await Promise.all([
        getUserNotifications(),
        getUserNotificationUnreadCount(),
      ]);
      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } catch (error) {
      setLoadingError(toApiErrorMessage(error, ERROR_MESSAGE_OPTIONS));
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadNotifications(false);
  }, [loadNotifications]);

  const handleMarkRead = useCallback(async (notification: UserNotification) => {
    if (notification.isRead) {
      return;
    }

    setMarkingNotificationId(notification.id);
    setLoadingError(null);

    try {
      await markUserNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      setLoadingError(
        toApiErrorMessage(error, {
          ...ERROR_MESSAGE_OPTIONS,
          defaultMessage: '읽음 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        }),
      );
    } finally {
      setMarkingNotificationId(null);
    }
  }, []);

  const isEmpty = useMemo(() => notifications.length === 0, [notifications]);
  const isRequestFailed = loadingError && isEmpty && !isLoading;

  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.screen} includeTopInset>
      <View style={styles.container}>
        <SectionHeader
          badge="알림함"
          title="내 알림"
          description="신청, 수거, 결제, 운영 공지 알림을 확인할 수 있어요."
          action={(
            <SecondaryButton
              label={isRefreshing ? '새로고침 중' : '새로고침'}
              onPress={() => void loadNotifications(true)}
              disabled={isRefreshing || isLoading}
              minHeight={44}
              accessibilityLabel="알림 목록 새로고침"
              accessibilityHint="서버에서 최신 알림 목록을 다시 불러옵니다."
              style={styles.refreshButton}
            />
          )}
        />

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>미읽음 알림</Text>
          <Text style={styles.summaryValue}>{unreadCount}건</Text>
        </Card>

        {isLoading && (
          <ScreenState
            variant="loading"
            title="알림 목록을 불러오는 중입니다."
            description="잠시만 기다려 주세요."
          />
        )}

        {isRequestFailed && (
          <ScreenState
            variant="error"
            title="알림 목록을 불러오지 못했습니다."
            description={loadingError ?? undefined}
            actionLabel="다시 시도"
            onAction={() => {
              void loadNotifications(false);
            }}
          />
        )}

        {!isLoading && !isRequestFailed && isEmpty && (
          <ScreenState
            variant="empty"
            title="받은 알림이 아직 없습니다."
            description="수거 신청/처리 상태가 변경되면 이곳에 알림이 표시됩니다."
            actionLabel="새로고침"
            onAction={() => {
              void loadNotifications(true);
            }}
          />
        )}

        {!isLoading && !isEmpty && (
          <View style={styles.listContainer}>
            {loadingError && (
              <Card style={styles.inlineErrorCard} padding={12}>
                <Text style={styles.inlineErrorText}>{loadingError}</Text>
              </Card>
            )}

            {notifications.map((notification) => {
              const isMarking = markingNotificationId === notification.id;
              const isRead = notification.isRead;
              return (
                <Card key={notification.id}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{notification.title}</Text>
                    <View style={[styles.readBadge, isRead && styles.readBadgeMuted]}>
                      <Text style={[styles.readBadgeText, isRead && styles.readBadgeTextMuted]}>
                        {isRead ? '읽음' : '미읽음'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardMessage}>{notification.message}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{toNotificationTypeLabel(notification.type)}</Text>
                    <Text style={styles.metaLabel}>{formatDateTime(notification.createdAt)}</Text>
                  </View>
                  {!isRead && (
                    <SecondaryButton
                      label={isMarking ? '처리 중' : '읽음 처리'}
                      onPress={() => {
                        void handleMarkRead(notification);
                      }}
                      disabled={isMarking}
                      minHeight={44}
                      accessibilityLabel={`알림 읽음 처리: ${notification.title}`}
                      accessibilityHint="선택한 알림을 읽음 상태로 변경합니다."
                    />
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </KeyboardAwareScrollScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: ui.colors.screen,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  container: {
    gap: 16,
  },
  refreshButton: {
    minWidth: 96,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.colors.caption,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  listContainer: {
    gap: 12,
  },
  inlineErrorCard: {
    borderColor: ui.colors.errorSoftBorder,
    backgroundColor: ui.colors.errorSoftBackground,
  },
  inlineErrorText: {
    fontSize: 13,
    lineHeight: 18,
    color: ui.colors.errorStrong,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  readBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.primarySoftBorder,
    backgroundColor: ui.colors.primarySoftBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  readBadgeMuted: {
    borderColor: ui.colors.neutralBorderSoft,
    backgroundColor: ui.colors.surfaceMuted,
  },
  readBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.primaryStrong,
  },
  readBadgeTextMuted: {
    color: ui.colors.textSecondary,
  },
  cardMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: ui.colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: ui.colors.caption,
  },
});
