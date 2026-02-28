package com.delivery.servicearea.service;

import com.delivery.address.dto.AddressSearchResponse;
import com.delivery.address.exception.AddressSearchTimeoutException;
import com.delivery.address.exception.AddressSearchUnavailableException;
import com.delivery.address.service.AddressSearchService;
import com.delivery.servicearea.dto.CreateServiceAreaRequest;
import com.delivery.servicearea.dto.RegisterServiceAreaByCodeRequest;
import com.delivery.servicearea.dto.ServiceAreaMasterDongResponse;
import com.delivery.servicearea.dto.ServiceAreaResponse;
import com.delivery.servicearea.entity.ServiceAreaMasterDongEntity;
import com.delivery.servicearea.entity.ServiceAreaEntity;
import com.delivery.servicearea.exception.ServiceAreaMasterDongNotFoundException;
import com.delivery.servicearea.exception.ServiceAreaNotFoundException;
import com.delivery.servicearea.exception.ServiceAreaUnavailableException;
import com.delivery.servicearea.repository.ServiceAreaMasterDongRepository;
import com.delivery.servicearea.repository.ServiceAreaRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ServiceAreaService {

    private static final Logger log = LoggerFactory.getLogger(ServiceAreaService.class);
    private static final int ADDRESS_SEARCH_FALLBACK_LIMIT = 5;

    private static final List<String> CITY_SUFFIXES = List.of(
            "특별자치도",
            "특별자치시",
            "특별시",
            "광역시",
            "-si",
            "-do",
            "시",
            "도"
    );
    private static final List<String> DISTRICT_SUFFIXES = List.of(
            "자치구",
            "-gu",
            "-gun",
            "구",
            "군",
            "시"
    );
    private static final List<String> DONG_SUFFIXES = List.of(
            "-dong",
            "-eup",
            "-myeon",
            "동",
            "읍",
            "면",
            "가",
            "리"
    );
    private static final List<String> DISTRICT_SECOND_LEVEL_SUFFIXES = List.of(
            "자치구",
            "-gu",
            "-gun",
            "구",
            "군"
    );

    private final ServiceAreaRepository serviceAreaRepository;
    private final ServiceAreaMasterDongRepository serviceAreaMasterDongRepository;
    private final AddressSearchService addressSearchService;

    public ServiceAreaService(
            ServiceAreaRepository serviceAreaRepository,
            ServiceAreaMasterDongRepository serviceAreaMasterDongRepository,
            AddressSearchService addressSearchService
    ) {
        this.serviceAreaRepository = serviceAreaRepository;
        this.serviceAreaMasterDongRepository = serviceAreaMasterDongRepository;
        this.addressSearchService = addressSearchService;
    }

    @Transactional
    public ServiceAreaResponse register(CreateServiceAreaRequest request) {
        String city = request.normalizedCity();
        String district = request.normalizedDistrict();
        String dong = request.normalizedDong();
        return toResponse(upsertAndActivateServiceArea(city, district, dong));
    }

    @Transactional
    public ServiceAreaResponse registerByMasterCode(RegisterServiceAreaByCodeRequest request) {
        ServiceAreaMasterDongEntity masterDong = serviceAreaMasterDongRepository.findById(request.normalizedCode())
                .filter(ServiceAreaMasterDongEntity::isActive)
                .orElseThrow(ServiceAreaMasterDongNotFoundException::new);

        return toResponse(upsertAndActivateServiceArea(
                masterDong.getCity(),
                masterDong.getDistrict(),
                masterDong.getDong()
        ));
    }

    @Transactional
    public ServiceAreaResponse deactivate(Long serviceAreaId) {
        ServiceAreaEntity entity = serviceAreaRepository.findById(serviceAreaId)
                .orElseThrow(ServiceAreaNotFoundException::new);
        entity.deactivate();
        return toResponse(entity);
    }

    @Transactional
    public Page<ServiceAreaResponse> getForOps(String query, Boolean active, Pageable pageable) {
        String keyword = normalizeKeyword(query);
        return serviceAreaRepository.searchForOps(keyword, active, pageable).map(this::toResponse);
    }

    @Transactional
    public Page<ServiceAreaMasterDongResponse> getMasterDongsForOps(String query, Boolean active, Pageable pageable) {
        String keyword = normalizeKeyword(query);
        return serviceAreaMasterDongRepository.searchForOps(keyword, active, pageable).map(this::toMasterResponse);
    }

    @Transactional
    public Page<ServiceAreaResponse> getForUser(String query, Pageable pageable) {
        String keyword = normalizeKeyword(query);
        return serviceAreaRepository.searchForUser(keyword, pageable).map(this::toResponse);
    }

    @Transactional
    public void validateAvailableAddress(String address) {
        AddressRegion region = resolveAddressRegion(address)
                .orElseThrow(() -> {
                    log.warn("Service area matching failed: reason=ADDRESS_UNRESOLVED address={}", address);
                    return ServiceAreaUnavailableException.unresolvedAddress();
                });

        boolean available = serviceAreaRepository.existsActiveByRegion(
                region.city(),
                region.district(),
                region.dong()
        );
        if (!available) {
            log.warn(
                    "Service area matching failed: reason=NOT_WHITELISTED city={} district={} dong={} address={}",
                    region.city(),
                    region.district(),
                    region.dong(),
                    address
            );
            throw ServiceAreaUnavailableException.notWhitelisted(region.city(), region.district(), region.dong());
        }
    }

    private String normalizeKeyword(String query) {
        if (query == null || query.isBlank()) {
            return "";
        }
        return query.trim();
    }

    private Optional<AddressRegion> resolveAddressRegion(String address) {
        Optional<AddressRegion> parsedRegion = extractAddressRegionFromText(address);
        if (parsedRegion.isPresent()) {
            return parsedRegion;
        }
        return resolveAddressRegionFromAddressSearch(address);
    }

    private Optional<AddressRegion> resolveAddressRegionFromAddressSearch(String address) {
        if (!StringUtils.hasText(address)) {
            return Optional.empty();
        }

        try {
            AddressSearchResponse response = addressSearchService.search(address, ADDRESS_SEARCH_FALLBACK_LIMIT);
            if (response == null || response.results() == null) {
                return Optional.empty();
            }

            for (AddressSearchResponse.AddressItem item : response.results()) {
                Optional<AddressRegion> structured = normalizeRegion(item.city(), item.district(), item.dong());
                if (structured.isPresent()) {
                    return structured;
                }

                Optional<AddressRegion> roadAddressRegion = extractAddressRegionFromText(item.roadAddress());
                if (roadAddressRegion.isPresent()) {
                    return roadAddressRegion;
                }

                Optional<AddressRegion> jibunAddressRegion = extractAddressRegionFromText(item.jibunAddress());
                if (jibunAddressRegion.isPresent()) {
                    return jibunAddressRegion;
                }
            }
            return Optional.empty();
        } catch (AddressSearchTimeoutException | AddressSearchUnavailableException exception) {
            log.warn("Service area matching fallback unavailable: address={}", address, exception);
            throw ServiceAreaUnavailableException.matchingUnavailable();
        }
    }

    private Optional<AddressRegion> extractAddressRegionFromText(String address) {
        if (address == null || address.isBlank()) {
            return Optional.empty();
        }

        List<String> tokens = tokenize(address);
        if (tokens.isEmpty()) {
            return Optional.empty();
        }

        Integer cityIndex = findCityIndex(tokens);
        String city = cityIndex == null ? null : tokens.get(cityIndex);

        Integer districtIndex = findDistrictIndex(tokens, cityIndex);
        String district = districtIndex == null ? null : resolveDistrict(tokens, districtIndex);

        Integer dongIndex = findDongIndex(tokens, districtIndex);
        String dong = dongIndex == null ? null : tokens.get(dongIndex);

        // English-style fallback: "Seoul Mapo-gu Seogyo-dong ..."
        if (city == null && district != null && dong != null && tokens.size() >= 3) {
            city = tokens.get(0);
        }

        return normalizeRegion(city, district, dong);
    }

    private List<String> tokenize(String address) {
        String[] split = address.trim().split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String raw : split) {
            String normalized = raw
                    .replace(",", "")
                    .replace("(", "")
                    .replace(")", "")
                    .replace("[", "")
                    .replace("]", "")
                    .trim();
            if (!normalized.isEmpty()) {
                tokens.add(normalized);
            }
        }
        return tokens;
    }

    private Integer findCityIndex(List<String> tokens) {
        for (int i = 0; i < tokens.size(); i++) {
            if (hasAnySuffix(tokens.get(i), CITY_SUFFIXES)) {
                return i;
            }
        }
        return null;
    }

    private Integer findDistrictIndex(List<String> tokens, Integer cityIndex) {
        int start = cityIndex == null ? 0 : cityIndex + 1;
        for (int i = start; i < tokens.size(); i++) {
            if (hasAnySuffix(tokens.get(i), DISTRICT_SUFFIXES)) {
                return i;
            }
        }
        return null;
    }

    private Integer findDongIndex(List<String> tokens, Integer districtIndex) {
        int start = districtIndex == null ? 0 : districtIndex + 1;
        for (int i = start; i < tokens.size(); i++) {
            if (hasAnySuffix(tokens.get(i), DONG_SUFFIXES)) {
                return i;
            }
        }
        return null;
    }

    private String resolveDistrict(List<String> tokens, int districtIndex) {
        String district = tokens.get(districtIndex);
        if (districtIndex + 1 >= tokens.size()) {
            return district;
        }

        String next = tokens.get(districtIndex + 1);
        if (district.toLowerCase().endsWith("시") && hasAnySuffix(next, DISTRICT_SECOND_LEVEL_SUFFIXES)) {
            return district + " " + next;
        }
        return district;
    }

    private Optional<AddressRegion> normalizeRegion(String city, String district, String dong) {
        if (!StringUtils.hasText(city) || !StringUtils.hasText(district) || !StringUtils.hasText(dong)) {
            return Optional.empty();
        }
        return Optional.of(new AddressRegion(city.trim(), district.trim(), dong.trim()));
    }

    private boolean hasAnySuffix(String token, List<String> suffixes) {
        String lower = token.toLowerCase();
        for (String suffix : suffixes) {
            if (lower.endsWith(suffix.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    private ServiceAreaEntity upsertAndActivateServiceArea(String city, String district, String dong) {
        ServiceAreaEntity entity = serviceAreaRepository.findByCityAndDistrictAndDong(city, district, dong)
                .map(existing -> {
                    existing.activate();
                    return existing;
                })
                .orElseGet(() -> new ServiceAreaEntity(city, district, dong, true));
        return serviceAreaRepository.save(entity);
    }

    private ServiceAreaResponse toResponse(ServiceAreaEntity entity) {
        return new ServiceAreaResponse(
                entity.getId(),
                entity.getCity(),
                entity.getDistrict(),
                entity.getDong(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ServiceAreaMasterDongResponse toMasterResponse(ServiceAreaMasterDongEntity entity) {
        return new ServiceAreaMasterDongResponse(
                entity.getCode(),
                entity.getCity(),
                entity.getDistrict(),
                entity.getDong(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private record AddressRegion(String city, String district, String dong) {
    }
}
