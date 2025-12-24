package com.bsr.bsr_booking.services;

import com.bsr.bsr_booking.dtos.NotificationDTO;

public interface NotificationService {

    void sendEmail(NotificationDTO notificationDTO);

    void sendSms();

    void sendWhatsapp();
}
