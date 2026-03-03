package com.delivery.servicearea.service;

import com.delivery.address.dto.AddressSearchResponse;
import com.delivery.address.exception.AddressSearchTimeoutException;
import com.delivery.address.exception.AddressSearchUnavailableException;
import com.delivery.address.service.AddressSearchService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.delivery.servicearea.dto.CreateServiceAreaRequest;
import com.delivery.servicearea.dto.RegisterServiceAreaByCodeRequest;
import com.delivery.servicearea.dto.ServiceAreaMasterDongImportResponse;
import com.delivery.servicearea.dto.ServiceAreaMasterDongResponse;
import com.delivery.servicearea.dto.ServiceAreaMasterDongSummaryResponse;
import com.delivery.servicearea.dto.ServiceAreaResponse;
import com.delivery.servicearea.entity.ServiceAreaMasterDongEntity;
import com.delivery.servicearea.entity.ServiceAreaEntity;
import com.delivery.servicearea.exception.InvalidServiceAreaMasterDongFileException;
import com.delivery.servicearea.exception.ServiceAreaDeleteNotAllowedException;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
    private static final String AUTO_IMPORT_SOURCE_URL = "https://kr-legal-dong.github.io/data/dong.json";
    private static final int ADDRESS_SEARCH_FALLBACK_LIMIT = 5;
    private static final long MASTER_DONG_MIN_TOTAL_THRESHOLD = 3000L;
    private static final long MASTER_DONG_MIN_CITY_THRESHOLD = 16L;
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
    private static final List<String> MAJOR_CITY_COVERAGE_TARGETS = List.of(
            "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC",
            "\uBD80\uC0B0\uAD11\uC5ED\uC2DC",
            "\uB300\uAD6C\uAD11\uC5ED\uC2DC",
            "\uC778\uCC9C\uAD11\uC5ED\uC2DC"
    );
    private static final Map<String, String> CITY_ALIAS_MAP = Map.ofEntries(
            Map.entry("seoul", "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC"),
            Map.entry("busan", "\uBD80\uC0B0\uAD11\uC5ED\uC2DC"),
            Map.entry("daegu", "\uB300\uAD6C\uAD11\uC5ED\uC2DC"),
            Map.entry("incheon", "\uC778\uCC9C\uAD11\uC5ED\uC2DC"),
            Map.entry("gwangju", "\uAD11\uC8FC\uAD11\uC5ED\uC2DC"),
            Map.entry("daejeon", "\uB300\uC804\uAD11\uC5ED\uC2DC"),
            Map.entry("ulsan", "\uC6B8\uC0B0\uAD11\uC5ED\uC2DC"),
            Map.entry("sejong", "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC")
    );

    private final ServiceAreaRepository serviceAreaRepository;
    private final ServiceAreaMasterDongRepository serviceAreaMasterDongRepository;
    private final AddressSearchService addressSearchService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public ServiceAreaService(
            ServiceAreaRepository serviceAreaRepository,
            ServiceAreaMasterDongRepository serviceAreaMasterDongRepository,
            AddressSearchService addressSearchService,
            ObjectMapper objectMapper
    ) {
        this.serviceAreaRepository = serviceAreaRepository;
        this.serviceAreaMasterDongRepository = serviceAreaMasterDongRepository;
        this.addressSearchService = addressSearchService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().build();
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
        log.info(
                "Service area state changed: action=DEACTIVATE actor={} id={} city={} district={} dong={}",
                currentActor(),
                entity.getId(),
                entity.getCity(),
                entity.getDistrict(),
                entity.getDong()
        );
        return toResponse(entity);
    }

    @Transactional
    public ServiceAreaResponse reactivate(Long serviceAreaId) {
        ServiceAreaEntity entity = serviceAreaRepository.findById(serviceAreaId)
                .orElseThrow(ServiceAreaNotFoundException::new);
        entity.activate();
        log.info(
                "Service area state changed: action=REACTIVATE actor={} id={} city={} district={} dong={}",
                currentActor(),
                entity.getId(),
                entity.getCity(),
                entity.getDistrict(),
                entity.getDong()
        );
        return toResponse(entity);
    }

    @Transactional
    public void deleteInactive(Long serviceAreaId) {
        ServiceAreaEntity entity = serviceAreaRepository.findById(serviceAreaId)
                .orElseThrow(ServiceAreaNotFoundException::new);
        if (entity.isActive()) {
            throw new ServiceAreaDeleteNotAllowedException("Active service area cannot be deleted. Deactivate first.");
        }
        serviceAreaRepository.delete(entity);
        log.info(
                "Service area state changed: action=DELETE actor={} id={} city={} district={} dong={}",
                currentActor(),
                entity.getId(),
                entity.getCity(),
                entity.getDistrict(),
                entity.getDong()
        );
    }

    @Transactional
    public Page<ServiceAreaResponse> getForOps(String query, Boolean active, Pageable pageable) {
        String keyword = normalizeKeyword(query);
        return serviceAreaRepository.searchForOps(keyword, active, pageable).map(this::toResponse);
    }

    @Transactional
    public Page<ServiceAreaMasterDongResponse> getMasterDongsForOps(
            String query,
            String city,
            String district,
            Boolean active,
            Pageable pageable
    ) {
        String keyword = normalizeKeyword(query);
        String normalizedCity = normalizeCityFilter(city);
        String normalizedDistrict = normalizeKeyword(district);
        return serviceAreaMasterDongRepository.searchForOps(
                keyword,
                normalizedCity,
                normalizedDistrict,
                active,
                pageable
        ).map(this::toMasterResponse);
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

    public ServiceAreaMasterDongImportResponse importMasterDongs(MultipartFile file, boolean reset) {
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
        List<MasterDongImportRow> parsedRows = new ArrayList<>();
        long skippedCount = 0L;
        for (String line : decodedFile.lines()) {
            Optional<MasterDongImportRow> parsedRow = parseMasterDongLine(line);
            if (parsedRow.isEmpty()) {
                skippedCount++;
                continue;
            }
            parsedRows.add(parsedRow.get());
        }
        return persistImportedMasterRows(parsedRows, skippedCount, reset, "file");
    }

    public ServiceAreaMasterDongImportResponse importMasterDongsFromAutoSource(boolean reset) {
        List<AutoSourceDongItem> items = fetchAutoSourceRows();
        List<MasterDongImportRow> parsedRows = new ArrayList<>();
        long skippedCount = 0L;
        for (AutoSourceDongItem item : items) {
            String code = safeTrim(item.code());
            String city = safeTrim(item.siName());
            String district = safeTrim(item.guName());
            String dong = safeTrim(item.name());
            String status = item.active() ? "ACTIVE" : "\uD3D0\uC9C0";
            String line = code + "\t" + city + " " + district + " " + dong + "\t" + status;

            Optional<MasterDongImportRow> parsedRow = parseMasterDongLine(line);
            if (parsedRow.isEmpty()) {
                skippedCount++;
                continue;
            }
            parsedRows.add(parsedRow.get());
        }
        return persistImportedMasterRows(parsedRows, skippedCount, reset, "auto-source");
    }

    private ServiceAreaMasterDongImportResponse persistImportedMasterRows(
            List<MasterDongImportRow> rows,
            long skippedCount,
            boolean reset,
            String sourceType
    ) {
        Map<String, ServiceAreaMasterDongEntity> existingByCode = new HashMap<>();
        Map<String, ServiceAreaMasterDongEntity> existingByRegion = new HashMap<>();
        if (reset) {
            serviceAreaMasterDongRepository.deleteAllInBatch();
            log.info("Service area master import reset executed: actor={} source={}", currentActor(), sourceType);
        } else {
            for (ServiceAreaMasterDongEntity entity : serviceAreaMasterDongRepository.findAll()) {
                existingByCode.put(entity.getCode(), entity);
                existingByRegion.put(regionKey(entity.getCity(), entity.getDistrict(), entity.getDong()), entity);
            }
        }

        long addedCount = 0L;
        long updatedCount = 0L;
        long failedCount = 0L;
        for (MasterDongImportRow row : rows) {
            try {
                ServiceAreaMasterDongEntity existing = existingByCode.get(row.code());
                if (existing == null) {
                    ServiceAreaMasterDongEntity existingSameRegion = existingByRegion.get(
                            regionKey(row.city(), row.district(), row.dong())
                    );
                    if (existingSameRegion != null) {
                        skippedCount++;
                        continue;
                    }
                    ServiceAreaMasterDongEntity created = new ServiceAreaMasterDongEntity(
                            row.code(),
                            row.city(),
                            row.district(),
                            row.dong(),
                            true
                    );
                    serviceAreaMasterDongRepository.save(created);
                    existingByCode.put(created.getCode(), created);
                    existingByRegion.put(regionKey(created.getCity(), created.getDistrict(), created.getDong()), created);
                    addedCount++;
                    continue;
                }

                if (isSameMasterDong(existing, row)) {
                    skippedCount++;
                    continue;
                }

                String previousRegionKey = regionKey(existing.getCity(), existing.getDistrict(), existing.getDong());
                existing.sync(row.city(), row.district(), row.dong(), true);
                serviceAreaMasterDongRepository.save(existing);
                existingByRegion.remove(previousRegionKey);
                existingByRegion.put(regionKey(existing.getCity(), existing.getDistrict(), existing.getDong()), existing);
                updatedCount++;
            } catch (RuntimeException exception) {
                failedCount++;
                log.warn(
                        "Service area master import failed: source={} code={} error={}",
                        sourceType,
                        row.code(),
                        exception.getMessage(),
                        exception
                );
            }
        }

        ServiceAreaMasterDongSummaryResponse summary = getMasterDongsSummaryForOps();
        List<String> missingMajorCities = new ArrayList<>();
        long majorCityCoverageMet = 0L;
        for (String majorCity : MAJOR_CITY_COVERAGE_TARGETS) {
            long activeCount = serviceAreaMasterDongRepository.countActiveByCity(majorCity);
            if (activeCount > 0) {
                majorCityCoverageMet++;
            } else {
                missingMajorCities.add(majorCity);
            }
        }
        log.info(
                "Service area master import completed: actor={} source={} reset={} added={} updated={} skipped={} failed={} total={} lowDataWarning={} majorCityCoverage={}/{}",
                currentActor(),
                sourceType,
                reset,
                addedCount,
                updatedCount,
                skippedCount,
                failedCount,
                summary.totalCount(),
                summary.lowDataWarning(),
                majorCityCoverageMet,
                MAJOR_CITY_COVERAGE_TARGETS.size()
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
                summary.lowDataWarning(),
                MAJOR_CITY_COVERAGE_TARGETS.size(),
                majorCityCoverageMet,
                missingMajorCities
        );
    }

    private List<AutoSourceDongItem> fetchAutoSourceRows() {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(AUTO_IMPORT_SOURCE_URL))
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != HttpStatus.OK.value()) {
                throw new InvalidServiceAreaMasterDongFileException("Auto source request failed with status " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), new TypeReference<List<AutoSourceDongItem>>() {
            });
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new InvalidServiceAreaMasterDongFileException("Failed to load auto source data.");
        } catch (IOException exception) {
            throw new InvalidServiceAreaMasterDongFileException("Failed to load auto source data.");
        }
    }

    private String safeTrim(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    private String regionKey(String city, String district, String dong) {
        return city + "|" + district + "|" + dong;
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

    private String normalizeCityFilter(String city) {
        String normalized = normalizeKeyword(city);
        if (normalized.isEmpty()) {
            return normalized;
        }
        String aliasKey = normalized.toLowerCase().replaceAll("\\s+", "");
        return CITY_ALIAS_MAP.getOrDefault(aliasKey, normalized);
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

    private record AutoSourceDongItem(String code, String siName, String guName, String name, boolean active) {
    }

    private String currentActor() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            return "anonymous";
        }
        String name = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!StringUtils.hasText(name)) {
            return "anonymous";
        }
        return name;
    }

    private record AddressRegion(String city, String district, String dong) {
    }
}


