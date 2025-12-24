# BSR Booking

Hotel booking website built with Angular and Spring Boot.

## Tech Used

Frontend: Angular, TypeScript
Backend: Spring Boot, Java, MySQL
Payment: Razorpay
Email: Spring Mail

## Features

- User login and registration
- Room search and booking
- Payment integration
- Email notifications
- Admin panel for managing rooms and bookings
- Hotel image management

## Setup

### Backend

1. Go to spring-backend folder
2. Update database settings in application.properties
3. Run: ./mvnw spring-boot:run
4. Backend runs on http://localhost:9090

### Frontend

1. Go to angular-frontend folder
2. Run: npm install
3. Run: ng serve
4. Frontend runs on http://localhost:4200

## API

- /api/auth/** - Authentication
- /api/rooms/** - Room operations
- /api/bookings/** - Booking operations
- /api/payments/** - Payment processing
- /api/hotel-images/** - Image management
