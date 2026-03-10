package com.delivery.notification.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.notification.dto.NotificationBroadcastRequest;
import com.delivery.notification.dto.NotificationBroadcastResponse;
import com.delivery.notification.entity.NotificationBroadcastHistoryEntity;
import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.exception.InvalidNotificationBroadcastRequestException;
import com.delivery.notification.model.NotificationBroadcastResultStatus;
import com.delivery.notification.model.NotificationBroadcastTargetType;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.repository.NotificationBroadcastHistoryRepository;
import com.delivery.notification.repository.NotificationRepository;
import com.delivery.notification.repository.UserPushTokenRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class OpsAdminNotificationBroadcastService {

    private static final Logger log = LoggerFactory.getLogger(OpsAdminNotificationBroadcastService.class);
    private static final String USER_ROLE = "USER";
    private static final String DRIVER_ROLE = "DRIVER";

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationBroadcastHistoryRepository notificationBroadcastHistoryRepository;
    private final UserPushTokenRepository userPushTokenRepository;
    private final PushNotificationSender pushNotificationSender;
    private final ObjectMapper objectMapper;

    public OpsAdminNotificationBroadcastService(
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            NotificationBroadcastHistoryRepository notificationBroadcastHistoryRepository,
            UserPushTokenRepository userPushTokenRepository,
            PushNotificationSender pushNotificationSender,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationBroadcastHistoryRepository = notificationBroadcastHistoryRepository;
        this.userPushTokenRepository = userPushTokenRepository;
        this.pushNotificationSender = pushNotificationSender;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public NotificationBroadcastResponse broadcast(
            String actorLoginId,
            NotificationBroadcastRequest request
    ) {
        UserEntity actor = userRepository.findByLoginId(actorLoginId)
                .orElseThrow(InvalidCredentialsException::new);

        String normalizedTitle = normalizeText(request.title(), "title은 필수입니다.");
        String normalizedMessage = normalizeText(request.message(), "message는 필수입니다.");
        if (request.category() == null) {
            throw new InvalidNotificationBroadcastRequestException("category는 필수입니다.");
        }
        List<UserEntity> targetUsers = resolveTargetUsers(request.targetType(), request.targetUserIds());
        List<Long> targetUserIds = targetUsers.stream()
                .map(UserEntity::getId)
                .toList();

        Instant now = Instant.now();
        boolean scheduled = request.scheduledAt() != null && request.scheduledAt().isAfter(now);
        NotificationBroadcastResultStatus resultStatus = scheduled
                ? NotificationBroadcastResultStatus.SCHEDULED
                : NotificationBroadcastResultStatus.COMPLETED;
        Instant executedAt = scheduled ? null : now;

        NotificationBroadcastHistoryEntity history = notificationBroadcastHistoryRepository.save(
                new NotificationBroadcastHistoryEntity(
                        actor,
                        request.targetType(),
                        toJson(targetUserIds),
                        request.category(),
                        normalizedTitle,
                        normalizedMessage,
                        request.scheduledAt(),
                        executedAt,
                        resultStatus,
                        targetUserIds.size()
                )
        );

        if (!scheduled && !targetUsers.isEmpty()) {
            String payloadJson = buildBroadcastPayloadJson(history.getId(), request.targetType(), request.category().name());

            List<NotificationEntity> notifications = targetUsers.stream()
                    .map(targetUser -> new NotificationEntity(
                            targetUser,
                            NotificationType.ADMIN_BROADCAST,
                            normalizedTitle,
                            normalizedMessage,
                            payloadJson
                    ))
                    .toList();
            notificationRepository.saveAll(notifications);

            List<UserPushTokenEntity> activeTokens = userPushTokenRepository.findAllByUserInAndActiveTrue(targetUsers);
            for (UserPushTokenEntity token : activeTokens) {
                try {
                    pushNotificationSender.send(
                            token,
                            NotificationType.ADMIN_BROADCAST,
                            normalizedTitle,
                            normalizedMessage,
                            payloadJson
                    );
                } catch (RuntimeException ex) {
                    log.warn(
                            "notification.broadcast pushFailed historyId={} userId={} tokenId={} reason={}",
                            history.getId(),
                            token.getUser().getId(),
                            token.getId(),
                            ex.getMessage()
                    );
                }
            }
        }

        log.info(
                "notification.broadcast actorUserId={} actorLoginId={} historyId={} targetType={} targetCount={} category={} resultStatus={} scheduledAt={} executedAt={}",
                actor.getId(),
                actor.getLoginId(),
                history.getId(),
                request.targetType(),
                history.getTargetCount(),
                request.category(),
                history.getResultStatus(),
                history.getScheduledAt(),
                history.getExecutedAt()
        );

        return new NotificationBroadcastResponse(
                history.getId(),
                history.getResultStatus(),
                history.getTargetCount(),
                history.getScheduledAt(),
                history.getExecutedAt()
        );
    }

    private List<UserEntity> resolveTargetUsers(
            NotificationBroadcastTargetType targetType,
            List<Long> targetUserIds
    ) {
        if (targetType == null) {
            throw new InvalidNotificationBroadcastRequestException("targetType은 필수입니다.");
        }

        return switch (targetType) {
            case ALL_USERS -> userRepository.findActiveUsersByRoleCode(USER_ROLE);
            case ALL_DRIVERS -> userRepository.findActiveUsersByRoleCode(DRIVER_ROLE);
            case USER_IDS -> resolveExplicitTargetUsers(targetUserIds);
        };
    }

    private List<UserEntity> resolveExplicitTargetUsers(List<Long> targetUserIds) {
        if (targetUserIds == null || targetUserIds.isEmpty()) {
            throw new InvalidNotificationBroadcastRequestException("USER_IDS 대상 발송 시 targetUserIds는 필수입니다.");
        }

        Set<Long> uniqueIds = targetUserIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (uniqueIds.isEmpty()) {
            throw new InvalidNotificationBroadcastRequestException("targetUserIds에 유효한 사용자 ID가 없습니다.");
        }

        List<Long> orderedIds = new ArrayList<>(uniqueIds);
        List<UserEntity> users = userRepository.findAllById(orderedIds).stream()
                .filter(user -> "ACTIVE".equalsIgnoreCase(user.getStatus()))
                .toList();

        Map<Long, UserEntity> userMap = users.stream()
                .collect(Collectors.toMap(UserEntity::getId, user -> user));

        if (userMap.size() != orderedIds.size()) {
            throw new InvalidNotificationBroadcastRequestException(
                    "targetUserIds에 비활성 사용자 또는 존재하지 않는 사용자 ID가 포함되어 있습니다."
            );
        }

        return orderedIds.stream()
                .map(userMap::get)
                .toList();
    }

    private String buildBroadcastPayloadJson(
            Long historyId,
            NotificationBroadcastTargetType targetType,
            String category
    ) {
        return toJson(Map.of(
                "broadcastHistoryId", historyId,
                "targetType", targetType.name(),
                "category", category
        ));
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("브로드캐스트 payload 직렬화에 실패했습니다.", ex);
        }
    }

    private String normalizeText(String value, String blankMessage) {
        if (!StringUtils.hasText(value)) {
            throw new InvalidNotificationBroadcastRequestException(blankMessage);
        }
        return value.trim();
    }
}
