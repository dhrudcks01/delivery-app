package com.delivery.auth.service;

import com.delivery.auth.config.PhoneVerificationProperties;
import com.delivery.auth.exception.PhoneVerificationException;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.time.Instant;

@Component
public class PortOneIdentityVerificationClient {

    private static final Logger log = LoggerFactory.getLogger(PortOneIdentityVerificationClient.class);

    private final RestTemplate restTemplate;
    private final PhoneVerificationProperties phoneVerificationProperties;

    public PortOneIdentityVerificationClient(
            @Qualifier("phoneVerificationRestTemplate") RestTemplate restTemplate,
            PhoneVerificationProperties phoneVerificationProperties
    ) {
        this.restTemplate = restTemplate;
        this.phoneVerificationProperties = phoneVerificationProperties;
    }

    public PortOneIdentityVerificationResult getIdentityVerification(String identityVerificationId) {
        if (!StringUtils.hasText(phoneVerificationProperties.getApiSecret())) {
            log.error(
                    "phoneVerification.provider config missing apiSecret provider={} baseUrl={} storeIdPresent={}",
                    phoneVerificationProperties.getProvider(),
                    phoneVerificationProperties.getBaseUrl(),
                    StringUtils.hasText(phoneVerificationProperties.getStoreId())
            );
            throw new PhoneVerificationException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "PHONE_VERIFICATION_CONFIGURATION_ERROR",
                    "휴대폰 본인인증 설정이 누락되었습니다."
            );
        }

        URI uri = UriComponentsBuilder
                .fromHttpUrl(phoneVerificationProperties.getBaseUrl())
                .pathSegment("identity-verifications", identityVerificationId)
                .queryParam("storeId", phoneVerificationProperties.getStoreId())
                .build()
                .encode()
                .toUri();
        log.info(
                "phoneVerification.provider request identityVerificationId={} uri={} storeIdPresent={}",
                identityVerificationId,
                uri,
                StringUtils.hasText(phoneVerificationProperties.getStoreId())
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "PortOne " + phoneVerificationProperties.getApiSecret());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    JsonNode.class
            );
            PortOneIdentityVerificationResult parsed = parse(response.getBody());
            log.info(
                    "phoneVerification.provider response identityVerificationId={} status={} failureCode={}",
                    identityVerificationId,
                    parsed.status(),
                    parsed.failureCode()
            );
            return parsed;
        } catch (ResourceAccessException exception) {
            log.warn(
                    "phoneVerification.provider resource-access identityVerificationId={} timeout={} message={}",
                    identityVerificationId,
                    isTimeoutException(exception),
                    exception.getMessage()
            );
            if (isTimeoutException(exception)) {
                throw new PhoneVerificationException(
                        HttpStatus.GATEWAY_TIMEOUT,
                        "PHONE_VERIFICATION_TIMEOUT",
                        "본인인증 결과 조회가 시간 초과되었습니다."
                );
            }
            throw new PhoneVerificationException(
                    HttpStatus.BAD_GATEWAY,
                    "PHONE_VERIFICATION_UNAVAILABLE",
                    "본인인증 제공자와 통신할 수 없습니다."
            );
        } catch (HttpStatusCodeException exception) {
            log.warn(
                    "phoneVerification.provider http-error identityVerificationId={} status={} body={}",
                    identityVerificationId,
                    exception.getStatusCode(),
                    truncate(exception.getResponseBodyAsString())
            );
            if (exception.getStatusCode().is4xxClientError()) {
                throw new PhoneVerificationException(
                        HttpStatus.BAD_REQUEST,
                        "PHONE_VERIFICATION_PROVIDER_REQUEST_ERROR",
                        "본인인증 결과 조회 요청이 거절되었습니다."
                );
            }
            throw new PhoneVerificationException(
                    HttpStatus.BAD_GATEWAY,
                    "PHONE_VERIFICATION_UNAVAILABLE",
                    "본인인증 결과 조회에 실패했습니다."
            );
        } catch (RestClientException exception) {
            log.error(
                    "phoneVerification.provider rest-client-error identityVerificationId={} message={}",
                    identityVerificationId,
                    exception.getMessage(),
                    exception
            );
            throw new PhoneVerificationException(
                    HttpStatus.BAD_GATEWAY,
                    "PHONE_VERIFICATION_UNAVAILABLE",
                    "본인인증 결과 조회에 실패했습니다."
            );
        }
    }

    private PortOneIdentityVerificationResult parse(JsonNode root) {
        if (root == null) {
            throw new PhoneVerificationException(
                    HttpStatus.BAD_GATEWAY,
                    "PHONE_VERIFICATION_UNAVAILABLE",
                    "본인인증 결과 응답이 비어 있습니다."
            );
        }

        String status = root.path("status").asText("").trim().toUpperCase();
        String phoneNumber = root.path("verifiedCustomer").path("phoneNumber").asText(null);
        String ci = root.path("verifiedCustomer").path("ci").asText(null);
        String di = root.path("verifiedCustomer").path("di").asText(null);

        String failureCode = root.path("failure").path("reason").asText(null);
        String failureMessage = root.path("failure").path("pgMessage").asText(null);
        if (!StringUtils.hasText(failureMessage)) {
            failureMessage = root.path("failure").path("reason").asText(null);
        }

        Instant verifiedAt = null;
        String verifiedAtText = root.path("verifiedAt").asText("");
        if (StringUtils.hasText(verifiedAtText)) {
            verifiedAt = Instant.parse(verifiedAtText);
        }

        return new PortOneIdentityVerificationResult(
                status,
                phoneNumber,
                ci,
                di,
                failureCode,
                failureMessage,
                verifiedAt
        );
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

    private String truncate(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String normalized = raw.replace('\n', ' ').replace('\r', ' ').trim();
        if (normalized.length() <= 300) {
            return normalized;
        }
        return normalized.substring(0, 300) + "...";
    }

    public record PortOneIdentityVerificationResult(
            String status,
            String phoneNumber,
            String ci,
            String di,
            String failureCode,
            String failureMessage,
            Instant verifiedAt
    ) {
    }
}
