import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getAvailability,
  updateAvailabilityStatus,
  addToQueue,
  removeFromQueue,
  markNextCustomerDone,
} from '../services/queue.service';
import { prisma } from '../config/database';
import { AvailabilityStatus } from '@prisma/client';

const router = Router();

// ─── GET BARBER AVAILABILITY ──────────────────────────────────────────────────

router.get('/barber/:barberId', async (req: Request, res: Response) => {
  try {
    const avail = await getAvailability(req.params.barberId);
    if (!avail) return res.status(404).json({ success: false, error: 'Barber not found' });
    return res.json({ success: true, data: avail });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── UPDATE STATUS (Barber only) ──────────────────────────────────────────────

router.put(
  '/barber/:barberId/status',
  authenticate,
  requireRole('BARBER', 'ADMIN'),
  [body('status').isIn(['AVAILABLE', 'BUSY', 'CLOSED'])],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      // Verify the barber belongs to this user
      const barber = await prisma.barber.findFirst({
        where: { id: req.params.barberId, userId: req.user!.userId },
        include: { salon: true },
      });

      if (!barber && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Not your barber profile' });
      }

      const salonId = barber?.salonId || req.body.salonId;
      await updateAvailabilityStatus(
        req.params.barberId,
        req.body.status as AvailabilityStatus,
        salonId
      );

      return res.json({ success: true, message: `Status updated to ${req.body.status}` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─── ADD TO QUEUE ─────────────────────────────────────────────────────────────

router.post(
  '/barber/:barberId/join',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const result = await addToQueue(
        req.params.barberId,
        req.user!.userId,
        user.name,
        req.body.appointmentId
      );

      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const status = err.message.includes('full') || err.message.includes('closed') ? 400 : 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  }
);

// ─── REMOVE FROM QUEUE / MARK DONE ───────────────────────────────────────────

router.delete(
  '/barber/:barberId/entry/:entryId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      await removeFromQueue(req.params.barberId, req.params.entryId);
      return res.json({ success: true, message: 'Removed from queue' });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
);

// ─── MARK NEXT DONE (Barber shortcut) ────────────────────────────────────────

router.post(
  '/barber/:barberId/done',
  authenticate,
  requireRole('BARBER'),
  async (req: Request, res: Response) => {
    try {
      await markNextCustomerDone(req.params.barberId);
      return res.json({ success: true, message: 'Next customer marked as done' });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
);

export default router;
