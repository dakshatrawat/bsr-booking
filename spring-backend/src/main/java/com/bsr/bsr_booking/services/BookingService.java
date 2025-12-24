package com.bsr.bsr_booking.services;

import com.bsr.bsr_booking.dtos.BookingDTO;
import com.bsr.bsr_booking.dtos.Response;

public interface BookingService {

    Response getAllBookings();
    Response createBooking(BookingDTO bookingDTO);
    Response findBookingByReferenceNo(String  bookingReference);
    Response updateBooking(BookingDTO bookingDTO);
}
