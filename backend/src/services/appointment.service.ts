import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppointmentWithDetails } from '../types';
import { addToQueue } from './queue.service';
import { Server as SocketServer } from 'socket.io';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../types';

let io: SocketServer | null = null;
export function setSocketServer(s: SocketServer) { io = s; }

// ─── CREATE APPOINTMENT ───────────────────────────────────────────────────────

export async function createAppointment(params: {
  userId: string;
  barberId: string;
  serviceIds: string[];
  slotTime: Date;
  notes?: string;
}): Promise<AppointmentWithDetails> {
  const { userId, barberId, serviceIds, slotTime, notes } = params;

  // Validate services belong to barber
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, barberId, isActive: true },
  });

  if (services.length !== serviceIds.length) {
    throw new Error('One or more services are invalid');
  }

  // Check slot is not already taken
  const conflict = await prisma.appointment.findFirst({
    where: {
      barberId,
      slotTime,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
  });
  if (conflict) throw new Error('This time slot is already booked');

  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

  const appointment = await prisma.appointment.create({
    data: {
      userId,
      barberId,
      slotTime,
      totalPrice,
      notes,
      status: AppointmentStatus.CONFIRMED,
      services: {
        create: services.map((s) => ({
          serviceId: s.id,
          price: s.price,
          durationMins: s.durationMins,
        })),
      },
    },
    include: {
      barber: { include: { salon: true } },
      services: { include: { service: true } },
    },
  });

  // Add to live queue if booking is for today
  const today = new Date();
  const isToday =
    slotTime.getDate() === today.getDate() &&
    slotTime.getMonth() === today.getMonth() &&
    slotTime.getFullYear() === today.getFullYear();

  if (isToday) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      try {
        await addToQueue(barberId, userId, user.name, appointment.id);
      } catch {
        // Queue full — appointment still confirmed, customer will arrive on time
      }
    }
  }

  // Notify barber
  if (io) {
    io.to(SOCKET_ROOMS.barber(barberId)).emit(SOCKET_EVENTS.NEW_BOOKING, {
      appointmentId: appointment.id,
      customerName: (await prisma.user.findUnique({ where: { id: userId } }))?.name,
      slotTime,
      services: services.map((s) => s.name),
    });
  }

  return formatAppointment(appointment);
}

// ─── GET APPOINTMENTS ─────────────────────────────────────────────────────────

export async function getUserAppointments(
  userId: string,
  status?: AppointmentStatus
): Promise<AppointmentWithDetails[]> {
  const appointments = await prisma.appointment.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: {
      barber: { include: { salon: true } },
      services: { include: { service: true } },
    },
    orderBy: { slotTime: 'desc' },
  });

  return appointments.map(formatAppointment);
}

export async function getBarberAppointments(
  barberId: string,
  date?: Date
): Promise<AppointmentWithDetails[]> {
  const startOfDay = date ? new Date(date.setHours(0, 0, 0, 0)) : new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      slotTime: { gte: startOfDay, lt: endOfDay },
      status: { notIn: [AppointmentStatus.CANCELLED] },
    },
    include: {
      barber: { include: { salon: true } },
      services: { include: { service: true } },
      user: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { slotTime: 'asc' },
  });

  return appointments.map(formatAppointment);
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  actorId: string
): Promise<AppointmentWithDetails> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barber: true },
  });

  if (!appointment) throw new Error('Appointment not found');

  // Only barber or customer can update their own appointment
  if (appointment.userId !== actorId && appointment.barber.userId !== actorId) {
    throw new Error('Unauthorized');
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: {
      barber: { include: { salon: true } },
      services: { include: { service: true } },
    },
  });

  // Notify relevant parties
  if (io) {
    io.to(SOCKET_ROOMS.user(appointment.userId)).emit(SOCKET_EVENTS.APPOINTMENT_UPDATE, {
      appointmentId,
      status,
      barberId: appointment.barberId,
      userId: appointment.userId,
    });
  }

  return formatAppointment(updated);
}

// ─── AVAILABLE SLOTS ──────────────────────────────────────────────────────────

export async function getAvailableSlots(
  barberId: string,
  date: Date
): Promise<string[]> {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { salon: true },
  });
  if (!barber) throw new Error('Barber not found');

  // Generate slots every 30 minutes during working hours
  const openHour = parseInt(barber.salon.openTime.split(':')[0]);
  const closeHour = parseInt(barber.salon.closeTime.split(':')[0]);

  const allSlots: Date[] = [];
  for (let h = openHour; h < closeHour; h++) {
    for (const m of [0, 30]) {
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      if (slot > new Date()) allSlots.push(slot);
    }
  }

  // Find taken slots
  const taken = await prisma.appointment.findMany({
    where: {
      barberId,
      slotTime: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(new Date(date).setDate(date.getDate() + 1)),
      },
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
    select: { slotTime: true },
  });

  const takenTimes = new Set(taken.map((t) => t.slotTime.toISOString()));

  return allSlots
    .filter((s) => !takenTimes.has(s.toISOString()))
    .map((s) => s.toISOString());
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatAppointment(a: any): AppointmentWithDetails {
  return {
    id: a.id,
    slotTime: a.slotTime,
    status: a.status,
    totalPrice: a.totalPrice,
    notes: a.notes,
    createdAt: a.createdAt,
    barber: {
      id: a.barber.id,
      name: a.barber.name,
      photoUrl: a.barber.photoUrl,
      salon: {
        id: a.barber.salon.id,
        name: a.barber.salon.name,
        address: a.barber.salon.address,
      },
    },
    services: (a.services || []).map((s: any) => ({
      service: { id: s.service.id, name: s.service.name },
      price: s.price,
      durationMins: s.durationMins,
    })),
  };
}
