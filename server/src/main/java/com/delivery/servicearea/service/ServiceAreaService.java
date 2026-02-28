package com.delivery.servicearea.service;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ServiceAreaService {

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
            "가"
    );

    private final ServiceAreaRepository serviceAreaRepository;
    private final ServiceAreaMasterDongRepository serviceAreaMasterDongRepository;

    public ServiceAreaService(
            ServiceAreaRepository serviceAreaRepository,
            ServiceAreaMasterDongRepository serviceAreaMasterDongRepository
    ) {
        this.serviceAreaRepository = serviceAreaRepository;
        this.serviceAreaMasterDongRepository = serviceAreaMasterDongRepository;
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
        AddressRegion region = extractAddressRegion(address)
                .orElseThrow(ServiceAreaUnavailableException::new);

        boolean available = serviceAreaRepository.existsActiveByRegion(
                region.city(),
                region.district(),
                region.dong()
        );
        if (!available) {
            throw new ServiceAreaUnavailableException();
        }
    }

    private String normalizeKeyword(String query) {
        if (query == null || query.isBlank()) {
            return "";
        }
        return query.trim();
    }

    private Optional<AddressRegion> extractAddressRegion(String address) {
        if (address == null || address.isBlank()) {
            return Optional.empty();
        }

        List<String> tokens = tokenize(address);
        String city = null;
        String district = null;
        String dong = null;

        for (String token : tokens) {
            if (city == null && hasAnySuffix(token, CITY_SUFFIXES)) {
                city = token;
                continue;
            }
            if (district == null && hasAnySuffix(token, DISTRICT_SUFFIXES)) {
                district = token;
                continue;
            }
            if (dong == null && hasAnySuffix(token, DONG_SUFFIXES)) {
                dong = token;
            }
        }

        // English-style fallback: "Seoul Mapo-gu Seogyo-dong ..."
        if (city == null && district != null && dong != null && tokens.size() >= 3) {
            city = tokens.get(0);
        }

        if (city == null || district == null || dong == null) {
            return Optional.empty();
        }
        return Optional.of(new AddressRegion(city, district, dong));
    }

    private List<String> tokenize(String address) {
        String[] split = address.trim().split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String raw : split) {
            String normalized = raw
                    .replace(",", "")
                    .replace("(", "")
                    .replace(")", "")
                    .trim();
            if (!normalized.isEmpty()) {
                tokens.add(normalized);
            }
        }
        return tokens;
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
