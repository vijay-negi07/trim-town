import { AvailabilityStatus } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { prisma, redis, CACHE_KEYS, CACHE_TTL } from '../config/database';
import { QueueUpdateEvent, SOCKET_EVENTS, SOCKET_ROOMS } from '../types';

let io: SocketServer | null = null;

export function setSocketServer(socketServer: SocketServer) {
  io = socketServer;
}

// ─── AVAILABILITY ─────────────────────────────────────────────────────────────

export async function getAvailability(barberId: string) {
  // Try cache first (ultra-fast for real-time reads)
  const cached = await redis.get(CACHE_KEYS.barberAvailability(barberId));
  if (cached) return JSON.parse(cached);

  const avail = await prisma.availability.findUnique({
    where: { barberId },
    include: {
      queueEntries: { orderBy: { position: 'asc' } },
      barber: { include: { salon: true } },
    },
  });

  if (!avail) return null;

  const result = {
    barberId,
    salonId: avail.barber.salonId,
    status: avail.status,
    queueCount: avail.queueCount,
    maxQueueSize: avail.maxQueueSize,
    estimatedWaitMins: calculateWaitTime(avail.queueCount),
    queue: avail.queueEntries,
  };

  await redis.setEx(CACHE_KEYS.barberAvailability(barberId), CACHE_TTL.availability, JSON.stringify(result));
  return result;
}

export async function updateAvailabilityStatus(
  barberId: string,
  status: AvailabilityStatus,
  salonId: string
) {
  const avail = await prisma.availability.upsert({
    where: { barberId },
    update: { status },
    create: { barberId, status, queueCount: 0 },
  });

  // Auto-close queue if barber goes offline
  if (status === AvailabilityStatus.CLOSED) {
    await prisma.queueEntry.deleteMany({
      where: { availabilityId: avail.id },
    });
    await prisma.availability.update({
      where: { barberId },
      data: { queueCount: 0 },
    });
  }

  // Invalidate cache & broadcast
  await redis.del(CACHE_KEYS.barberAvailability(barberId));
  await broadcastQueueUpdate(barberId, salonId);
}

// ─── QUEUE MANAGEMENT ─────────────────────────────────────────────────────────

export async function addToQueue(
  barberId: string,
  customerId: string,
  customerName: string,
  appointmentId?: string
) {
  const avail = await prisma.availability.findUnique({ where: { barberId } });
  if (!avail) throw new Error('Barber not found');
  if (avail.status === AvailabilityStatus.CLOSED) throw new Error('Barber is closed');
  if (avail.queueCount >= avail.maxQueueSize) throw new Error('Queue is full');

  const position = avail.queueCount + 1;

  const [entry] = await prisma.$transaction([
    prisma.queueEntry.create({
      data: {
        availabilityId: avail.id,
        customerId,
        customerName,
        position,
        appointmentId,
      },
    }),
    prisma.availability.update({
      where: { barberId },
      data: {
        queueCount: { increment: 1 },
        status: position >= avail.maxQueueSize
          ? AvailabilityStatus.BUSY
          : avail.status,
      },
    }),
  ]);

  await redis.del(CACHE_KEYS.barberAvailability(barberId));
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (barber) await broadcastQueueUpdate(barberId, barber.salonId);

  return { position, estimatedWaitMins: calculateWaitTime(position) };
}

export async function removeFromQueue(barberId: string, entryId: string) {
  const avail = await prisma.availability.findUnique({ where: { barberId } });
  if (!avail) throw new Error('Availability not found');

  const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.availabilityId !== avail.id) throw new Error('Queue entry not found');

  const removedPosition = entry.position;

  await prisma.$transaction([
    prisma.queueEntry.delete({ where: { id: entryId } }),
    // Re-number remaining entries
    prisma.$executeRaw`
      UPDATE queue_entries
      SET position = position - 1
      WHERE availability_id = ${avail.id}
        AND position > ${removedPosition}
    `,
    prisma.availability.update({
      where: { barberId },
      data: {
        queueCount: { decrement: 1 },
        status: avail.queueCount - 1 === 0
          ? AvailabilityStatus.AVAILABLE
          : avail.status,
      },
    }),
  ]);

  await redis.del(CACHE_KEYS.barberAvailability(barberId));
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (barber) await broadcastQueueUpdate(barberId, barber.salonId);
}

export async function markNextCustomerDone(barberId: string) {
  const avail = await prisma.availability.findUnique({
    where: { barberId },
    include: { queueEntries: { orderBy: { position: 'asc' }, take: 1 } },
  });

  if (!avail || avail.queueEntries.length === 0) {
    throw new Error('No customers in queue');
  }

  await removeFromQueue(barberId, avail.queueEntries[0].id);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function calculateWaitTime(queueCount: number, avgServiceMins = 20): number {
  return queueCount * avgServiceMins;
}

async function broadcastQueueUpdate(barberId: string, salonId: string) {
  if (!io) return;

  const avail = await getAvailability(barberId);
  if (!avail) return;

  const event: QueueUpdateEvent = {
    barberId,
    salonId,
    status: avail.status,
    queueCount: avail.queueCount,
    estimatedWaitMins: avail.estimatedWaitMins,
  };

  // Broadcast to everyone watching this salon
  io.to(SOCKET_ROOMS.salon(salonId)).emit(SOCKET_EVENTS.QUEUE_UPDATE, event);
  io.to(SOCKET_ROOMS.barber(barberId)).emit(SOCKET_EVENTS.QUEUE_UPDATE, event);
}
