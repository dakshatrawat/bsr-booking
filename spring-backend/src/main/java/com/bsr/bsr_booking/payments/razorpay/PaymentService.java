package com.bsr.bsr_booking.payments.razorpay;

import com.bsr.bsr_booking.dtos.NotificationDTO;
import com.bsr.bsr_booking.entities.Booking;
import com.bsr.bsr_booking.entities.PaymentEntity;
import com.bsr.bsr_booking.enums.NotificationType;
import com.bsr.bsr_booking.enums.PaymentGateway;
import com.bsr.bsr_booking.enums.PaymentStatus;
import com.bsr.bsr_booking.exceptions.NotFoundException;
import com.bsr.bsr_booking.payments.razorpay.dto.PaymentRequest;
import com.bsr.bsr_booking.repositories.BookingRepository;
import com.bsr.bsr_booking.repositories.PaymentRepository;
import com.bsr.bsr_booking.services.NotificationService;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    /**
     * STEP 1:
     * Create Razorpay Order
     * (Method name kept same to avoid refactor)
     */
    public String createPaymentIntent(PaymentRequest paymentRequest) {

        log.info("Creating Razorpay order for booking reference: {}", paymentRequest.getBookingReference());
        log.info("Amount received: {}", paymentRequest.getAmount());

        Booking booking = bookingRepository
                .findByBookingReference(paymentRequest.getBookingReference())
                .orElseThrow(() -> {
                    log.error("Booking not found with reference: {}", paymentRequest.getBookingReference());
                    return new NotFoundException("Booking not found");
                });

        if (booking.getPaymentStatus() == PaymentStatus.COMPLETED) {
            log.warn("Payment already completed for booking: {}", paymentRequest.getBookingReference());
            throw new RuntimeException("Payment already completed for this booking");
        }

        // Use booking's total price if amount is null or zero
        BigDecimal amountToUse = paymentRequest.getAmount();
        if (amountToUse == null || amountToUse.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Amount is null or zero, using booking total price: {}", booking.getTotalPrice());
            amountToUse = booking.getTotalPrice();
        }

        try {
            log.info("Initializing Razorpay client with key: {}", razorpayKeyId);
            RazorpayClient client =
                    new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            int amountInPaise = amountToUse
                    .multiply(BigDecimal.valueOf(100))
                    .intValue();

            log.info("Creating Razorpay order with amount: {} paise ({} INR)", amountInPaise, amountToUse);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", booking.getBookingReference());
            orderRequest.put("payment_capture", 1); // Auto capture payment

            Order order = client.orders.create(orderRequest);

            String orderId = order.get("id");
            log.info("Razorpay order created successfully: {}", orderId);

            // 🔥 Send order_id to frontend
            return orderId;

        } catch (com.razorpay.RazorpayException e) {
            log.error("Razorpay API error: {}", e.getMessage(), e);
            throw new RuntimeException("Razorpay error: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error creating Razorpay order: {}", e.getMessage(), e);
            throw new RuntimeException("Error creating Razorpay order: " + e.getMessage());
        }
    }

    /**
     * STEP 2:
     * Update booking & payment after Razorpay response
     */
    public void updatePaymentBooking(PaymentRequest paymentRequest) {

        log.info("Updating payment status for booking");

        Booking booking = bookingRepository
                .findByBookingReference(paymentRequest.getBookingReference())
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        PaymentEntity payment = new PaymentEntity();
        payment.setPaymentGateway(PaymentGateway.RAZORPAY);
        payment.setAmount(paymentRequest.getAmount());
        payment.setTransactionId(paymentRequest.getTransactionId());
        payment.setPaymentDate(LocalDateTime.now());
        payment.setBookingReference(paymentRequest.getBookingReference());
        payment.setUser(booking.getUser());

        NotificationDTO notification = NotificationDTO.builder()
                .recipient(booking.getUser().getEmail())
                .type(NotificationType.EMAIL)
                .bookingReference(paymentRequest.getBookingReference())
                .build();

        if (paymentRequest.isSuccess()) {
            payment.setPaymentStatus(PaymentStatus.COMPLETED);
            booking.setPaymentStatus(PaymentStatus.COMPLETED);
            booking.setBookingStatus(com.bsr.bsr_booking.enums.BookingStatus.BOOKED);

            // Send detailed confirmation email with booking details
            notification.setSubject("Booking Confirmation - " + booking.getBookingReference());
            StringBuilder emailBody = new StringBuilder();
            emailBody.append("Dear ").append(booking.getUser().getFirstName()).append(" ").append(booking.getUser().getLastName()).append(",\n\n");
            emailBody.append("Your booking has been confirmed! We are delighted to have you stay with us.\n\n");
            emailBody.append("BOOKING DETAILS:\n");
            emailBody.append("Booking Reference: ").append(booking.getBookingReference()).append("\n");
            emailBody.append("Room Type: ").append(booking.getRoom().getType()).append("\n");
            emailBody.append("Check-in Date: ").append(booking.getCheckInDate()).append("\n");
            emailBody.append("Check-out Date: ").append(booking.getCheckOutDate()).append("\n");
            emailBody.append("Total Amount Paid: ₹").append(booking.getTotalPrice()).append("\n");
            emailBody.append("Payment Transaction ID: ").append(paymentRequest.getTransactionId()).append("\n");
            emailBody.append("Payment Status: COMPLETED\n\n");
            emailBody.append("We look forward to welcoming you to Bhagat Singh Resort!\n\n");
            emailBody.append("If you have any questions or need assistance, please feel free to contact us.\n\n");
            emailBody.append("Best regards,\n");
            emailBody.append("Bhagat Singh Resort Team");

            notification.setBody(emailBody.toString());

        } else {
            payment.setPaymentStatus(PaymentStatus.FAILED);
            payment.setFailureReason(paymentRequest.getFailureReason());
            booking.setPaymentStatus(PaymentStatus.FAILED);

            notification.setSubject("Payment Failed");
            notification.setBody(
                    "Payment failed for booking " +
                            paymentRequest.getBookingReference() +
                            ". Reason: " + paymentRequest.getFailureReason()
            );
        }

        paymentRepository.save(payment);
        bookingRepository.save(booking);
        notificationService.sendEmail(notification);
    }
}
