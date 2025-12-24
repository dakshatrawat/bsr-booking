package com.bsr.bsr_booking.services.impl;

import com.bsr.bsr_booking.dtos.BookingDTO;
import com.bsr.bsr_booking.dtos.NotificationDTO;
import com.bsr.bsr_booking.dtos.Response;
import com.bsr.bsr_booking.entities.Booking;
import com.bsr.bsr_booking.entities.Room;
import com.bsr.bsr_booking.entities.User;
import com.bsr.bsr_booking.enums.BookingStatus;
import com.bsr.bsr_booking.enums.PaymentStatus;
import com.bsr.bsr_booking.exceptions.InvalidBookingStateAndDateException;
import com.bsr.bsr_booking.exceptions.NotFoundException;
import com.bsr.bsr_booking.repositories.BookingRepository;
import com.bsr.bsr_booking.repositories.RoomRepository;
import com.bsr.bsr_booking.services.BookingCodeGenerator;
import com.bsr.bsr_booking.services.BookingService;
import com.bsr.bsr_booking.services.NotificationService;
import com.bsr.bsr_booking.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {


    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final NotificationService notificationService;
    private final ModelMapper modelMapper;
    private final UserService userService;
    private final BookingCodeGenerator bookingCodeGenerator;


    @Override
    public Response getAllBookings() {
        List<Booking> bookingList =bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        List<BookingDTO> bookingDTOList = modelMapper.map(bookingList, new TypeToken<List<BookingDTO>>() {}.getType());

        for(BookingDTO bookingDTO: bookingDTOList){
            bookingDTO.setUser(null);
            bookingDTO.setRoom(null);
        }

        return Response.builder()
                .status(200)
                .message("success")
                .bookings(bookingDTOList)
                .build();
    }

    @Override
    public Response createBooking(BookingDTO bookingDTO) {

        User currentUser = userService.getCurrentLoggedInUser();

        Room room = roomRepository.findById(bookingDTO.getRoomId())
                .orElseThrow(()-> new NotFoundException("Room Not Found"));


        //validation: Ensure the check-in date is not before today
        if (bookingDTO.getCheckInDate().isBefore(LocalDate.now())){
            throw new InvalidBookingStateAndDateException("check in date cannot be before today ");
        }

        //validation: Ensure the check-out date is not before check in date
        if (bookingDTO.getCheckInDate().isBefore(bookingDTO.getCheckInDate())){
            throw new InvalidBookingStateAndDateException("check out date cannot be before check in date ");
        }

        //validation: Ensure the check-in date is not same as check out date
        if (bookingDTO.getCheckInDate().isEqual(bookingDTO.getCheckOutDate())){
            throw new InvalidBookingStateAndDateException("check in date cannot be equal to check out date ");
        }

        //validate room availability
       boolean isAvailable = bookingRepository.isRoomAvailable(room.getId(), bookingDTO.getCheckInDate(), bookingDTO.getCheckOutDate());
        if (!isAvailable) {
            throw new InvalidBookingStateAndDateException("Room is not available for the selected date ranges");
        }

        //calculate the total price needed to pay for the stay
        BigDecimal totalPrice = calculateTotalPrice(room, bookingDTO);
        String bookingReference = bookingCodeGenerator.generateBookingReference();

        //create and save the booking
        Booking booking = new Booking();
        booking.setUser(currentUser);
        booking.setRoom(room);
        booking.setCheckInDate(bookingDTO.getCheckInDate());
        booking.setCheckOutDate(bookingDTO.getCheckOutDate());
        booking.setTotalPrice(totalPrice);
        booking.setBookingReference(bookingReference);
        booking.setBookingStatus(BookingStatus.BOOKED);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        booking.setCreatedAt(LocalDateTime.now());

        bookingRepository.save(booking); //save to database

        // Don't send email here - email will be sent only after payment is successful
        // Return booking reference and amount for payment page redirect
        log.info("Booking created with reference: {} - Redirecting to payment", bookingReference);

        // Set booking reference and total price in DTO for frontend
        bookingDTO.setBookingReference(bookingReference);
        bookingDTO.setTotalPrice(totalPrice);

        return Response.builder()
                .status(200)
                .message("Booking created. Please proceed to payment.")
                .booking(bookingDTO)
                .build();

    }

    @Override
    public Response findBookingByReferenceNo(String bookingReference) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(()-> new NotFoundException("Booking with reference No: " + bookingReference + "Not found"));

        BookingDTO bookingDTO = modelMapper.map(booking, BookingDTO.class);
        return  Response.builder()
                .status(200)
                .message("success")
                .booking(bookingDTO)
                .build();
    }

    @Override
    public Response updateBooking(BookingDTO bookingDTO) {
        if (bookingDTO.getId() == null) throw new NotFoundException("Booking id is required");

        Booking existingBooking = bookingRepository.findById(bookingDTO.getId())
                .orElseThrow(()-> new NotFoundException("Booking Not Found"));

        if (bookingDTO.getBookingStatus() != null) {
            existingBooking.setBookingStatus(bookingDTO.getBookingStatus());
        }

        if (bookingDTO.getPaymentStatus() != null) {
            existingBooking.setPaymentStatus(bookingDTO.getPaymentStatus());
        }

        bookingRepository.save(existingBooking);

        return Response.builder()
                .status(200)
                .message("Booking Updated Successfully")
                .build();
    }


    private BigDecimal calculateTotalPrice(Room room, BookingDTO bookingDTO){
        BigDecimal pricePerNight = room.getPricePerNight();
        long days = ChronoUnit.DAYS.between(bookingDTO.getCheckInDate(), bookingDTO.getCheckOutDate());
        return pricePerNight.multiply(BigDecimal.valueOf(days));
    }





}
