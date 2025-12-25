package com.bsr.bsr_booking.config;

import com.bsr.bsr_booking.entities.User;
import com.bsr.bsr_booking.enums.UserRole;
import com.bsr.bsr_booking.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        initializeAdminUser();
    }

    private void initializeAdminUser() {
        String adminEmail = "dakshatrawat77@gmail.com";
        
        // Check if admin user already exists
        if (userRepository.findByEmail(adminEmail).isPresent()) {
            log.info("Admin user with email {} already exists. Skipping initialization.", adminEmail);
            return;
        }

        // Create admin user
        User adminUser = User.builder()
                .email(adminEmail)
                .password(passwordEncoder.encode("Dakshat@123"))
                .firstName("Admin")
                .lastName("User")
                .phoneNumber("0000000000")
                .role(UserRole.ADMIN)
                .isActive(Boolean.TRUE)
                .build();

        userRepository.save(adminUser);
        log.info("Admin user created successfully with email: {}", adminEmail);
    }
}

