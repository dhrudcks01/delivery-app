import { useCallback, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
};

type VerificationWebMessage = {
  type: 'PORTONE_RESULT' | 'PORTONE_ERROR';
  message?: string;
};

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
      <p class="title">Phone verification in progress.</p>
      <p class="desc">If the verification window does not open, go back and retry.</p>
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
  if (!(error instanceof AxiosError)) {
    return 'Failed to verify phone. Please retry.';
  }

  const code = (error.response?.data as ApiErrorResponse | undefined)?.code;
  if (code === 'PHONE_VERIFICATION_NOT_COMPLETED') {
    return 'Verification is not completed yet. Please retry after finishing.';
  }
  if (code === 'PHONE_VERIFICATION_CANCELED') {
    return 'Verification was canceled. Please try again.';
  }
  if (code === 'PHONE_VERIFICATION_FAILED') {
    return 'Verification failed. Please try again.';
  }
  if (code === 'PHONE_VERIFICATION_TIMEOUT') {
    return 'Verification timeout. Please try again later.';
  }
  if (code === 'PHONE_VERIFICATION_UNAVAILABLE') {
    return 'Verification service is unavailable. Please try again later.';
  }

  return 'Failed to verify phone. Please retry.';
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
    setIsStarting(true);
    setErrorMessage(null);
    completeRequestedRef.current = false;

    try {
      const response = await startPhoneVerification();
      setSession({
        ...response,
        redirectUrl: PORTONE_REDIRECT_URL,
      });
    } catch {
      setErrorMessage('Failed to start verification. Please retry.');
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

    try {
      await completePhoneVerification(session.identityVerificationId);
    } catch (error) {
      completeRequestedRef.current = false;
      setIsCompleting(false);
      setErrorMessage(resolvePhoneVerificationErrorMessage(error));
    }
  }, [session, isCompleting, completePhoneVerification]);

  const handleWebViewMessage = useCallback(
    (rawData: string) => {
      let message: VerificationWebMessage | null = null;
      try {
        message = JSON.parse(rawData) as VerificationWebMessage;
      } catch {
        setErrorMessage('Cannot read verification response. Please retry.');
        return;
      }

      if (message.type === 'PORTONE_ERROR') {
        setErrorMessage('Verification was canceled or failed. Please try again.');
        return;
      }

      void handleCompleteVerification();
    },
    [handleCompleteVerification],
  );

  const handleNavigationStateChange = useCallback(
    (url: string) => {
      if (!session || !url.startsWith(PORTONE_REDIRECT_URL)) {
        return;
      }
      void handleCompleteVerification();
    },
    [session, handleCompleteVerification],
  );

  const handleRetry = useCallback(() => {
    setSession(null);
    setIsCompleting(false);
    setErrorMessage(null);
    completeRequestedRef.current = false;
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone verification required</Text>
      <Text style={styles.description}>
        App usage is blocked until phone verification is completed.
      </Text>

      {!session && (
        <Pressable
          style={[styles.primaryButton, isStarting && styles.buttonDisabled]}
          onPress={() => {
            void handleStartVerification();
          }}
          disabled={isStarting}
        >
          <Text style={styles.primaryButtonText}>{isStarting ? 'Preparing...' : 'Start verification'}</Text>
        </Pressable>
      )}

      {session && (
        <View style={styles.webViewCard}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>PortOne Danal verification</Text>
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
              <Text style={styles.secondaryButtonText}>Confirm completion</Text>
            </Pressable>

            <Pressable style={styles.retryTextButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Retry</Text>
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
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
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
