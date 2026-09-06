import { prisma } from '../config/database';

// ─── NOTIFICATION TYPES ───────────────────────────────────────────────────────

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'QUEUE_POSITION'
  | 'READY_NOW'
  | 'REVIEW_REQUEST'
  | 'PROMO';

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
}

// ─── SEND NOTIFICATION ────────────────────────────────────────────────────────

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const { userId, title, body, type, data } = params;

  // Store in DB always (in-app notification centre)
  await prisma.notification.create({
    data: { userId, title, body, type, data: data || {} },
  });

  // Get user FCM token
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) return;

  // Send via Firebase Cloud Messaging
  // In production: initialize firebase-admin and call messaging().send()
  // Example:
  // const message = {
  //   token: user.fcmToken,
  //   notification: { title, body },
  //   data: data || {},
  //   android: { priority: 'high' as const },
  //   apns: { payload: { aps: { sound: 'default' } } },
  // };
  // await admin.messaging().send(message);

  console.log(`[FCM] → ${userId}: ${title} — ${body}`);
}

// ─── CONVENIENCE SENDERS ──────────────────────────────────────────────────────

export async function notifyBookingConfirmed(params: {
  userId: string;
  salonName: string;
  slotTime: Date;
  appointmentId: string;
}): Promise<void> {
  const { userId, salonName, slotTime, appointmentId } = params;
  const time = slotTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  await sendNotification({
    userId,
    title: '✅ Booking confirmed!',
    body: `Your slot at ${salonName} is confirmed for ${time}`,
    type: 'BOOKING_CONFIRMED',
    data: { appointmentId },
  });
}

export async function notifyBookingCancelled(params: {
  userId: string;
  salonName: string;
  appointmentId: string;
}): Promise<void> {
  await sendNotification({
    userId,
    title: '❌ Booking cancelled',
    body: `Your appointment at ${params.salonName} has been cancelled`,
    type: 'BOOKING_CANCELLED',
    data: { appointmentId: params.appointmentId },
  });
}

export async function notifyQueuePosition(params: {
  userId: string;
  salonName: string;
  position: number;
  waitMins: number;
}): Promise<void> {
  const { userId, salonName, position, waitMins } = params;
  await sendNotification({
    userId,
    title: `You're #${position} in queue`,
    body: `~${waitMins} min wait at ${salonName}`,
    type: 'QUEUE_POSITION',
    data: { position: String(position), waitMins: String(waitMins) },
  });
}

export async function notifyReadyNow(params: {
  userId: string;
  barberName: string;
  salonName: string;
}): Promise<void> {
  await sendNotification({
    userId: params.userId,
    title: `🪒 ${params.barberName} is ready for you!`,
    body: `Head to ${params.salonName} now — it's your turn`,
    type: 'READY_NOW',
  });
}

export async function notifyReviewRequest(params: {
  userId: string;
  salonName: string;
  appointmentId: string;
}): Promise<void> {
  await sendNotification({
    userId: params.userId,
    title: '⭐ How was your visit?',
    body: `Rate your experience at ${params.salonName}`,
    type: 'REVIEW_REQUEST',
    data: { appointmentId: params.appointmentId },
  });
}

// ─── GET USER NOTIFICATIONS ───────────────────────────────────────────────────

export async function getUserNotifications(userId: string, page = 1) {
  const pageSize = 20;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, total, page, pageSize, unreadCount };
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}
