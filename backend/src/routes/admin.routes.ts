import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../config/database';

// ─── REVIEWS ROUTER ───────────────────────────────────────────────────────────

export const reviewRouter = Router();

reviewRouter.post(
  '/',
  authenticate,
  [
    body('barberId').isUUID(),
    body('appointmentId').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isLength({ max: 500 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      // Verify appointment belongs to this user and is completed
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: req.body.appointmentId,
          userId: req.user!.userId,
          status: 'COMPLETED',
        },
      });

      if (!appointment) {
        return res.status(400).json({
          success: false,
          error: 'Can only review completed appointments',
        });
      }

      const review = await prisma.review.create({
        data: {
          userId: req.user!.userId,
          barberId: req.body.barberId,
          appointmentId: req.body.appointmentId,
          rating: req.body.rating,
          comment: req.body.comment,
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      return res.status(201).json({ success: true, data: review });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Already reviewed this appointment' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

reviewRouter.get('/barber/:barberId', async (req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    where: { barberId: req.params.barberId, isPublished: true },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json({ success: true, data: reviews });
});

// ─── ADMIN ROUTER ─────────────────────────────────────────────────────────────

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('ADMIN'));

// Platform stats
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  const [
    totalUsers,
    totalSalons,
    activeSalons,
    totalAppointments,
    todayAppointments,
    pendingVerifications,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.salon.count(),
    prisma.salon.count({ where: { isActive: true, verificationStatus: 'VERIFIED' } }),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: {
        slotTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.salon.count({ where: { verificationStatus: 'PENDING' } }),
  ]);

  const todayRevenue = await prisma.appointment.aggregate({
    where: {
      status: 'COMPLETED',
      slotTime: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    },
    _sum: { totalPrice: true },
  });

  return res.json({
    success: true,
    data: {
      totalUsers,
      totalSalons,
      activeSalons,
      totalAppointments,
      todayAppointments,
      pendingVerifications,
      todayRevenue: todayRevenue._sum.totalPrice || 0,
    },
  });
});

// Verify salon
adminRouter.patch('/salons/:salonId/verify', async (req: Request, res: Response) => {
  try {
    const salon = await prisma.salon.update({
      where: { id: req.params.salonId },
      data: {
        verificationStatus: req.body.status || 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
    return res.json({ success: true, data: salon });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// List salons with filters
adminRouter.get('/salons', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = 20;

  const [salons, total] = await Promise.all([
    prisma.salon.findMany({
      where: req.query.status
        ? { verificationStatus: req.query.status as any }
        : {},
      include: {
        _count: { select: { barbers: true } },
        barbers: {
          select: {
            availability: { select: { status: true } },
            _count: { select: { appointments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salon.count(),
  ]);

  return res.json({
    success: true,
    data: { items: salons, total, page, pageSize, hasMore: page * pageSize < total },
  });
});

// List users
adminRouter.get('/users', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      include: { _count: { select: { appointments: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
  ]);

  return res.json({ success: true, data: { items: users, total, page } });
});

// Moderate review
adminRouter.patch('/reviews/:reviewId', async (req: Request, res: Response) => {
  const review = await prisma.review.update({
    where: { id: req.params.reviewId },
    data: { isPublished: req.body.isPublished },
  });
  return res.json({ success: true, data: review });
});
