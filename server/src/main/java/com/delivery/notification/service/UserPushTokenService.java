package com.delivery.notification.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
import com.delivery.notification.repository.UserPushTokenRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class UserPushTokenService {

    private final UserRepository userRepository;
    private final UserPushTokenRepository userPushTokenRepository;

    public UserPushTokenService(
            UserRepository userRepository,
            UserPushTokenRepository userPushTokenRepository
    ) {
        this.userRepository = userRepository;
        this.userPushTokenRepository = userPushTokenRepository;
    }

    @Transactional
    public UserPushTokenEntity registerOrReactivateToken(
            String loginId,
            PushTokenDeviceType deviceType,
            PushTokenProvider provider,
            String pushToken
    ) {
        String normalizedPushToken = normalizePushToken(pushToken);
        UserEntity user = userRepository.findByLoginId(loginId)
                .orElseThrow(InvalidCredentialsException::new);

        return userPushTokenRepository.findByUserAndProviderAndPushToken(user, provider, normalizedPushToken)
                .map(existing -> {
                    existing.reactivate(deviceType);
                    return userPushTokenRepository.save(existing);
                })
                .orElseGet(() -> userPushTokenRepository.save(
                        new UserPushTokenEntity(
                                user,
                                Objects.requireNonNull(deviceType),
                                Objects.requireNonNull(provider),
                                normalizedPushToken
                        )
                ));
    }

    @Transactional
    public void deactivateToken(
            String loginId,
            PushTokenProvider provider,
            String pushToken
    ) {
        String normalizedPushToken = normalizePushToken(pushToken);
        UserEntity user = userRepository.findByLoginId(loginId)
                .orElseThrow(InvalidCredentialsException::new);

        userPushTokenRepository.findByUserAndProviderAndPushToken(user, provider, normalizedPushToken)
                .ifPresent(existing -> {
                    if (existing.isActive()) {
                        existing.deactivate();
                        userPushTokenRepository.save(existing);
                    }
                });
    }

    private String normalizePushToken(String pushToken) {
        String normalized = Objects.requireNonNull(pushToken).trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("pushToken은 공백일 수 없습니다.");
        }
        return normalized;
    }
}
