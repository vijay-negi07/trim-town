import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import {
  createAppointment,
  getUserAppointments,
  getBarberAppointments,
  updateAppointmentStatus,
  getAvailableSlots,
} from '../services/appointment.service';
import { AppointmentStatus } from '@prisma/client';

const router = Router();

// ─── GET MY APPOINTMENTS ──────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as AppointmentStatus | undefined;
    const appointments = await getUserAppointments(req.user!.userId, status);
    return res.json({ success: true, data: appointments });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET BARBER SCHEDULE ──────────────────────────────────────────────────────

router.get('/barber/:barberId', authenticate, async (req: Request, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const appointments = await getBarberAppointments(req.params.barberId, date);
    return res.json({ success: true, data: appointments });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET AVAILABLE SLOTS ──────────────────────────────────────────────────────

router.get('/slots/:barberId', async (req: Request, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const slots = await getAvailableSlots(req.params.barberId, date);
    return res.json({ success: true, data: slots });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ─── CREATE APPOINTMENT ───────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  [
    body('barberId').isUUID(),
    body('serviceIds').isArray({ min: 1 }),
    body('serviceIds.*').isUUID(),
    body('slotTime').isISO8601(),
    body('notes').optional().isLength({ max: 500 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const appointment = await createAppointment({
        userId: req.user!.userId,
        barberId: req.body.barberId,
        serviceIds: req.body.serviceIds,
        slotTime: new Date(req.body.slotTime),
        notes: req.body.notes,
      });
      return res.status(201).json({ success: true, data: appointment });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
);

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

router.patch(
  '/:appointmentId/status',
  authenticate,
  [body('status').isIn(Object.values(AppointmentStatus))],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const appointment = await updateAppointmentStatus(
        req.params.appointmentId,
        req.body.status,
        req.user!.userId
      );
      return res.json({ success: true, data: appointment });
    } catch (err: any) {
      const status = err.message === 'Unauthorized' ? 403 : 400;
      return res.status(status).json({ success: false, error: err.message });
    }
  }
);

export default router;
