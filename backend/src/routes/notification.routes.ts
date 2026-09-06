import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserNotifications,
  markAllRead,
  markNotificationRead,
} from '../services/notification.service';
import { prisma } from '../config/database';

const router = Router();

// ─── GET MY NOTIFICATIONS ─────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await getUserNotifications(req.user!.userId, page);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── MARK ALL READ ────────────────────────────────────────────────────────────

router.post('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await markAllRead(req.user!.userId);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── MARK ONE READ ────────────────────────────────────────────────────────────

router.patch('/:notificationId/read', authenticate, async (req: Request, res: Response) => {
  try {
    await markNotificationRead(req.params.notificationId, req.user!.userId);
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── UPDATE FCM TOKEN ─────────────────────────────────────────────────────────

router.post('/fcm-token', authenticate, async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: 'FCM token required' });
  }
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { fcmToken: token },
    });
    return res.json({ success: true, message: 'FCM token updated' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
