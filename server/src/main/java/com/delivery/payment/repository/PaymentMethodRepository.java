package com.delivery.payment.repository;

import com.delivery.auth.entity.UserEntity;
import com.delivery.payment.entity.PaymentMethodEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethodEntity, Long> {

    List<PaymentMethodEntity> findAllByUserOrderByCreatedAtDesc(UserEntity user);

    List<PaymentMethodEntity> findAllByUserAndStatusOrderByCreatedAtDesc(UserEntity user, String status);

    Optional<PaymentMethodEntity> findFirstByUserAndStatusOrderByCreatedAtDesc(UserEntity user, String status);
}
