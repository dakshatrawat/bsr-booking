# BSR Booking - Hotel Reservation System

A full-stack hotel booking platform built with Angular and Spring Boot, serving 100+ users with features including room search, availability management, real-time booking confirmations, and integrated payment processing.

## Tech Stack

### Frontend
- **Angular 19** - Frontend framework
- **TypeScript** - Programming language
- **RxJS** - Reactive programming
- **Bootstrap/CSS3** - Styling and responsive design

### Backend
- **Spring Boot** - Java framework
- **Spring Security** - Authentication & Authorization
- **JWT** - Token-based authentication
- **JPA/Hibernate** - ORM for database operations
- **MySQL** - Database
- **Razorpay** - Payment gateway integration
- **Spring Mail** - Email notifications

## Features

- 🔐 User Authentication & Authorization (JWT-based)
- 🏨 Room Management & Search
- 📅 Booking Management with Date Selection
- 💳 Razorpay Payment Gateway Integration
- 📧 Automated Email Notifications
- 🖼️ Hotel Image Management
- 👤 User Profile Management
- 📱 Responsive Mobile-First Design
- 🔒 Role-Based Access Control (Admin/Customer)

## Project Structure

```
project/
├── angular-frontend/     # Angular frontend application
│   ├── src/
│   │   └── app/
│   └── package.json
│
└── spring-backend/       # Spring Boot backend application
    ├── src/main/java/
    └── pom.xml
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- Angular CLI
- Java 17+
- Maven
- MySQL 8+

### Backend Setup

1. Navigate to backend directory:
```bash
cd spring-backend
```

2. Configure database in `src/main/resources/application.properties`

3. Run the application:
```bash
./mvnw spring-boot:run
```

Backend will run on `http://localhost:9090`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd angular-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
ng serve
```

Frontend will run on `http://localhost:4200`

## API Endpoints

- Authentication: `/api/auth/**`
- Rooms: `/api/rooms/**`
- Bookings: `/api/bookings/**`
- Payments: `/api/payments/**`
- Hotel Images: `/api/hotel-images/**`

## License

This project is private and proprietary.

## Author

Dakshat Rawat

