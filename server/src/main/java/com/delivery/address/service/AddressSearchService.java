package com.delivery.address.service;

import com.delivery.address.config.AddressSearchProperties;
import com.delivery.address.dto.AddressSearchResponse;
import com.delivery.address.exception.AddressSearchTimeoutException;
import com.delivery.address.exception.AddressSearchUnavailableException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Service
public class AddressSearchService {

    private static final int FIRST_PAGE = 1;

    private final RestTemplate restTemplate;
    private final AddressSearchProperties addressSearchProperties;

    public AddressSearchService(
            @Qualifier("addressSearchRestTemplate") RestTemplate restTemplate,
            AddressSearchProperties addressSearchProperties
    ) {
        this.restTemplate = restTemplate;
        this.addressSearchProperties = addressSearchProperties;
    }

    public AddressSearchResponse search(String query, Integer limit) {
        int normalizedLimit = normalizeLimit(limit);
        URI uri = createSearchUri(query, normalizedLimit);

        try {
            JsonNode root = restTemplate.getForObject(uri, JsonNode.class);
            validateJusoError(root);
            List<AddressSearchResponse.AddressItem> results = parseAddressItems(root, normalizedLimit);
            return new AddressSearchResponse(query, normalizedLimit, results);
        } catch (ResourceAccessException exception) {
            if (isTimeoutException(exception)) {
                throw new AddressSearchTimeoutException("주소 검색 API 요청이 시간 초과되었습니다.", exception);
            }
            throw new AddressSearchUnavailableException("주소 검색 API에 연결할 수 없습니다.", exception);
        } catch (RestClientException exception) {
            throw new AddressSearchUnavailableException("주소 검색 API 호출에 실패했습니다.", exception);
        }
    }

    private int normalizeLimit(Integer limit) {
        int requested = limit == null ? addressSearchProperties.getDefaultLimit() : limit;
        if (requested < 1) {
            requested = 1;
        }
        return Math.min(requested, addressSearchProperties.getMaxLimit());
    }

    private URI createSearchUri(String query, int limit) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(addressSearchProperties.getBaseUrl())
                .queryParam("keyword", query)
                .queryParam("currentPage", FIRST_PAGE)
                .queryParam("countPerPage", limit)
                .queryParam("resultType", "json");

        if (StringUtils.hasText(addressSearchProperties.getApiKey())) {
            builder.queryParam("confmKey", addressSearchProperties.getApiKey());
        }

        return builder.build().encode().toUri();
    }

    private List<AddressSearchResponse.AddressItem> parseAddressItems(JsonNode root, int limit) {
        List<AddressSearchResponse.AddressItem> items = new ArrayList<>();
        if (root == null) {
            return items;
        }

        JsonNode source = resolveResultArray(root);
        if (!source.isArray()) {
            return items;
        }

        for (JsonNode item : source) {
            if (items.size() >= limit) {
                break;
            }
            items.add(new AddressSearchResponse.AddressItem(
                    firstText(item, "roadAddr", "roadAddress", "road_address", "address"),
                    firstText(item, "jibunAddr", "jibunAddress", "jibun_address"),
                    firstText(item, "zipNo", "zipCode", "postalCode", "postcode", "zoneNo")
            ));
        }
        return items;
    }

    private JsonNode resolveResultArray(JsonNode root) {
        JsonNode jusoArray = root.path("results").path("juso");
        if (jusoArray.isArray()) {
            return jusoArray;
        }
        if (root.path("results").isArray()) {
            return root.path("results");
        }
        if (root.path("addresses").isArray()) {
            return root.path("addresses");
        }
        if (root.path("items").isArray()) {
            return root.path("items");
        }
        if (root.path("documents").isArray()) {
            return root.path("documents");
        }
        return root.path("results");
    }

    private void validateJusoError(JsonNode root) {
        if (root == null) {
            return;
        }

        JsonNode common = root.path("results").path("common");
        if (!common.isObject()) {
            return;
        }

        String errorCode = common.path("errorCode").asText("");
        if (!StringUtils.hasText(errorCode) || "0".equals(errorCode)) {
            return;
        }

        String errorMessage = common.path("errorMessage").asText("주소 검색 API 호출에 실패했습니다.");
        throw new AddressSearchUnavailableException(
                "주소 검색 API 호출에 실패했습니다. (code=%s, message=%s)".formatted(errorCode, errorMessage)
        );
    }

    private String firstText(JsonNode node, String... keys) {
        for (String key : keys) {
            String value = node.path(key).asText(null);
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
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
}
