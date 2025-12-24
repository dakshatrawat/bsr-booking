package com.bsr.bsr_booking.payments.razorpay.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentRequest {

    @NotBlank(message = "Booking reference is required")
    private String bookingReference;

    private BigDecimal amount;

    // Razorpay payment id (sent after payment success)
    private String transactionId;

    // frontend / client sends this
    private boolean success;

    private String failureReason;
}
