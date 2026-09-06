import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// ─── PRISMA ──────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// ─── REDIS ───────────────────────────────────────────────────────────────────

export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('[Redis] Error:', err));
redis.on('connect', () => console.log('[Redis] Connected'));

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

// ─── REDIS KEYS ──────────────────────────────────────────────────────────────

export const CACHE_KEYS = {
  barberAvailability: (barberId: string) => `availability:${barberId}`,
  salonBarbers: (salonId: string) => `salon:barbers:${salonId}`,
  nearbySalons: (lat: number, lng: number, radius: number) =>
    `nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`,
  otpAttempts: (phone: string) => `otp:attempts:${phone}`,
  refreshToken: (userId: string) => `refresh:${userId}`,
  sessionBlacklist: (jti: string) => `blacklist:${jti}`,
} as const;

export const CACHE_TTL = {
  availability: 5,        // 5 seconds — near real-time
  salonList: 30,          // 30 seconds
  nearbyResults: 60,      // 1 minute
  otp: 300,               // 5 minutes
  refreshToken: 2592000,  // 30 days
} as const;
