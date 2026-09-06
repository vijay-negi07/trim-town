# TrimTown — Complete Technical Documentation

> **Your barber. Ready when you are.**
> Hyper-local barber & salon discovery with real-time queue management.
> Launch market: Haldwani, Uttarakhand, India.

---

## Project Structure

```
trimtown/
├── backend/                    # Node.js + TypeScript API server
│   ├── prisma/
│   │   └── schema.prisma       # Full PostgreSQL schema (14 models)
│   └── src/
│       ├── index.ts            # Entry point — HTTP + WebSocket server
│       ├── app.ts              # Express app, middleware, routes
│       ├── config/
│       │   ├── database.ts     # Prisma + Redis clients & cache keys
│       │   └── socket.ts       # Socket.IO server with auth middleware
│       ├── middleware/
│       │   └── auth.ts         # JWT authenticate / requireRole / optionalAuth
│       ├── models/             # (Prisma-generated — no manual models needed)
│       ├── routes/
│       │   ├── auth.routes.ts          # POST /otp/send, /otp/verify, /logout
│       │   ├── salon.routes.ts         # GET /nearby, GET /:id, POST /
│       │   ├── queue.routes.ts         # GET/PUT availability, join/leave queue
│       │   ├── appointment.routes.ts   # CRUD appointments + available slots
│       │   └── admin.routes.ts         # Platform stats, salon verify, moderation
│       ├── services/
│       │   ├── auth.service.ts         # OTP generation, JWT issue/refresh
│       │   ├── queue.service.ts        # Real-time queue logic + Socket.IO broadcast
│       │   ├── salon.service.ts        # Geo-search (Haversine SQL), salon detail
│       │   └── appointment.service.ts  # Booking creation, slot management
│       ├── types/
│       │   └── index.ts        # All TypeScript interfaces + Socket event constants
│       └── seed.ts             # 5 Haldwani salons + test users
│
├── admin-dashboard/            # React + Tailwind admin panel
│   └── src/
│       ├── App.tsx             # Router, QueryClient, ProtectedRoute
│       ├── components/
│       │   ├── Layout.tsx      # Sidebar nav + top bar
│       │   └── ui.tsx          # MetricCard, Table, StatusBadge, Avatar, LiveDot
│       ├── pages/
│       │   ├── LoginPage.tsx   # OTP login for admins
│       │   ├── OverviewPage.tsx # Dashboard with charts + live metrics
│       │   ├── SalonsPage.tsx  # Salon management + one-click verify
│       │   ├── CustomersPage.tsx
│       │   ├── RevenuePage.tsx # GMV projections + monetization roadmap
│       │   ├── ReviewsPage.tsx # Moderation — publish/hide reviews
│       │   └── SettingsPage.tsx
│       └── services/
│           └── api.ts          # Axios instance + auth store (Zustand + persist)
│
└── flutter_app/               # Flutter customer + barber app
    └── lib/
        ├── main.dart           # App entry, splash screen, auth check
        ├── core/
        │   ├── constants/app_constants.dart  # URLs, colors, theme
        │   ├── models/models.dart            # Salon, Barber, Service, Appointment
        │   └── api/
        │       ├── api_service.dart          # Dio HTTP client with interceptors
        │       └── socket_service.dart       # Socket.IO real-time listener
        └── features/
            ├── auth/auth_screen.dart         # Phone + OTP login (6-box UI)
            ├── home/home_screen.dart         # Salon discovery + search
            ├── home/widgets/salon_card.dart  # StatusChip + SalonCard + Skeleton
            ├── salon/salon_detail_screen.dart # Service select, slot booking, confirmation
            └── queue/barber_queue_screen.dart # Barber dashboard — toggle/queue/earnings
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | https://nodejs.org |
| PostgreSQL | ≥ 15 | https://postgresql.org |
| Redis | ≥ 7 | https://redis.io |
| Flutter | ≥ 3.19 | https://flutter.dev |
| pnpm (optional) | latest | `npm i -g pnpm` |

---

## Backend Setup

### 1. Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/trimtown_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="change-this-in-production-use-32-char-random-string"
PORT=3000
NODE_ENV=development
```

