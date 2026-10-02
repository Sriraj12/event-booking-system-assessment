# Event Booking System

## Overview
A production-ready event booking system that allows users to register, login, view an event's seat map, and book/cancel seats. Built as a comprehensive coding assessment for a Full Stack JavaScript Developer role.

## Features
- **User Authentication**: Secure email and password registration and login using JWT and bcrypt.
- **Event Display**: View a single event with exactly 100 seats in a dynamic UI.
- **Real-Time Seat Status**: Seats are displayed as AVAILABLE, SELECTED, or BOOKED.
- **Multiple Seat Selection**: Users can select and book multiple available seats at once.
- **Concurrency Handling**: Strong database-level transaction guarantees ensure that two users cannot book the same seat at the exact same time.
- **Booking Management**: Users can view their own bookings and cancel active bookings, making seats available again.
- **Authorization**: Users can only view and manage their own bookings.

## Technology Stack
- **Frontend**: React.js, Vite, Tailwind CSS, React Router, Axios, Lucide React
- **Backend**: Node.js, Express.js, JSON Web Tokens (JWT), bcryptjs, Zod (Validation)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Testing**: Jest, Supertest

## Architecture
The application uses a separated frontend and backend architecture:
- **Backend**: RESTful JSON API. Business logic is handled in the `controllers` layer, while data access is handled by the Prisma ORM. Uses middleware for authentication and unified error handling.
- **Frontend**: A React Single Page Application (SPA). Uses context for global state (Authentication) and declarative components for routing and UI presentation.
- **Database**: A relational structure storing Users, Events, Seats, Bookings, and BookingSeats with proper foreign key relationships and cascading deletes.

## Project Structure
```
event-booking-system/
│
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar)
│   │   ├── pages/            # Page components (Home, Login, Register, MyBookings)
│   │   ├── context/          # React Context (AuthContext)
│   │   ├── App.jsx           # Main App component & Routing
│   │   └── main.jsx          # Entry point
│   └── package.json
│
├── backend/                  # Express application
│   ├── src/
│   │   ├── controllers/      # Route handlers & Business logic
│   │   ├── routes/           # API routes definition
│   │   ├── middleware/       # Auth & Error handling middlewares
│   │   ├── utils/            # Prisma instance
│   │   ├── app.js            # Express app configuration
│   │   └── server.js         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema & models
│   │   └── seed.js           # Database seeding script
│   ├── tests/                # Jest integration tests
│   └── package.json
│
├── docker-compose.yml        # PostgreSQL database setup
└── README.md
```

## Prerequisites
- Node.js (v18+)
- Docker and Docker Compose (if running Postgres via Docker)
- npm or yarn

## Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

## Environment Variables

### Backend
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL="postgresql://admin:password@localhost:5432/event_booking?schema=public"
JWT_SECRET="super-secret-key-for-assessment"
```

## Database Setup

1. Start the PostgreSQL database using Docker:
   ```bash
   docker compose up -d
   ```
2. Navigate to the backend folder and push the database schema:
   ```bash
   cd backend
   npx prisma db push
   ```
3. Generate the Prisma Client:
   ```bash
   npx prisma generate
   ```
4. Seed the database with the event and 100 seats:
   ```bash
   npm run prisma:seed
   ```
   *(Ensure you have `"prisma": { "seed": "node prisma/seed.js" }` in package.json or simply run `node prisma/seed.js`)*

## Running the Application

### Start Backend
```bash
cd backend
npm run dev
```
*(Runs on http://localhost:5000)*

### Start Frontend
```bash
cd frontend
npm run dev
```
*(Runs on http://localhost:5173 by default)*

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Authenticate and receive a JWT
- `GET /api/auth/me`: Get current authenticated user details

### Events & Seats
- `GET /api/events/:eventId`: Get details of a specific event
- `GET /api/events/:eventId/seats`: Get all 100 seats and their statuses

### Bookings
- `POST /api/bookings`: Create a new booking
- `GET /api/bookings`: Retrieve all bookings for the authenticated user
- `GET /api/bookings/:bookingId`: Retrieve a specific booking
- `POST /api/bookings/:bookingId/cancel`: Cancel a booking

## Authentication Approach
The system uses JSON Web Tokens (JWT) for stateless authentication. 
- Passwords are securely hashed with `bcryptjs` before storage.
- On successful login, the server issues a JWT.
- The React frontend stores the JWT in `localStorage` and includes it in the `Authorization: Bearer <token>` header for all authenticated requests using an Axios interceptor/default configuration.

## Booking Flow
1. User logs in.
2. User browses to the Home page to view the seat map.
3. User selects one or more `AVAILABLE` seats.
4. User clicks "Book Tickets".
5. A POST request is sent to the backend with `eventId` and `seatIds`.
6. The backend validates the request, locks the rows, checks availability, creates the booking, updates seat statuses, and commits the transaction.
7. User receives a success confirmation and the UI updates to show the seats as `BOOKED`.

## Concurrency / Duplicate Booking Handling
Preventing two users from booking the same seat at the exact same time is handled using **Database Transactions**. 
- In the `POST /api/bookings` route, we use `prisma.$transaction`.
- Inside the transaction, we fetch the seats to verify their availability. 
- If any requested seat is not `AVAILABLE`, we throw an error which forces the transaction to **ROLLBACK**, returning a `409 Conflict`.
- Once verified, the booking is created, and the seats are updated to `BOOKED` within the same atomic transaction. 
- The database schema also includes a unique constraint `@@unique([eventId, seatNumber])` to ensure data consistency.

## Cancellation
When a user cancels a booking:
- The system verifies the user owns the booking.
- A database transaction is used to atomically mark the booking `status` as `CANCELLED`, set the `cancelledAt` timestamp, and update the associated seats' `status` back to `AVAILABLE`.
- Once cancelled, other users immediately see these seats as available and can book them.

## Testing
The application uses Jest and Supertest for backend API testing.
```bash
cd backend
npm test
```

## Test Scenarios
Included tests cover:
- User registration and login
- Invalid credentials & Unauthorized access
- Retrieving event and seat details
- Successful booking & Unauthorized booking
- Booking an already booked seat
- Retrieving own bookings & Preventing access to other users' bookings
- Canceling a booking and ensuring seats become available
- **Concurrency Test**: Firing two concurrent booking requests for the same seat using two different users. Verifies that only one request succeeds (HTTP 201) while the other fails with a conflict (HTTP 409).

## Assumptions
- There is only 1 event, and we use ID `1` for the assessment.
- UI seat selection state (`SELECTED`) is strictly frontend local state.
- No roles (Admin/User) are needed beyond a standard authenticated user.

## Limitations / Trade-offs
- **SQLite vs Postgres in specific environments**: The instructions assumed PostgreSQL, but if testing without Docker, standard local setups apply. The Prisma schema is set to PostgreSQL.
- **Refresh Tokens**: To keep the assessment scope reasonable, short-lived access tokens with a refresh token rotation strategy are omitted in favor of a standard 1-day JWT token.
- **Email/SMS**: Skipped as optional to prioritize robust concurrency and core functionality.

## AI Tools Used
AI assistance (Google Deepmind Antigravity / Gemini) was used during development to:
- Scaffold the directory structure and initial files rapidly.
- Generate Prisma schema definitions and standard Express boilerplate.
- Draft UI components using Tailwind CSS classes.
- Write repetitive test assertions in Jest.
All concurrency logic and architecture design was driven by the strict requirements outlined in the assessment PDF.
