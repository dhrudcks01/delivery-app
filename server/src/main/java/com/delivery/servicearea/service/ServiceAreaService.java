package com.delivery.servicearea.service;

import com.delivery.servicearea.dto.CreateServiceAreaRequest;
import com.delivery.servicearea.dto.ServiceAreaResponse;
import com.delivery.servicearea.entity.ServiceAreaEntity;
import com.delivery.servicearea.exception.ServiceAreaNotFoundException;
import com.delivery.servicearea.repository.ServiceAreaRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ServiceAreaService {

    private final ServiceAreaRepository serviceAreaRepository;

    public ServiceAreaService(ServiceAreaRepository serviceAreaRepository) {
        this.serviceAreaRepository = serviceAreaRepository;
    }

    @Transactional
    public ServiceAreaResponse register(CreateServiceAreaRequest request) {
        String city = request.normalizedCity();
        String district = request.normalizedDistrict();
        String dong = request.normalizedDong();

        ServiceAreaEntity entity = serviceAreaRepository.findByCityAndDistrictAndDong(city, district, dong)
                .map(existing -> {
                    existing.activate();
                    return existing;
                })
                .orElseGet(() -> new ServiceAreaEntity(city, district, dong, true));

        return toResponse(serviceAreaRepository.save(entity));
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
    public Page<ServiceAreaResponse> getForUser(String query, Pageable pageable) {
        String keyword = normalizeKeyword(query);
        return serviceAreaRepository.searchForUser(keyword, pageable).map(this::toResponse);
    }

    private String normalizeKeyword(String query) {
        if (query == null || query.isBlank()) {
            return "";
        }
        return query.trim();
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
}

