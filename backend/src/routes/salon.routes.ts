import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth';
import { getNearbySalons, getSalonById } from '../services/salon.service';
import { prisma } from '../config/database';

const router = Router();

// ─── GET NEARBY SALONS ────────────────────────────────────────────────────────

router.get(
  '/nearby',
  optionalAuth,
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isFloat({ min: 0.1, max: 50 }),
    query('minRating').optional().isFloat({ min: 1, max: 5 }),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const salons = await getNearbySalons({
        lat: parseFloat(req.query.lat as string),
        lng: parseFloat(req.query.lng as string),
        radius: req.query.radius ? parseFloat(req.query.radius as string) : 5,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
      });

      return res.json({ success: true, data: salons });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─── GET SALON BY ID ──────────────────────────────────────────────────────────

router.get('/:salonId', async (req: Request, res: Response) => {
  try {
    const salon = await getSalonById(req.params.salonId);
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });
    return res.json({ success: true, data: salon });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CREATE SALON (Barber/Admin) ──────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  requireRole('BARBER', 'ADMIN'),
  [
    body('name').isLength({ min: 2, max: 100 }),
    body('address').isLength({ min: 5 }),
    body('area').isLength({ min: 2 }),
    body('lat').isFloat({ min: 18, max: 37 }), // India bounds
    body('lng').isFloat({ min: 68, max: 98 }),
    body('phone').matches(/^\+?[1-9]\d{9,14}$/),
    body('openTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('closeTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('workingDays').isArray(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const salon = await prisma.salon.create({
        data: {
          ...req.body,
          ownerName: req.body.ownerName || 'Owner',
          verificationStatus: 'PENDING',
        },
      });
      return res.status(201).json({ success: true, data: salon });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─── GET SALON REVIEWS ────────────────────────────────────────────────────────

router.get('/:salonId/reviews', async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        barber: { salonId: req.params.salonId },
        isPublished: true,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        barber: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── FAVORITE / UNFAVORITE ────────────────────────────────────────────────────

router.post('/:salonId/favorite', authenticate, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.favoriteSalon.findUnique({
      where: { userId_salonId: { userId: req.user!.userId, salonId: req.params.salonId } },
    });

    if (existing) {
      await prisma.favoriteSalon.delete({ where: { id: existing.id } });
      return res.json({ success: true, data: { favorited: false } });
    } else {
      await prisma.favoriteSalon.create({
        data: { userId: req.user!.userId, salonId: req.params.salonId },
      });
      return res.json({ success: true, data: { favorited: true } });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
