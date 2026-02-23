package com.delivery.address.service;

import com.delivery.address.config.AddressSearchProperties;
import com.delivery.address.dto.AddressSearchResponse;
import com.delivery.address.exception.AddressSearchTimeoutException;
import com.delivery.address.exception.AddressSearchUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.SocketTimeoutException;
import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AddressSearchServiceTest {

    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;
    private AddressSearchService addressSearchService;
    private AddressSearchProperties properties;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        properties = new AddressSearchProperties();
        properties.setBaseUrl("https://business.juso.go.kr/addrlink/addrLinkApi.do");
        properties.setApiKey("test-api-key=");
        properties.setDefaultLimit(10);
        properties.setMaxLimit(2);

        addressSearchService = new AddressSearchService(restTemplate, properties);
    }

    @Test
    void searchReturnsMappedAddressesAndAppliesMaxLimit() {
        URI expectedUri = UriComponentsBuilder
                .fromHttpUrl(properties.getBaseUrl())
                .queryParam("keyword", "강남역")
                .queryParam("currentPage", 1)
                .queryParam("countPerPage", 2)
                .queryParam("resultType", "json")
                .queryParam("confmKey", "test-api-key=")
                .build()
                .encode()
                .toUri();

        mockServer.expect(once(), requestTo(expectedUri))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                          "results": {
                            "common": {
                              "errorCode":"0",
                              "errorMessage":"정상"
                            },
                            "juso": [
                              {"roadAddr":"서울 강남구 테헤란로 1", "jibunAddr":"역삼동 123", "zipNo":"06234"},
                              {"roadAddr":"서울 강남구 테헤란로 2", "jibunAddr":"역삼동 124", "zipNo":"06235"},
                              {"roadAddr":"서울 강남구 테헤란로 3", "jibunAddr":"역삼동 125", "zipNo":"06236"}
                            ]
                          }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        AddressSearchResponse response = addressSearchService.search("강남역", 20);

        assertThat(response.query()).isEqualTo("강남역");
        assertThat(response.limit()).isEqualTo(2);
        assertThat(response.results()).hasSize(2);
        assertThat(response.results().get(0).roadAddress()).isEqualTo("서울 강남구 테헤란로 1");
        assertThat(response.results().get(1).zipCode()).isEqualTo("06235");
        mockServer.verify();
    }

    @Test
    void searchThrowsTimeoutExceptionWhenExternalApiTimesOut() {
        mockServer.expect(once(), requestTo(org.hamcrest.Matchers.containsString("keyword=%EA%B0%95%EB%82%A8")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(request -> {
                    throw new ResourceAccessException("Read timed out", new SocketTimeoutException("Read timed out"));
                });

        assertThatThrownBy(() -> addressSearchService.search("강남", 1))
                .isInstanceOf(AddressSearchTimeoutException.class)
                .hasMessage("주소 검색 API 요청이 시간 초과되었습니다.");
        mockServer.verify();
    }

    @Test
    void searchThrowsUnavailableExceptionWhenExternalApiReturnsError() {
        mockServer.expect(once(), requestTo(org.hamcrest.Matchers.containsString("keyword=%EA%B0%95%EB%82%A8")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withServerError());

        assertThatThrownBy(() -> addressSearchService.search("강남", 1))
                .isInstanceOf(AddressSearchUnavailableException.class)
                .hasMessage("주소 검색 API 호출에 실패했습니다.");
        mockServer.verify();
    }

    @Test
    void searchThrowsUnavailableExceptionWhenJusoReturnsErrorCode() {
        mockServer.expect(once(), requestTo(org.hamcrest.Matchers.containsString("keyword=%EA%B0%95%EB%82%A8")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                          "results": {
                            "common": {
                              "errorCode":"E0005",
                              "errorMessage":"승인되지 않은 KEY입니다."
                            },
                            "juso": []
                          }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        assertThatThrownBy(() -> addressSearchService.search("강남", 1))
                .isInstanceOf(AddressSearchUnavailableException.class)
                .hasMessageContaining("code=E0005");
        mockServer.verify();
    }
}
