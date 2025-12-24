package com.bsr.bsr_booking.services;

import com.bsr.bsr_booking.dtos.LoginRequest;
import com.bsr.bsr_booking.dtos.RegistrationRequest;
import com.bsr.bsr_booking.dtos.Response;
import com.bsr.bsr_booking.dtos.UserDTO;
import com.bsr.bsr_booking.entities.User;

public interface UserService {

    Response registerUser(RegistrationRequest registrationRequest);
    Response loginUser(LoginRequest loginRequest);
    Response getAllUsers();
    Response getOwnAccountDetails();
    User getCurrentLoggedInUser();
    Response updateOwnAccount(UserDTO userDTO);
    Response deleteOwnAccount();
    Response getMyBookingHistory();
}
