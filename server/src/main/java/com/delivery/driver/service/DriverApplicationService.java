package com.delivery.driver.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.driver.dto.CreateDriverApplicationRequest;
import com.delivery.driver.dto.DriverApplicationResponse;
import com.delivery.driver.entity.DriverApplicationEntity;
import com.delivery.driver.exception.DriverApplicationNotFoundException;
import com.delivery.driver.exception.DriverApplicationStatusConflictException;
import com.delivery.driver.repository.DriverApplicationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.time.Instant;

@Service
public class DriverApplicationService {

    private static final String PENDING = "PENDING";
    private static final String APPROVED = "APPROVED";
    private static final String REJECTED = "REJECTED";

    private final UserRepository userRepository;
    private final DriverApplicationRepository driverApplicationRepository;
    private final ObjectMapper objectMapper;

    public DriverApplicationService(
            UserRepository userRepository,
            DriverApplicationRepository driverApplicationRepository,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.driverApplicationRepository = driverApplicationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public DriverApplicationResponse create(String email, CreateDriverApplicationRequest request) {
        UserEntity user = findUserByEmail(email);
        DriverApplicationEntity entity = new DriverApplicationEntity(
                user,
                PENDING,
                toJsonString(request.payload())
        );
        DriverApplicationEntity saved = driverApplicationRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public List<DriverApplicationResponse> getMyApplications(String email) {
        UserEntity user = findUserByEmail(email);
        return driverApplicationRepository.findAllByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DriverApplicationResponse getMyApplication(String email, Long applicationId) {
        UserEntity user = findUserByEmail(email);
        DriverApplicationEntity entity = driverApplicationRepository.findByIdAndUser(applicationId, user)
                .orElseThrow(DriverApplicationNotFoundException::new);
        return toResponse(entity);
    }

    @Transactional
    public DriverApplicationResponse approve(String actorEmail, Long applicationId) {
        return process(actorEmail, applicationId, APPROVED);
    }

    @Transactional
    public DriverApplicationResponse reject(String actorEmail, Long applicationId) {
        return process(actorEmail, applicationId, REJECTED);
    }

    private UserEntity findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private DriverApplicationResponse process(String actorEmail, Long applicationId, String nextStatus) {
        UserEntity actor = findUserByEmail(actorEmail);
        DriverApplicationEntity entity = driverApplicationRepository.findById(applicationId)
                .orElseThrow(DriverApplicationNotFoundException::new);

        if (!PENDING.equals(entity.getStatus())) {
            throw new DriverApplicationStatusConflictException();
        }

        entity.markProcessed(nextStatus, actor, Instant.now());
        return toResponse(entity);
    }

    private DriverApplicationResponse toResponse(DriverApplicationEntity entity) {
        return new DriverApplicationResponse(
                entity.getId(),
                entity.getUser().getId(),
                entity.getStatus(),
                toJsonNode(entity.getPayload()),
                entity.getProcessedBy() != null ? entity.getProcessedBy().getId() : null,
                entity.getProcessedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private String toJsonString(JsonNode payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("payload를 JSON 문자열로 변환할 수 없습니다.");
        }
    }

    private JsonNode toJsonNode(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("저장된 payload JSON을 읽을 수 없습니다.");
        }
    }
}
