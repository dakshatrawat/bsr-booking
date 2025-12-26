# BSR Booking

Hotel booking website built with Angular and Spring Boot.

## Tech Used

Frontend: Angular, TypeScript
Backend: Spring Boot, Java, MySQL
Payment: Razorpay
Email: Spring Mail

## Features

- User login and registration
- Mobile-first responsive UI with consistent spacing scale
- Hamburger menu on mobile; back button hidden on mobile, shown on desktop
- Inline show/hide password toggle on all auth forms
- Room search and booking
- Payment integration
- Email notifications
- Admin panel for managing rooms and bookings
- Hotel image management

## Recent UI/UX updates

- Standardized global spacing, typography, and z-index tokens in `styles.css`.
- Mobile navbar converted to a hamburger menu with slide-down menu.
- Global content offset applied so pages start below the fixed navbar.
- Back button component available on desktop; intentionally hidden on mobile.
- Password inputs refactored to remove wrapper shadows and include eye toggle.
- Mobile home “Find Your Perfect Room” card width aligned with “Explore All Our Rooms”.

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
