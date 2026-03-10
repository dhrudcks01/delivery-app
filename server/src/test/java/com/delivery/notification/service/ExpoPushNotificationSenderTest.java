package com.delivery.notification.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.notification.config.ExpoPushProperties;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
import com.delivery.notification.repository.UserPushTokenRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class ExpoPushNotificationSenderTest {

    @Mock
    private UserPushTokenRepository userPushTokenRepository;

    private MockRestServiceServer mockServer;
    private ExpoPushNotificationSender sender;
    private UserPushTokenEntity token;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        ExpoPushProperties properties = new ExpoPushProperties();
        properties.setBaseUrl("https://exp.host");
        properties.setSendPath("/--/api/v2/push/send");
        properties.setAccessToken("expo-access-token");
        properties.setMaxRetryAttempts(1);

        sender = new ExpoPushNotificationSender(
                restTemplate,
                properties,
                userPushTokenRepository,
                new ObjectMapper()
        );

        UserEntity user = new UserEntity(
                "push-user@example.com",
                "encoded-password",
                "Push User",
                "ACTIVE"
        );
        token = new UserPushTokenEntity(
                user,
                PushTokenDeviceType.ANDROID,
                PushTokenProvider.EXPO,
                "ExponentPushToken[test-token]"
        );
    }

    @Test
    void sendSuccessWhenExpoReturnsOkStatus() {
        mockServer.expect(once(), requestTo("https://exp.host/--/api/v2/push/send"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer expo-access-token"))
                .andRespond(withSuccess(
                        """
                        {"data":{"status":"ok","id":"ticket-1"}}
                        """,
                        MediaType.APPLICATION_JSON
                ));

        sender.send(
                token,
                NotificationType.WASTE_REQUEST_CREATED,
                "수거 신청 접수",
                "주문이 접수되었습니다.",
                "{\"wasteRequestId\":101}"
        );

        mockServer.verify();
        verify(userPushTokenRepository, never()).save(token);
        assertThat(token.isActive()).isTrue();
    }

    @Test
    void deactivateTokenWhenExpoReturnsDeviceNotRegistered() {
        mockServer.expect(once(), requestTo("https://exp.host/--/api/v2/push/send"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        """
                        {
                          "data": {
                            "status": "error",
                            "message": "Device not registered",
                            "details": {"error": "DeviceNotRegistered"}
                          }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        assertThatThrownBy(() -> sender.send(
                token,
                NotificationType.WASTE_REQUEST_CREATED,
                "수거 신청 접수",
                "주문이 접수되었습니다.",
                "{\"wasteRequestId\":101}"
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Device not registered");

        mockServer.verify();
        verify(userPushTokenRepository, times(1)).save(token);
        assertThat(token.isActive()).isFalse();
    }

    @Test
    void retryOnceWhenExpoReturnsServerError() {
        mockServer.expect(once(), requestTo("https://exp.host/--/api/v2/push/send"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError());
        mockServer.expect(once(), requestTo("https://exp.host/--/api/v2/push/send"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        """
                        {"data":{"status":"ok","id":"ticket-retry-success"}}
                        """,
                        MediaType.APPLICATION_JSON
                ));

        sender.send(
                token,
                NotificationType.WASTE_REQUEST_CREATED,
                "수거 신청 접수",
                "주문이 접수되었습니다.",
                "{\"wasteRequestId\":101}"
        );

        mockServer.verify();
        verify(userPushTokenRepository, never()).save(token);
        assertThat(token.isActive()).isTrue();
    }
}
