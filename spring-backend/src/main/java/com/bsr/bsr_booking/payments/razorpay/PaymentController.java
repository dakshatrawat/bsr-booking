package com.bsr.bsr_booking.payments.razorpay;

import com.bsr.bsr_booking.payments.razorpay.dto.PaymentRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // STEP 1: Create Razorpay Order (earlier Stripe clientSecret)
    @PostMapping("/pay")
    public ResponseEntity<?> createPayment(
            @RequestBody PaymentRequest paymentRequest) {
        try {
            if (paymentRequest.getBookingReference() == null || paymentRequest.getBookingReference().isEmpty()) {
                return ResponseEntity.badRequest().body("Booking reference is required");
            }
            String orderId = paymentService.createPaymentIntent(paymentRequest);
            return ResponseEntity.ok(orderId);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body("Error: " + e.getMessage());
        }
    }

    // STEP 2: Update booking after payment success/failure
    @PutMapping("/update")
    public ResponseEntity<Void> updatePaymentBooking(
            @RequestBody PaymentRequest paymentRequest) {

        paymentService.updatePaymentBooking(paymentRequest);
        return ResponseEntity.ok().build();
    }
}
