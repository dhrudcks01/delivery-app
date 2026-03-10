package com.delivery.notification.service;

import com.delivery.notification.config.ExpoPushProperties;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.repository.UserPushTokenRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ExpoPushNotificationSender implements PushNotificationSender {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushNotificationSender.class);

    private final RestTemplate restTemplate;
    private final ExpoPushProperties expoPushProperties;
    private final UserPushTokenRepository userPushTokenRepository;
    private final ObjectMapper objectMapper;

    public ExpoPushNotificationSender(
            @Qualifier("expoPushRestTemplate") RestTemplate restTemplate,
            ExpoPushProperties expoPushProperties,
            UserPushTokenRepository userPushTokenRepository,
            ObjectMapper objectMapper
    ) {
        this.restTemplate = restTemplate;
        this.expoPushProperties = expoPushProperties;
        this.userPushTokenRepository = userPushTokenRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void send(
            UserPushTokenEntity token,
            NotificationType type,
            String title,
            String message,
            String payloadJson
    ) {
        URI requestUri = buildRequestUri();
        HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(
                buildRequestBody(token, title, message, payloadJson),
                buildHeaders()
        );

        int totalAttempts = expoPushProperties.getMaxRetryAttempts() + 1;
        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= totalAttempts; attempt++) {
            try {
                ResponseEntity<JsonNode> response = restTemplate.exchange(
                        requestUri,
                        HttpMethod.POST,
                        httpEntity,
                        JsonNode.class
                );
                SendResult result = parseSendResult(response.getStatusCode().value(), response.getBody());

                if (result.tokenShouldDeactivate()) {
                    deactivateToken(token, result.errorCode());
                }

                if (result.success()) {
                    log.info(
                            "push.notification result=SUCCESS provider={} userId={} tokenId={} type={} ticketId={} attempt={}/{}",
                            token.getProvider(),
                            token.getUser().getId(),
                            token.getId(),
                            type,
                            result.ticketId(),
                            attempt,
                            totalAttempts
                    );
                    return;
                }

                log.warn(
                        "push.notification result=FAILURE provider={} userId={} tokenId={} type={} statusCode={} errorCode={} ticketId={} retryable={} attempt={}/{}",
                        token.getProvider(),
                        token.getUser().getId(),
                        token.getId(),
                        type,
                        result.statusCode(),
                        result.errorCode(),
                        result.ticketId(),
                        result.retryable(),
                        attempt,
                        totalAttempts
                );

                if (result.retryable() && attempt < totalAttempts) {
                    continue;
                }
                throw new IllegalStateException(result.failureReason());
            } catch (ResourceAccessException ex) {
                boolean retryable = isTimeoutException(ex);
                log.warn(
                        "push.notification transport-error provider={} userId={} tokenId={} type={} retryable={} attempt={}/{} message={}",
                        token.getProvider(),
                        token.getUser().getId(),
                        token.getId(),
                        type,
                        retryable,
                        attempt,
                        totalAttempts,
                        ex.getMessage()
                );
                if (retryable && attempt < totalAttempts) {
                    continue;
                }
                lastException = new IllegalStateException("Expo 푸시 발송에 실패했습니다.", ex);
            } catch (HttpStatusCodeException ex) {
                SendResult result = parseSendResult(
                        ex.getStatusCode().value(),
                        tryReadBody(ex.getResponseBodyAsString())
                );
                if (result.tokenShouldDeactivate()) {
                    deactivateToken(token, result.errorCode());
                }
                log.warn(
                        "push.notification http-error provider={} userId={} tokenId={} type={} statusCode={} errorCode={} retryable={} attempt={}/{}",
                        token.getProvider(),
                        token.getUser().getId(),
                        token.getId(),
                        type,
                        result.statusCode(),
                        result.errorCode(),
                        result.retryable(),
                        attempt,
                        totalAttempts
                );
                if (result.retryable() && attempt < totalAttempts) {
                    continue;
                }
                lastException = new IllegalStateException(result.failureReason(), ex);
            } catch (RestClientException ex) {
                log.warn(
                        "push.notification client-error provider={} userId={} tokenId={} type={} attempt={}/{} message={}",
                        token.getProvider(),
                        token.getUser().getId(),
                        token.getId(),
                        type,
                        attempt,
                        totalAttempts,
                        ex.getMessage()
                );
                lastException = new IllegalStateException("Expo 푸시 발송에 실패했습니다.", ex);
            }
        }

        if (lastException == null) {
            throw new IllegalStateException("Expo 푸시 발송에 실패했습니다.");
        }
        throw lastException;
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        if (StringUtils.hasText(expoPushProperties.getAccessToken())) {
            headers.setBearerAuth(expoPushProperties.getAccessToken());
        }
        return headers;
    }

    private Map<String, Object> buildRequestBody(
            UserPushTokenEntity token,
            String title,
            String message,
            String payloadJson
    ) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("to", token.getPushToken());
        request.put("title", title);
        request.put("body", message);
        request.put("sound", "default");
        request.put("data", parsePayloadData(payloadJson));
        return request;
    }

    private Object parsePayloadData(String payloadJson) {
        if (!StringUtils.hasText(payloadJson)) {
            return Map.of();
        }
        try {
            JsonNode jsonNode = objectMapper.readTree(payloadJson);
            if (jsonNode == null || jsonNode.isNull()) {
                return Map.of();
            }
            return objectMapper.convertValue(jsonNode, Object.class);
        } catch (Exception ex) {
            log.warn("push.notification payload-parse-error message={}", ex.getMessage());
            return Map.of();
        }
    }

    private URI buildRequestUri() {
        String sendPath = expoPushProperties.getSendPath();
        String normalizedPath = sendPath.startsWith("/") ? sendPath : "/" + sendPath;
        return UriComponentsBuilder
                .fromHttpUrl(expoPushProperties.getBaseUrl())
                .path(normalizedPath)
                .build()
                .encode()
                .toUri();
    }

    private JsonNode tryReadBody(String body) {
        if (!StringUtils.hasText(body)) {
            return null;
        }
        try {
            return objectMapper.readTree(body);
        } catch (Exception ex) {
            return null;
        }
    }

    private SendResult parseSendResult(int statusCode, JsonNode body) {
        JsonNode dataNode = extractDataNode(body);
        String status = dataNode.path("status").asText("");
        String ticketId = blankToNull(dataNode.path("id").asText(""));
        String errorCode = blankToNull(dataNode.path("details").path("error").asText(""));
        String message = blankToNull(dataNode.path("message").asText(""));

        if ("ok".equalsIgnoreCase(status)) {
            return new SendResult(true, false, false, ticketId, null, statusCode, null);
        }

        boolean retryable = statusCode == 429 || statusCode >= 500 || "MessageRateExceeded".equalsIgnoreCase(errorCode);
        boolean tokenShouldDeactivate = "DeviceNotRegistered".equalsIgnoreCase(errorCode);
        String failureReason = message;
        if (!StringUtils.hasText(failureReason)) {
            failureReason = StringUtils.hasText(errorCode)
                    ? "Expo 푸시 발송 실패 (%s)".formatted(errorCode)
                    : "Expo 푸시 발송 실패";
        }

        return new SendResult(
                false,
                retryable,
                tokenShouldDeactivate,
                ticketId,
                errorCode,
                statusCode,
                failureReason
        );
    }

    private JsonNode extractDataNode(JsonNode root) {
        if (root == null || root.isNull()) {
            return objectMapper.createObjectNode();
        }
        JsonNode data = root.path("data");
        if (data.isArray() && !data.isEmpty()) {
            return data.get(0);
        }
        if (data.isObject()) {
            return data;
        }
        return root;
    }

    private String blankToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private boolean isTimeoutException(ResourceAccessException exception) {
        Throwable cause = exception;
        while (cause != null) {
            if (cause instanceof SocketTimeoutException) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private void deactivateToken(UserPushTokenEntity token, String errorCode) {
        if (!token.isActive()) {
            return;
        }
        token.deactivate();
        userPushTokenRepository.save(token);
        log.info(
                "push.notification token-deactivated provider={} userId={} tokenId={} reason={}",
                token.getProvider(),
                token.getUser().getId(),
                token.getId(),
                errorCode
        );
    }

    private record SendResult(
            boolean success,
            boolean retryable,
            boolean tokenShouldDeactivate,
            String ticketId,
            String errorCode,
            int statusCode,
            String failureReason
    ) {
    }
}
