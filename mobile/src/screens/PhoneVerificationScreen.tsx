import { useCallback, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth } from '../auth/AuthContext';
import { PhoneVerificationStartResponse } from '../types/auth';
import { ui } from '../theme/ui';

const PORTONE_BROWSER_SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';
const PORTONE_REDIRECT_URL = 'https://delivery-mobile.local/phone-verification/callback';

type VerificationSession = PhoneVerificationStartResponse & {
  redirectUrl: string;
};

type ApiErrorResponse = {
  code?: string;
  message?: string;
  requestId?: string;
};

type VerificationWebMessage = {
  type: 'PORTONE_RESULT' | 'PORTONE_ERROR';
  message?: string;
  payload?: unknown;
};

type ParsedVerificationError = {
  code?: string;
  message?: string;
  requestId?: string;
  status?: number;
};

function debugPhoneVerificationLog(stage: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }
  if (details) {
    console.info(`[PhoneVerification] ${stage}`, details);
    return;
  }
  console.info(`[PhoneVerification] ${stage}`);
}

function maskToken(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function parseVerificationError(error: unknown): ParsedVerificationError {
  if (!(error instanceof AxiosError)) {
    return {};
  }

  const data = (error.response?.data as ApiErrorResponse | undefined) ?? undefined;
  const requestIdHeader = error.response?.headers?.['x-request-id'];
  const requestId = typeof requestIdHeader === 'string'
    ? requestIdHeader
    : data?.requestId;

  return {
    code: data?.code,
    message: data?.message,
    requestId,
    status: error.response?.status,
  };
}

function withRequestIdMessage(message: string, requestId?: string): string {
  if (!requestId) {
    return message;
  }
  return `${message} (요청 ID: ${requestId})`;
}

function buildPhoneVerificationHtml(session: VerificationSession): string {
  const payloadJson = JSON.stringify({
    storeId: session.storeId,
    channelKey: session.channelKey,
    identityVerificationId: session.identityVerificationId,
    redirectUrl: session.redirectUrl,
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .box {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 16px;
        background: #ffffff;
      }
      .title {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 700;
      }
      .desc {
        margin: 0;
        font-size: 13px;
        color: #334155;
        line-height: 1.5;
      }
    </style>
    <script src="${PORTONE_BROWSER_SDK_URL}"></script>
  </head>
  <body>
    <div class="box">
      <p class="title">휴대폰 본인인증을 진행하고 있어요.</p>
      <p class="desc">인증 창이 열리지 않으면 이전 화면으로 돌아가 다시 시도해 주세요.</p>
    </div>

    <script>
      (async function runIdentityVerification() {
        try {
          const payload = ${payloadJson};

          if (!window.PortOne || typeof window.PortOne.requestIdentityVerification !== 'function') {
            throw new Error('PORTONE_BROWSER_SDK_NOT_READY');
          }

          const result = await window.PortOne.requestIdentityVerification({
            storeId: payload.storeId,
            identityVerificationId: payload.identityVerificationId,
            channelKey: payload.channelKey,
            redirectUrl: payload.redirectUrl
          });

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PORTONE_RESULT',
            payload: result || null
          }));
        } catch (error) {
          const message = error && error.message ? error.message : 'PORTONE_REQUEST_FAILED';
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PORTONE_ERROR',
            message
          }));
        }
      })();
    </script>
  </body>
