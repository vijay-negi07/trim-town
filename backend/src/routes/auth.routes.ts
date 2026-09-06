import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { sendOtp, verifyOtp, refreshTokens, logout } from '../services/auth.service';
import { authenticate } from '../middleware/auth';

const router = Router();

// ─── SEND OTP ─────────────────────────────────────────────────────────────────

router.post(
  '/otp/send',
  [body('phone').matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid phone number')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const result = await sendOtp(req.body.phone);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(429).json({ success: false, error: err.message });
    }
  }
);

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────

router.post(
  '/otp/verify',
  [
    body('phone').matches(/^\+?[1-9]\d{9,14}$/),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
    body('name').optional().isLength({ min: 2, max: 50 }),
    body('role').optional().isIn(['CUSTOMER', 'BARBER', 'ADMIN']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const { phone, otp, name, role } = req.body;
      const auth = await verifyOtp(phone, otp, name, role);
      return res.json({ success: true, data: auth });
    } catch (err: any) {
      return res.status(401).json({ success: false, error: err.message });
    }
  }
);

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────

router.post('/token/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token required' });
  }

  try {
    const auth = await refreshTokens(refreshToken);
    return res.json({ success: true, data: auth });
  } catch (err: any) {
    return res.status(401).json({ success: false, error: err.message });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  await logout(req.user!.userId);
  return res.json({ success: true, message: 'Logged out' });
});

// ─── ME ───────────────────────────────────────────────────────────────────────

router.get('/me', authenticate, (req: Request, res: Response) => {
  return res.json({ success: true, data: req.user });
});

export default router;