### 2. Install & migrate

```bash
npm install
npx prisma db push        # Creates all tables
npm run db:seed           # Seeds 5 Haldwani salons + test users
npm run dev               # Starts dev server with hot reload
```

### 3. Verify

```
GET http://localhost:3000/health
→ { "status": "ok", "service": "TrimTown API" }
```

---

## Admin Dashboard Setup

```bash
cd admin-dashboard
npm install
npm run dev
# → http://localhost:5173
```

**Login**: Use phone `+919999999999` (seeded admin). Dev OTP prints to backend console.

---

## Flutter App Setup

```bash
cd flutter_app
flutter pub get
flutter run                # Runs on connected device/emulator
```

Update `lib/core/constants/app_constants.dart`:
```dart
// For Android emulator hitting local backend:
static const String baseUrl = 'http://10.0.2.2:3000/api';
static const String wsUrl  = 'http://10.0.2.2:3000';

// For iOS simulator:
static const String baseUrl = 'http://localhost:3000/api';
```

---

## API Reference

### Authentication

```
POST /api/auth/otp/send
Body: { "phone": "+919876543210" }
Response: { "message": "OTP sent", "devOtp": "123456" }  // devOtp in development only

POST /api/auth/otp/verify
Body: { "phone": "+919876543210", "otp": "123456", "name": "Rahul" }
Response: { "accessToken": "...", "refreshToken": "...", "user": { ... } }

POST /api/auth/token/refresh
Body: { "refreshToken": "..." }

POST /api/auth/logout          (authenticated)
GET  /api/auth/me              (authenticated)
```

### Salons

```
GET /api/salons/nearby?lat=29.2183&lng=79.5130&radius=5
→ Array of salons with barbers, availability, distance

GET /api/salons/:salonId
→ Full salon detail with all barbers and services

POST /api/salons              (BARBER/ADMIN)
Body: { name, address, area, lat, lng, phone, openTime, closeTime, workingDays[] }

POST /api/salons/:salonId/favorite   (authenticated)
→ { "favorited": true/false }

GET /api/salons/:salonId/reviews
```

### Queue (Real-Time)

```
GET  /api/queue/barber/:barberId
→ { status, queueCount, estimatedWaitMins, queue[] }

PUT  /api/queue/barber/:barberId/status    (BARBER)
Body: { "status": "AVAILABLE" | "BUSY" | "CLOSED" }

POST /api/queue/barber/:barberId/join      (authenticated customer)
Body: { "appointmentId": "uuid" }  // optional
→ { "position": 2, "estimatedWaitMins": 40 }

DELETE /api/queue/barber/:barberId/entry/:entryId

POST /api/queue/barber/:barberId/done      (BARBER)
→ Removes first customer from queue, decrements count
```

### Appointments

```
GET  /api/appointments                         (authenticated)
GET  /api/appointments/barber/:barberId        (authenticated)
GET  /api/appointments/slots/:barberId?date=2024-03-15
→ Array of ISO8601 datetime strings (available 30-min slots)

POST /api/appointments
Body: { barberId, serviceIds[], slotTime, notes? }
→ Full appointment with barber + services

PATCH /api/appointments/:id/status
Body: { "status": "CANCELLED" | "COMPLETED" | ... }
```

### Admin (ADMIN role only)

```
GET   /api/admin/stats
→ { totalUsers, activeSalons, todayAppointments, todayRevenue, pendingVerifications }

GET   /api/admin/salons?status=PENDING&page=1
PATCH /api/admin/salons/:salonId/verify
Body: { "status": "VERIFIED" | "REJECTED" }

GET   /api/admin/users?page=1
PATCH /api/admin/reviews/:reviewId
Body: { "isPublished": false }
```

---

## WebSocket Events