</html>`;
}

function resolvePhoneVerificationErrorMessage(error: unknown): string {
  const parsed = parseVerificationError(error);

  if (!(error instanceof AxiosError)) {
    return withRequestIdMessage('휴대폰 인증 확인에 실패했습니다. 다시 시도해 주세요.', parsed.requestId);
  }

  const code = parsed.code;
  if (code === 'PHONE_VERIFICATION_NOT_COMPLETED') {
    return withRequestIdMessage(
      '본인인증이 아직 완료되지 않았습니다. 인증 완료 후 다시 시도해 주세요.',
      parsed.requestId,
    );
  }
  if (code === 'PHONE_VERIFICATION_CANCELED') {
    return withRequestIdMessage('본인인증이 취소되었습니다. 다시 시도해 주세요.', parsed.requestId);
  }
  if (code === 'PHONE_VERIFICATION_FAILED') {
    return withRequestIdMessage('본인인증에 실패했습니다. 다시 시도해 주세요.', parsed.requestId);
  }
  if (code === 'PHONE_VERIFICATION_TIMEOUT') {
    return withRequestIdMessage('본인인증 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.', parsed.requestId);
  }
  if (code === 'PHONE_VERIFICATION_UNAVAILABLE') {
    return withRequestIdMessage(
      '본인인증 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
      parsed.requestId,
    );
  }

  return withRequestIdMessage('휴대폰 인증 확인에 실패했습니다. 다시 시도해 주세요.', parsed.requestId);
}

export function PhoneVerificationScreen() {
  const { startPhoneVerification, completePhoneVerification, signOut } = useAuth();
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const completeRequestedRef = useRef(false);

  const webViewHtml = useMemo(() => {
    if (!session) {
      return '';
    }
    return buildPhoneVerificationHtml(session);
  }, [session]);

  const handleStartVerification = useCallback(async () => {
    debugPhoneVerificationLog('start-requested');
    setIsStarting(true);
    setErrorMessage(null);
    completeRequestedRef.current = false;

    try {
      const response = await startPhoneVerification();
      debugPhoneVerificationLog('start-success', {
        provider: response.provider,
        storeId: maskToken(response.storeId),
        channelKey: maskToken(response.channelKey),
        identityVerificationId: maskToken(response.identityVerificationId),
        redirectUrl: PORTONE_REDIRECT_URL,
      });
      setSession({
        ...response,
        redirectUrl: PORTONE_REDIRECT_URL,
      });
    } catch (error) {
      const parsed = parseVerificationError(error);
      debugPhoneVerificationLog('start-failed', {
        code: parsed.code,
        requestId: parsed.requestId,
        status: parsed.status,
      });
      setErrorMessage(withRequestIdMessage('본인인증을 시작하지 못했습니다. 다시 시도해 주세요.', parsed.requestId));
    } finally {
      setIsStarting(false);
    }
  }, [startPhoneVerification]);

  const handleCompleteVerification = useCallback(async () => {
    if (!session || isCompleting || completeRequestedRef.current) {
      return;
    }

    completeRequestedRef.current = true;
    setIsCompleting(true);
    setErrorMessage(null);
    debugPhoneVerificationLog('complete-requested', {
      identityVerificationId: maskToken(session.identityVerificationId),
    });

    try {
      await completePhoneVerification(session.identityVerificationId);
      debugPhoneVerificationLog('complete-success', {
        identityVerificationId: maskToken(session.identityVerificationId),
      });
    } catch (error) {
      completeRequestedRef.current = false;
      setIsCompleting(false);
      const parsed = parseVerificationError(error);
      debugPhoneVerificationLog('complete-failed', {
        code: parsed.code,
        requestId: parsed.requestId,
        status: parsed.status,
      });
      setErrorMessage(resolvePhoneVerificationErrorMessage(error));
    }
  }, [session, isCompleting, completePhoneVerification]);

  const handleWebViewMessage = useCallback(
    (rawData: string) => {
      debugPhoneVerificationLog('webview-message-raw', {
        rawData,
      });
      let message: VerificationWebMessage | null = null;
      try {
        message = JSON.parse(rawData) as VerificationWebMessage;
      } catch {
        debugPhoneVerificationLog('webview-message-parse-failed', { rawData });
        setErrorMessage('본인인증 응답을 확인하지 못했습니다. 다시 시도해 주세요.');
        return;
      }

      debugPhoneVerificationLog('webview-message-parsed', {
        type: message.type,
        message: message.message ?? null,
      });

      if (message.type === 'PORTONE_ERROR') {
        debugPhoneVerificationLog('webview-portone-error', {
          reason: message.message ?? 'UNKNOWN',
        });
        setErrorMessage('본인인증이 취소되었거나 실패했습니다. 다시 시도해 주세요.');
        return;
      }

      void handleCompleteVerification();
    },
    [handleCompleteVerification],
  );

  const handleNavigationStateChange = useCallback(
    (url: string) => {
      const isRedirectMatched = Boolean(session) && url.startsWith(PORTONE_REDIRECT_URL);
      debugPhoneVerificationLog('webview-navigation', {
        url,
        expectedRedirectUrl: PORTONE_REDIRECT_URL,
        matched: isRedirectMatched,
      });
      if (!isRedirectMatched) {
        return;
      }
      void handleCompleteVerification();
    },
    [session, handleCompleteVerification],
  );

  const handleRetry = useCallback(() => {
    debugPhoneVerificationLog('retry-clicked');
    setSession(null);
    setIsCompleting(false);
    setErrorMessage(null);
    completeRequestedRef.current = false;
  }, []);

  const handleWebViewError = useCallback((event: { nativeEvent: { description?: string; url?: string } }) => {
    debugPhoneVerificationLog('webview-error', {
      description: event.nativeEvent.description ?? null,
      url: event.nativeEvent.url ?? null,
    });
    setErrorMessage('본인인증 페이지를 불러오지 못했습니다. 다시 시도해 주세요.');
  }, []);

  const handleWebViewHttpError = useCallback((event: { nativeEvent: { statusCode?: number; description?: string; url?: string } }) => {
    debugPhoneVerificationLog('webview-http-error', {
      statusCode: event.nativeEvent.statusCode ?? null,
      description: event.nativeEvent.description ?? null,
      url: event.nativeEvent.url ?? null,
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>휴대폰 본인인증이 필요해요</Text>
        <Text style={styles.description}>
          본인인증이 완료되기 전까지 앱 기능을 사용할 수 없습니다.
        </Text>

        {!session && (
          <Pressable
            style={[styles.primaryButton, isStarting && styles.buttonDisabled]}
            onPress={() => {
              void handleStartVerification();
            }}
            disabled={isStarting}
          >
            <Text style={styles.primaryButtonText}>{isStarting ? '인증 준비 중...' : '휴대폰 인증 시작'}</Text>
          </Pressable>
        )}

        {session && (
          <View style={styles.webViewCard}>
            <View style={styles.webViewHeader}>
              <Text style={styles.webViewTitle}>포트원(다날) 본인인증</Text>
              {(isStarting || isCompleting) && <ActivityIndicator size="small" color={ui.colors.primary} />}
            </View>

            <WebView
              source={{ html: webViewHtml }}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              onMessage={(event) => handleWebViewMessage(event.nativeEvent.data)}
              onNavigationStateChange={(event) => handleNavigationStateChange(event.url)}
              onError={handleWebViewError}
              onHttpError={handleWebViewHttpError}
              style={styles.webView}
            />

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.secondaryButton, isCompleting && styles.buttonDisabled]}
                onPress={() => {
                  void handleCompleteVerification();
                }}
                disabled={isCompleting}
              >
                <Text style={styles.secondaryButtonText}>인증 완료 확인</Text>
              </Pressable>

              <Pressable style={styles.retryTextButton} onPress={handleRetry}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          </View>
        )}

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <Pressable
          style={styles.logoutButton}
          onPress={() => {
            void signOut();
          }}
        >
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ui.colors.screen,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: ui.colors.screen,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: ui.colors.text,
  },
  webViewCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: ui.radius.card,
    backgroundColor: ui.colors.card,
    overflow: 'hidden',
  },
  webViewHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: ui.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webViewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ui.colors.textStrong,
  },
  webView: {
    flex: 1,
    minHeight: 360,
    backgroundColor: '#ffffff',
  },
  actionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  primaryButton: {
    borderRadius: ui.radius.control,
    backgroundColor: ui.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: ui.radius.control,
    borderWidth: 1,
    borderColor: ui.colors.primary,
    backgroundColor: '#eef8f6',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: ui.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  retryTextButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  retryText: {
    color: ui.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  errorText: {
    color: ui.colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: ui.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
