package com.bsr.bsr_booking.repositories;

import com.bsr.bsr_booking.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
}
