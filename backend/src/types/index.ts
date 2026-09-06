import { UserRole, AvailabilityStatus, AppointmentStatus } from '@prisma/client';

// ─── AUTH ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}

// ─── USER ────────────────────────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  phone: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
}

// ─── SALON ───────────────────────────────────────────────────────────────────

export interface SalonWithDistance {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  photoUrl?: string | null;
  photos: string[];
  openTime: string;
  closeTime: string;
  workingDays: number[];
  distance?: number; // km
  averageRating?: number;
  reviewCount?: number;
  barbers: BarberWithAvailability[];
}

// ─── BARBER ──────────────────────────────────────────────────────────────────

export interface BarberWithAvailability {
  id: string;
  name: string;
  bio?: string | null;
  photoUrl?: string | null;
  experience: number;
  specialties: string[];
  availability?: {
    status: AvailabilityStatus;
    queueCount: number;
    maxQueueSize: number;
    estimatedWaitMins: number;
  } | null;
  services: ServicePublic[];
  averageRating?: number;
  reviewCount?: number;
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────

export interface ServicePublic {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMins: number;
}

// ─── APPOINTMENT ─────────────────────────────────────────────────────────────

export interface AppointmentWithDetails {
  id: string;
  slotTime: Date;
  status: AppointmentStatus;
  totalPrice: number;
  notes?: string | null;
  createdAt: Date;
  barber: {
    id: string;
    name: string;
    photoUrl?: string | null;
    salon: {
      id: string;
      name: string;
      address: string;
    };
  };
  services: Array<{
    service: { id: string; name: string };
    price: number;
    durationMins: number;
  }>;
}

// ─── REAL-TIME EVENTS ────────────────────────────────────────────────────────

export interface QueueUpdateEvent {
  barberId: string;
  salonId: string;
  status: AvailabilityStatus;
  queueCount: number;
  estimatedWaitMins: number;
}

export interface AppointmentUpdateEvent {
  appointmentId: string;
  status: AppointmentStatus;
  barberId: string;
  userId: string;
}

// ─── API RESPONSES ───────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── QUERY PARAMS ────────────────────────────────────────────────────────────

export interface NearbyQuery {
  lat: number;
  lng: number;
  radius?: number; // km, default 5
  status?: AvailabilityStatus;
  minRating?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

// ─── SOCKET ROOMS ────────────────────────────────────────────────────────────

export const SOCKET_ROOMS = {
  salon: (salonId: string) => `salon:${salonId}`,
  barber: (barberId: string) => `barber:${barberId}`,
  user: (userId: string) => `user:${userId}`,
  city: (city: string) => `city:${city}`,
} as const;

export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_SALON: 'join:salon',
  LEAVE_SALON: 'leave:salon',
  JOIN_CITY: 'join:city',

  // Server → Client
  QUEUE_UPDATE: 'queue:update',
  AVAILABILITY_UPDATE: 'availability:update',
  APPOINTMENT_UPDATE: 'appointment:update',
  NEW_BOOKING: 'booking:new',
} as const;
