package com.delivery.servicearea.service;

import com.delivery.address.dto.AddressSearchResponse;
import com.delivery.address.exception.AddressSearchTimeoutException;
import com.delivery.address.exception.AddressSearchUnavailableException;
import com.delivery.address.service.AddressSearchService;
import com.delivery.servicearea.dto.CreateServiceAreaRequest;
import com.delivery.servicearea.dto.RegisterServiceAreaByCodeRequest;
import com.delivery.servicearea.dto.ServiceAreaMasterDongImportResponse;
import com.delivery.servicearea.dto.ServiceAreaMasterDongResponse;
import com.delivery.servicearea.dto.ServiceAreaMasterDongSummaryResponse;
import com.delivery.servicearea.dto.ServiceAreaResponse;
import com.delivery.servicearea.entity.ServiceAreaMasterDongEntity;
import com.delivery.servicearea.entity.ServiceAreaEntity;
import com.delivery.servicearea.exception.InvalidServiceAreaMasterDongFileException;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ServiceAreaService {

    private static final Logger log = LoggerFactory.getLogger(ServiceAreaService.class);
    private static final int ADDRESS_SEARCH_FALLBACK_LIMIT = 5;
    private static final long MASTER_DONG_MIN_TOTAL_THRESHOLD = 3000L;
    private static final long MASTER_DONG_MIN_CITY_THRESHOLD = 17L;
    private static final String DEPRECATED_STATUS_KEYWORD = "\uD3D0\uC9C0";
    private static final Charset EUC_KR_CHARSET = Charset.forName("EUC-KR");
    private static final List<String> MASTER_DONG_SUFFIXES = List.of(
            "\uB3D9",
            "\uC74D",
            "\uBA74",
            "\uAC00",
            "\uB9AC",
            "-dong",
            "-eup",
            "-myeon"
    );

    private static final List<String> CITY_SUFFIXES = List.of(
            "\uD2B9\uBCC4\uC790\uCE58\uC2DC",
            "\uD2B9\uBCC4\uC790\uCE58\uB3C4",
            "\uD2B9\uBCC4\uC2DC",
            "\uAD11\uC5ED\uC2DC",
            "-si",
            "-do",
            "\uC2DC",
            "\uB3C4"
    );
    private static final List<String> DISTRICT_SUFFIXES = List.of(
            "\uC790\uCE58\uAD6C",
            "-gu",
            "-gun",
            "\uAD6C",
            "\uAD70",
            "\uC2DC"
    );
    private static final List<String> DONG_SUFFIXES = List.of(
            "-dong",
            "-eup",
            "-myeon",
            "\uB3D9",
            "\uC74D",
            "\uBA74",
            "\uAC00",
            "\uB9AC"
    );
    private static final List<String> DISTRICT_SECOND_LEVEL_SUFFIXES = List.of(
            "\uC790\uCE58\uAD6C",
            "-gu",
            "-gun",
            "\uAD6C",
            "\uAD70"
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
    public ServiceAreaMasterDongSummaryResponse getMasterDongsSummaryForOps() {
        long totalCount = serviceAreaMasterDongRepository.count();
        long activeCount = serviceAreaMasterDongRepository.countByActiveTrue();
        long cityCount = serviceAreaMasterDongRepository.countDistinctCity();
        long districtCount = serviceAreaMasterDongRepository.countDistinctCityDistrict();
        boolean lowDataWarning = totalCount < MASTER_DONG_MIN_TOTAL_THRESHOLD || cityCount < MASTER_DONG_MIN_CITY_THRESHOLD;

        return new ServiceAreaMasterDongSummaryResponse(
                totalCount,
                activeCount,
                cityCount,
                districtCount,
                MASTER_DONG_MIN_TOTAL_THRESHOLD,
                MASTER_DONG_MIN_CITY_THRESHOLD,
                lowDataWarning
        );
    }

    public ServiceAreaMasterDongImportResponse importMasterDongs(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidServiceAreaMasterDongFileException("Import file is empty.");
        }

        byte[] payload;
        try {
            payload = file.getBytes();
        } catch (IOException exception) {
            throw new InvalidServiceAreaMasterDongFileException("Failed to read import file.");
        }

        DecodedFile decodedFile = decodeMasterDongFile(payload);
        Map<String, ServiceAreaMasterDongEntity> existingByCode = new HashMap<>();
        for (ServiceAreaMasterDongEntity entity : serviceAreaMasterDongRepository.findAll()) {
            existingByCode.put(entity.getCode(), entity);
        }

        long addedCount = 0L;
        long updatedCount = 0L;
        long skippedCount = 0L;
        long failedCount = 0L;

        int lineNumber = 0;
        for (String line : decodedFile.lines()) {
            lineNumber++;
            Optional<MasterDongImportRow> parsedRow = parseMasterDongLine(line);
            if (parsedRow.isEmpty()) {
                skippedCount++;
                continue;
            }

            MasterDongImportRow row = parsedRow.get();
            try {
                ServiceAreaMasterDongEntity existing = existingByCode.get(row.code());
                if (existing == null) {
                    ServiceAreaMasterDongEntity created = new ServiceAreaMasterDongEntity(
                            row.code(),
                            row.city(),
                            row.district(),
                            row.dong(),
                            true
                    );
                    serviceAreaMasterDongRepository.save(created);
                    existingByCode.put(created.getCode(), created);
                    addedCount++;
                    continue;
                }

                if (isSameMasterDong(existing, row)) {
                    skippedCount++;
                    continue;
                }

                existing.sync(row.city(), row.district(), row.dong(), true);
                serviceAreaMasterDongRepository.save(existing);
                updatedCount++;
            } catch (RuntimeException exception) {
                failedCount++;
                log.warn(
                        "Service area master import failed: line={} code={} error={}",
                        lineNumber,
                        row.code(),
                        exception.getMessage(),
                        exception
                );
            }
        }

        ServiceAreaMasterDongSummaryResponse summary = getMasterDongsSummaryForOps();
        log.info(
                "Service area master import completed: charset={} added={} updated={} skipped={} failed={} total={} lowDataWarning={}",
                decodedFile.charset(),
                addedCount,
                updatedCount,
                skippedCount,
                failedCount,
                summary.totalCount(),
                summary.lowDataWarning()
        );

        return new ServiceAreaMasterDongImportResponse(
                addedCount,
                updatedCount,
                skippedCount,
                failedCount,
                summary.totalCount(),
                summary.activeCount(),
                summary.cityCount(),
                summary.districtCount(),
                summary.minimumTotalCountThreshold(),
                summary.minimumCityCountThreshold(),
                summary.lowDataWarning()
        );
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

    private DecodedFile decodeMasterDongFile(byte[] payload) {
        String utf8 = new String(payload, StandardCharsets.UTF_8);
        String eucKr = new String(payload, EUC_KR_CHARSET);

        long utf8ReplacementCount = utf8.chars().filter(ch -> ch == '\uFFFD').count();
        long eucKrReplacementCount = eucKr.chars().filter(ch -> ch == '\uFFFD').count();

        if (utf8ReplacementCount <= eucKrReplacementCount) {
            return new DecodedFile(utf8.lines().toList(), StandardCharsets.UTF_8.displayName());
        }
        return new DecodedFile(eucKr.lines().toList(), EUC_KR_CHARSET.displayName());
    }

    private Optional<MasterDongImportRow> parseMasterDongLine(String line) {
        if (!StringUtils.hasText(line)) {
            return Optional.empty();
        }

        String[] parts = line.split("\\t", -1);
        if (parts.length < 2) {
            return Optional.empty();
        }

        String code = parts[0].trim();
        String fullAddressName = parts[1].trim();
        String status = parts.length >= 3 ? parts[2].trim() : "";

        if (!code.matches("\\d{10}")) {
            return Optional.empty();
        }
        if (code.endsWith("00")) {
            return Optional.empty();
        }
        if (status.contains(DEPRECATED_STATUS_KEYWORD)) {
            return Optional.empty();
        }

        String[] nameTokens = fullAddressName.split("\\s+");
        if (nameTokens.length < 2) {
            return Optional.empty();
        }

        String city = nameTokens[0].trim();
        String district = (nameTokens.length >= 3 ? nameTokens[1] : nameTokens[0]).trim();
        String dong = nameTokens[nameTokens.length - 1].trim();

        if (!StringUtils.hasText(city) || !StringUtils.hasText(district) || !StringUtils.hasText(dong)) {
            return Optional.empty();
        }
        if (!hasAnySuffix(dong, MASTER_DONG_SUFFIXES)) {
            return Optional.empty();
        }

        return Optional.of(new MasterDongImportRow(code, city, district, dong));
    }

    private boolean isSameMasterDong(ServiceAreaMasterDongEntity existing, MasterDongImportRow row) {
        return existing.getCity().equals(row.city())
                && existing.getDistrict().equals(row.district())
                && existing.getDong().equals(row.dong())
                && existing.isActive();
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
        if (district.toLowerCase().endsWith("\uC2DC") && hasAnySuffix(next, DISTRICT_SECOND_LEVEL_SUFFIXES)) {
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

    private record DecodedFile(List<String> lines, String charset) {
    }

    private record MasterDongImportRow(String code, String city, String district, String dong) {
    }

    private record AddressRegion(String city, String district, String dong) {
    }
}