Connect: `ws://localhost:3000` with `auth: { token: "JWT" }`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join:salon` | `salonId: string` | Subscribe to salon queue updates |
| `leave:salon` | `salonId: string` | Unsubscribe |
| `join:city` | `city: string` | Subscribe to city-wide updates |

### Server → Client

| Event | Payload | Trigger |
|-------|---------|---------|
| `queue:update` | `{ barberId, salonId, status, queueCount, estimatedWaitMins }` | Any queue change |
| `availability:update` | Same as above | Status toggle by barber |
| `appointment:update` | `{ appointmentId, status, barberId, userId }` | Booking confirmed/cancelled |
| `booking:new` | `{ appointmentId, customerName, slotTime, services[] }` | New booking (barber room) |

---

## Database Schema (Summary)

| Table | Key Fields |
|-------|-----------|
| `users` | id, phone (unique), name, role (CUSTOMER/BARBER/ADMIN) |
| `salons` | id, name, lat/lng, verificationStatus, openTime, closeTime |
| `barbers` | id, userId (→ users), salonId (→ salons), experience |
| `services` | id, barberId, name, price, durationMins |
| `availability` | id, barberId (unique), status, queueCount, maxQueueSize |
| `queue_entries` | id, availabilityId, customerId, position, addedAt |
| `appointments` | id, userId, barberId, slotTime, status, totalPrice |
| `appointment_services` | appointmentId + serviceId junction |
| `reviews` | id, userId, barberId, appointmentId (unique), rating 1–5 |
| `favorite_salons` | userId + salonId (unique pair) |
| `otp_verifications` | phone, otp, expiresAt, verified |
| `notifications` | userId, title, body, type, isRead |

---

## Test Data (After Seeding)

| Role | Phone | OTP |
|------|-------|-----|
| Admin | +919999999999 | Printed to console |
| Customer 1 | +919800000001 | Printed to console |
| Customer 2 | +919800000002 | Printed to console |
| Barber (Raja) | +919876543210 | Printed to console |

**Seeded salons:**
1. Raja Barber Shop — Bhotiya Parao — AVAILABLE
2. Gents Galaxy Salon — Rampur Road — BUSY (2 in queue)
3. Modern Look Studio — Mall Road — AVAILABLE
4. Smart Cuts — Kathgodam Road — BUSY (3 in queue)
5. Shahi Saloon — Haldwani Chowk — CLOSED

---

## Production Deployment

### Backend (AWS EC2 / Railway / Render)

```bash
npm run build
npm start

# With PM2:
pm2 start dist/index.js --name trimtown-api
pm2 save
```

Required production env vars to update:
- `NODE_ENV=production`
- `JWT_SECRET` — 32+ character random string
- `DATABASE_URL` — Production PostgreSQL (AWS RDS / Supabase)
- `REDIS_URL` — Production Redis (ElastiCache / Upstash)
- `TWILIO_*` — Real SMS OTP (replace dev console logging)
- `FIREBASE_*` — For FCM push notifications
- `AWS_*` — S3 for photo uploads

### Admin Dashboard (Vercel / Netlify)

```bash
npm run build
# Deploy dist/ folder
# Set VITE_API_URL env var
```

### Flutter App

```bash
# Android
flutter build apk --release

# iOS
flutter build ipa
```

---

## Phase Roadmap

| Phase | Timeline | Key Features |
|-------|----------|-------------|
| **MVP (Now)** | Weeks 1–10 | OTP login, salon discovery, real-time queue, appointment booking, reviews |
| **Phase 2** | Month 4–5 | Razorpay payments, in-app wallet, coupons, loyalty points, push notifications |
| **Phase 3** | Month 6–8 | Google Maps integration, live navigation, AI recommendations, analytics |
| **Phase 4** | Month 9–12 | Home service booking, live tracking, in-app chat, subscription plans |

---

## Monetization Timeline

| Phase | Stream | Model | Target |
|-------|--------|-------|--------|
| 1 (Now) | Free | Build supply side | 50 salons |
| 2 | Subscriptions | ₹299–₹999/month/salon | ₹1.5L MRR |
| 3 | Commission | 5–8% per booking | ₹2.3L MRR |
| 4 | Home services | 10–15% per visit | ₹5L+ MRR |

**Unit economics at 75 salons × 17 bookings/day × ₹100 × 30 days = ₹38L GMV → ₹2.3L revenue at 6%**

---

*TrimTown © 2024 · Built for Haldwani, scaling to Uttarakhand.*
