package com.bsr.bsr_booking.repositories;

import com.bsr.bsr_booking.entities.PaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {
}
