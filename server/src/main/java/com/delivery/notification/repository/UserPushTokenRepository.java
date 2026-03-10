package com.delivery.notification.repository;

import com.delivery.auth.entity.UserEntity;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.PushTokenProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserPushTokenRepository extends JpaRepository<UserPushTokenEntity, Long> {

    Optional<UserPushTokenEntity> findByUserAndProviderAndPushToken(
            UserEntity user,
            PushTokenProvider provider,
            String pushToken
    );

    long countByUserAndProviderAndPushToken(
            UserEntity user,
            PushTokenProvider provider,
            String pushToken
    );

    List<UserPushTokenEntity> findAllByUserAndActiveTrue(UserEntity user);
}
