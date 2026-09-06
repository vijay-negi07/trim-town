import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// ─── GET MY BARBER PROFILE ────────────────────────────────────────────────────

router.get('/me', authenticate, requireRole('BARBER'), async (req: Request, res: Response) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { userId: req.user!.userId },
      include: {
        salon: true,
        services: { where: { isActive: true } },
        availability: {
          include: {
            queueEntries: { orderBy: { position: 'asc' } },
          },
        },
        reviews: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { appointments: true, reviews: true } },
      },
    });

    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barber profile not found' });
    }

    const avgRating =
      barber.reviews.length > 0
        ? barber.reviews.reduce((s, r) => s + r.rating, 0) / barber.reviews.length
        : null;

    return res.json({
      success: true,
      data: { ...barber, averageRating: avgRating },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CREATE BARBER PROFILE ────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  requireRole('BARBER'),
  [
    body('salonId').isUUID(),
    body('name').isLength({ min: 2, max: 100 }),
    body('experience').isInt({ min: 0, max: 50 }),
    body('specialties').isArray(),
    body('bio').optional().isLength({ max: 500 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      // Check if barber profile already exists
      const existing = await prisma.barber.findUnique({
        where: { userId: req.user!.userId },
      });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Barber profile already exists' });
      }

      const barber = await prisma.barber.create({
        data: {
          userId: req.user!.userId,
          salonId: req.body.salonId,
          name: req.body.name,
          bio: req.body.bio,
          experience: req.body.experience,
          specialties: req.body.specialties,
        },
        include: { salon: true, services: true },
      });

      // Create default availability (closed)
      await prisma.availability.create({
        data: { barberId: barber.id, status: 'CLOSED', queueCount: 0 },
      });

      return res.status(201).json({ success: true, data: barber });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─── UPDATE BARBER PROFILE ────────────────────────────────────────────────────

router.put(
  '/me',
  authenticate,
  requireRole('BARBER'),
  [
    body('name').optional().isLength({ min: 2, max: 100 }),
    body('bio').optional().isLength({ max: 500 }),
    body('experience').optional().isInt({ min: 0, max: 50 }),
    body('specialties').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const barber = await prisma.barber.update({
        where: { userId: req.user!.userId },
        data: {
          ...(req.body.name && { name: req.body.name }),
          ...(req.body.bio !== undefined && { bio: req.body.bio }),
          ...(req.body.experience !== undefined && { experience: req.body.experience }),
          ...(req.body.specialties && { specialties: req.body.specialties }),
        },
        include: { salon: true, services: { where: { isActive: true } } },
      });

      return res.json({ success: true, data: barber });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─── SERVICES CRUD ────────────────────────────────────────────────────────────

// Get all services for a barber
router.get('/:barberId/services', async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: { barberId: req.params.barberId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: services });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Add a service
router.post(
  '/me/services',
  authenticate,
  requireRole('BARBER'),
  [
    body('name').isLength({ min: 2, max: 100 }),
    body('price').isFloat({ min: 1 }),
    body('durationMins').isInt({ min: 5, max: 300 }),
    body('description').optional().isLength({ max: 300 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const barber = await prisma.barber.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!barber) {
        return res.status(404).json({ success: false, error: 'Barber profile not found' });
      }

      const service = await prisma.service.create({
        data: {
          barberId: barber.id,
          name: req.body.name,
          description: req.body.description,
          price: req.body.price,
          durationMins: req.body.durationMins,
        },
      });

      return res.status(201).json({ success: true, data: service });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Update a service
router.put(
  '/me/services/:serviceId',
  authenticate,
  requireRole('BARBER'),
  async (req: Request, res: Response) => {
    try {
      const barber = await prisma.barber.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!barber) {
        return res.status(404).json({ success: false, error: 'Barber profile not found' });
      }

      // Verify service belongs to this barber
      const existing = await prisma.service.findFirst({
        where: { id: req.params.serviceId, barberId: barber.id },
      });
      if (!existing) {
        return res.status(403).json({ success: false, error: 'Service not found' });
      }

      const service = await prisma.service.update({
        where: { id: req.params.serviceId },
        data: {
          ...(req.body.name && { name: req.body.name }),
          ...(req.body.description !== undefined && { description: req.body.description }),
          ...(req.body.price !== undefined && { price: req.body.price }),
          ...(req.body.durationMins !== undefined && { durationMins: req.body.durationMins }),
          ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        },
      });

      return res.json({ success: true, data: service });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Delete (deactivate) a service
router.delete(
  '/me/services/:serviceId',
  authenticate,
  requireRole('BARBER'),
  async (req: Request, res: Response) => {
    try {
      const barber = await prisma.barber.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!barber) {
        return res.status(404).json({ success: false, error: 'Barber profile not found' });
      }

      await prisma.service.updateMany({
        where: { id: req.params.serviceId, barberId: barber.id },
        data: { isActive: false },
      });

      return res.json({ success: true, message: 'Service removed' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─── BARBER EARNINGS ──────────────────────────────────────────────────────────

router.get('/me/earnings', authenticate, requireRole('BARBER'), async (req: Request, res: Response) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barber profile not found' });
    }

    const period = (req.query.period as string) || 'today';
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default: // today
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    const [stats, appointments] = await Promise.all([
      prisma.appointment.aggregate({
        where: {
          barberId: barber.id,
          status: 'COMPLETED',
          slotTime: { gte: startDate },
        },
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.appointment.findMany({
        where: {
          barberId: barber.id,
          status: 'COMPLETED',
          slotTime: { gte: startDate },
        },
        include: {
          services: { include: { service: { select: { name: true } } } },
          user: { select: { name: true } },
        },
        orderBy: { slotTime: 'desc' },
        take: 20,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        period,
        totalRevenue: stats._sum.totalPrice || 0,
        totalCustomers: stats._count,
        avgPerCustomer: stats._count > 0
          ? (stats._sum.totalPrice || 0) / stats._count
          : 0,
        appointments,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUBLIC BARBER PROFILE ────────────────────────────────────────────────────

router.get('/:barberId', async (req: Request, res: Response) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: req.params.barberId },
      include: {
        salon: true,
        services: { where: { isActive: true } },
        availability: true,
        reviews: {
          where: { isPublished: true },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barber not found' });
    }

    const avgRating =
      barber.reviews.length > 0
        ? barber.reviews.reduce((s, r) => s + r.rating, 0) / barber.reviews.length
        : null;

    return res.json({
      success: true,
      data: { ...barber, averageRating: avgRating },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
