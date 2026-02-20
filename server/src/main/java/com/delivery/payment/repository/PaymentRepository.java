package com.delivery.payment.repository;

import com.delivery.payment.entity.PaymentEntity;
import com.delivery.waste.entity.WasteRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {

    Optional<PaymentEntity> findByWasteRequest(WasteRequestEntity wasteRequest);

    Optional<PaymentEntity> findByWasteRequestId(Long wasteRequestId);

    Optional<PaymentEntity> findByProviderOrderId(String providerOrderId);
}
