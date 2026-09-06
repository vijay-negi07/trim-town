import jwt from 'jsonwebtoken';
import { prisma, redis, CACHE_KEYS, CACHE_TTL } from '../config/database';
import { JwtPayload, AuthResponse, UserPublic } from '../types';
import { UserRole } from '@prisma/client';

// ─── OTP ─────────────────────────────────────────────────────────────────────

function generateOtp(): string {
  // In production, use Twilio/MSG91 for real SMS
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(phone: string): Promise<{ message: string; devOtp?: string }> {
  // Rate limit: max 3 OTPs per phone per 10 minutes
  const attemptsKey = CACHE_KEYS.otpAttempts(phone);
  const attempts = await redis.get(attemptsKey);
  if (attempts && parseInt(attempts) >= 3) {
    throw new Error('Too many OTP requests. Try again in 10 minutes.');
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + CACHE_TTL.otp * 1000);

  // Invalidate previous OTPs for this phone
  await prisma.otpVerification.updateMany({
    where: { phone, verified: false },
    data: { verified: true }, // mark old ones as used
  });

  await prisma.otpVerification.create({
    data: { phone, otp, expiresAt },
  });

  // Track attempts
  await redis.setEx(attemptsKey, 600, ((parseInt(attempts || '0')) + 1).toString());

  // TODO: Send via Twilio in production
  // await twilioClient.messages.create({ to: phone, from: TWILIO_PHONE, body: `Your TrimTown OTP is ${otp}` })

  console.log(`[OTP] ${phone}: ${otp}`); // dev only

  return {
    message: 'OTP sent successfully',
    ...(process.env.NODE_ENV === 'development' ? { devOtp: otp } : {}),
  };
}

export async function verifyOtp(
  phone: string,
  otp: string,
  name?: string,
  role: UserRole = UserRole.CUSTOMER
): Promise<AuthResponse> {
  const record = await prisma.otpVerification.findFirst({
    where: { phone, verified: false, otp },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) throw new Error('Invalid OTP');
  if (record.expiresAt < new Date()) throw new Error('OTP expired');

  // Mark as verified
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  // Upsert user
  let user = await prisma.user.findUnique({ where: { phone } });
  const isNewUser = !user;

  if (isNewUser) {
    if (!name) throw new Error('Name is required for new users');
    user = await prisma.user.create({
      data: { phone, name, role },
    });
  }

  if (!user || !user.isActive) throw new Error('Account suspended');

  return generateAuthResponse(user as UserPublic & { id: string; role: UserRole });
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

function generateAuthResponse(user: { id: string; phone: string; name: string; email?: string | null; avatarUrl?: string | null; role: UserRole }): AuthResponse {
  const payload: JwtPayload = {
    userId: user.id,
    phone: user.phone,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  });

  // Store refresh token in Redis
  redis.setEx(CACHE_KEYS.refreshToken(user.id), CACHE_TTL.refreshToken, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  };
}

export async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { userId: string };
  } catch {
    throw new Error('Invalid refresh token');
  }

  const stored = await redis.get(CACHE_KEYS.refreshToken(payload.userId));
  if (stored !== refreshToken) throw new Error('Refresh token revoked');

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw new Error('User not found or suspended');

  return generateAuthResponse(user);
}

export async function logout(userId: string): Promise<void> {
  await redis.del(CACHE_KEYS.refreshToken(userId));
}
